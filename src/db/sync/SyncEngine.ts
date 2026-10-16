/**
 * SyncEngine.ts — Motor de sincronización Offline-First (RF-22)
 *
 * Lee la tabla `sync_queue`, obtiene los datos locales, y los sube a Supabase.
 * Maneja los reintentos y marca conflictos en caso de fallas graves.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { supabase } from '../../lib/supabase';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncQueueItem {
  id: string;
  tabla: string;
  id_local: string;
  tipo_operacion: 'crear' | 'editar' | 'eliminar';
  datos: string;
  intentos: number;
  creado_en: string;
}

export class SyncEngine {
  private db: SQLiteDatabase;
  private isSyncing: boolean = false;
  private MAX_INTENTOS = 5;
  
  public onProgress?: (progress: number) => void;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  private async getUserId(): Promise<string | null> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        return sessionData.session.user.id;
      }
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        return authData.user.id;
      }
      const stored = await AsyncStorage.getItem('@app_persisted_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user?.id) return parsed.user.id;
      }
    } catch (e) {
      // Ignorar error al resolver usuario
    }
    return null;
  }

  /**
   * Intenta procesar toda la cola. Si ya está corriendo o no hay internet, sale silenciosamente.
   */
  async processQueue() {
    this.onProgress?.(0.1);
    await this.pushToCloud();
    this.onProgress?.(0.5);
    await this.pullFromCloud();
    this.onProgress?.(1.0);
    setTimeout(() => this.onProgress?.(0), 1500);
  }

  async pushToCloud() {
    if (this.isSyncing) return;

    const netState = await NetInfo.fetch();
    const isOnline = !!netState.isConnected && netState.isInternetReachable !== false;
    if (!isOnline) {
      return; // No hay internet
    }

    this.isSyncing = true;

    try {
      const userId = await this.getUserId();

      // 0. Sincronizar datos semilla pendientes (espacios, categorías, deudas) para evitar errores de Foreign Key
      await this.syncPendingSeeds(userId);

      // 1. Obtener cola pendiente
      const cola = await this.db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue ORDER BY id ASC LIMIT 50`
      );

      for (const item of cola) {
        if (item.intentos >= this.MAX_INTENTOS) {
          await this.markAsConflict(item);
          continue;
        }

        const success = await this.syncItem(item, userId);

        if (success) {
          // Limpiar de la cola
          await this.db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [item.id]);
          
          // Actualizar estado en tabla original (solo insert/update)
          if (item.tipo_operacion !== 'eliminar') {
            await this.db.runAsync(
              `UPDATE ${item.tabla} SET estado_sync = 'sincronizado' WHERE id_local = ?`,
              [item.id_local]
            );
          }
        } else {
          // Aumentar intentos
          await this.db.runAsync(
            `UPDATE sync_queue SET intentos = intentos + 1 WHERE id = ?`,
            [item.id]
          );
        }
      }
    } catch (error) {
      console.warn('Error en SyncEngine.pushToCloud:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sube los datos semilla (espacios, categorías) que se crearon localmente pero nunca pasaron por sync_queue.
   * Esto previene errores de "violates foreign key constraint".
   */
  private async syncPendingSeeds(passedUserId?: string | null) {
    const seedTables = [
      'espacios', 
      'categorias_ingreso', 
      'categorias_egreso', 
      'conceptos_detalle',
      'presupuesto_categoria',
      'activos_inversion',
      'transacciones',
      'deudas'
    ];

    const userId = passedUserId || (await this.getUserId());
    
    for (const table of seedTables) {
      try {
        const pendingRows = await this.db.getAllAsync<any>(
          `SELECT * FROM ${table} WHERE estado_sync = 'pendiente'`
        );
        
        if (pendingRows && pendingRows.length > 0) {
          console.log(`[SyncEngine] Subiendo ${pendingRows.length} registros semilla pendientes de ${table}...`);
          for (const row of pendingRows) {
            const payload = { ...row };
            delete payload.estado_sync;
            if (userId) {
              payload.user_id = userId;
            }
            delete payload.estado_sync;
            
            const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id_local' });
            if (!error) {
              await this.db.runAsync(
                `UPDATE ${table} SET estado_sync = 'sincronizado' WHERE id_local = ?`,
                [row.id_local]
              );
            } else {
              console.warn(`[SyncEngine] Error subiendo semilla de ${table}:`, error.message);
            }
          }
        }
      } catch (e) {
        console.warn(`[SyncEngine] Error en syncPendingSeeds para ${table}:`, e);
      }
    }
  }

  /**
   * Descarga todos los datos desde Supabase (Pull)
   * Útil para cuando el usuario instala el APK por primera vez o cambia de celular.
   */
  async pullFromCloud() {
    console.log('[SyncEngine] Iniciando Pull desde Supabase...');
    const netState = await NetInfo.fetch();
    const isOnline = !!netState.isConnected && netState.isInternetReachable !== false;
    if (!isOnline) {
      console.log('[SyncEngine] No hay internet para hacer Pull.');
      return;
    }

    // Tablas a descargar en orden (respetando Foreign Keys)
    const tables = [
      'espacios',
      'categorias_ingreso',
      'categorias_egreso',
      'conceptos_detalle',
      'presupuesto_categoria',
      'transacciones',
      'deudas',
      'activos_inversion'
    ];

    try {
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        
        // Reportar progreso en pullFromCloud (50% a 100%) si es llamado desde processQueue
        this.onProgress?.(0.5 + ((i / tables.length) * 0.5));

        // Descargar todos los registros paginando en bloques de 1000 (Supabase limita por defecto a 1000 por query)
        const PAGE_SIZE = 1000;
        let from = 0;
        let allData: any[] = [];
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(from, from + PAGE_SIZE - 1);

          if (error) {
            console.warn(`[SyncEngine] Error haciendo pull de ${table} (offset ${from}):`, error.message);
            break;
          }

          if (data && data.length > 0) {
            allData = allData.concat(data);
            if (data.length < PAGE_SIZE) {
              hasMore = false;
            } else {
              from += PAGE_SIZE;
            }
          } else {
            hasMore = false;
          }
        }

        if (allData.length > 0) {
          // Obtener columnas válidas de la tabla en SQLite para no fallar si Supabase tiene columnas extras
          const tableInfo = await this.db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
          const validColumns = new Set(tableInfo.map(c => c.name));

          await this.db.withTransactionAsync(async () => {
            for (const row of allData) {
              const sanitizedRow: Record<string, any> = {};
              for (const [key, val] of Object.entries(row)) {
                if (key !== 'user_id' && validColumns.has(key)) {
                  sanitizedRow[key] = val;
                }
              }
              sanitizedRow.estado_sync = 'sincronizado';

              const columns = Object.keys(sanitizedRow);
              const values = Object.values(sanitizedRow);
              
              const placeholders = columns.map(() => '?').join(', ');
              const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

              const query = `
                INSERT INTO ${table} (${columns.join(', ')})
                VALUES (${placeholders})
                ON CONFLICT(id_local) DO UPDATE SET
                ${updateSet};
              `;

              try {
                await this.db.runAsync(query, values);
              } catch (err) {
                console.warn(`[SyncEngine] Error guardando fila de ${table}:`, err);
              }
            }
          });
          console.log(`[SyncEngine] Pull de ${table}: ${allData.length} registros guardados.`);
        }
      }
      console.log('[SyncEngine] Pull completado con éxito.');
    } catch (e) {
      console.error('[SyncEngine] Error general en pullFromCloud:', e);
    }
  }

  /**
   * Procesa un ítem individual contra Supabase.
   * @returns true si tuvo éxito, false si falló y debe reintentarse.
   */
  private async syncItem(item: SyncQueueItem, passedUserId?: string | null): Promise<boolean> {
    try {
      if (item.tipo_operacion === 'eliminar') {
        const { error } = await supabase
          .from(item.tabla)
          .delete()
          .eq('id_local', item.id_local);

        if (error) throw error;
        return true;
      } 
      
      // Para insert/update necesitamos los datos completos locales
      const localData = await this.db.getFirstAsync<any>(
        `SELECT * FROM ${item.tabla} WHERE id_local = ?`,
        [item.id_local]
      );

      if (!localData) {
        return true; 
      }

      // Limpiar campos que no deben ir a la nube o son exclusivos de SQLite
      const payload = { ...localData };
      delete payload.estado_sync;
      
      const userId = passedUserId || (await this.getUserId());
      if (userId) {
        payload.user_id = userId;
      }
      
      // Enviar a Supabase con Upsert (funciona para insert y update basado en PK id_local)
      const { error } = await supabase
        .from(item.tabla)
        .upsert(payload, { onConflict: 'id_local' });

      if (error) {
        console.warn(`Error sincronizando ${item.tabla} (${item.id_local}):`, error.message);
        return false;
      }

      return true;
    } catch (e) {
      console.warn(`Exception sincronizando item ${item.id}:`, e);
      return false;
    }
  }

  /**
   * Si excede los intentos, lo marcamos como conflicto para avisar al usuario (RF-22)
   */
  private async markAsConflict(item: SyncQueueItem) {
    try {
      await this.db.withTransactionAsync(async () => {
        if (item.tipo_operacion !== 'eliminar') {
          await this.db.runAsync(
            `UPDATE ${item.tabla} SET estado_sync = 'conflicto' WHERE id_local = ?`,
            [item.id_local]
          );
        }
        await this.db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [item.id]);
      });
      console.log(`[SyncEngine] Conflicto marcado para ${item.tabla} - ${item.id_local}`);
    } catch (e) {
      console.error('Error marcando conflicto:', e);
    }
  }
}
