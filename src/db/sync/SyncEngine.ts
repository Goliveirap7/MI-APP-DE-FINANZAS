/**
 * SyncEngine.ts — Motor de sincronización Offline-First (RF-22)
 *
 * Lee la tabla `sync_queue`, obtiene los datos locales, y los sube a Supabase.
 * Maneja los reintentos y marca conflictos en caso de fallas graves.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { supabase } from '../../lib/supabase';
import NetInfo from '@react-native-community/netinfo';

interface SyncQueueItem {
  id: number;
  tabla: string;
  operacion: 'insert' | 'update' | 'delete';
  id_registro: string;
  fecha_encolado: string;
  intentos: number;
}

export class SyncEngine {
  private db: SQLiteDatabase;
  private isSyncing: boolean = false;
  private MAX_INTENTOS = 5;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Intenta procesar toda la cola. Si ya está corriendo o no hay internet, sale silenciosamente.
   */
  async processQueue() {
    if (this.isSyncing) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) {
      return; // No hay internet
    }

    this.isSyncing = true;

    try {
      // 1. Obtener cola pendiente
      const cola = await this.db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue ORDER BY id ASC LIMIT 50`
      );

      for (const item of cola) {
        if (item.intentos >= this.MAX_INTENTOS) {
          await this.markAsConflict(item);
          continue;
        }

        const success = await this.syncItem(item);

        if (success) {
          // Limpiar de la cola
          await this.db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [item.id]);
          
          // Actualizar estado en tabla original (solo insert/update)
          if (item.operacion !== 'delete') {
            await this.db.runAsync(
              `UPDATE ${item.tabla} SET estado_sync = 'sincronizado' WHERE id_local = ?`,
              [item.id_registro]
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
      console.warn('Error en SyncEngine.processQueue:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Procesa un ítem individual contra Supabase.
   * @returns true si tuvo éxito, false si falló y debe reintentarse.
   */
  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    try {
      if (item.operacion === 'delete') {
        // Ejecutar delete en Supabase
        const { error } = await supabase
          .from(item.tabla)
          .delete()
          .eq('id_local', item.id_registro);

        if (error) throw error;
        return true;
      } 
      
      // Para insert/update necesitamos los datos completos locales
      const localData = await this.db.getFirstAsync<any>(
        `SELECT * FROM ${item.tabla} WHERE id_local = ?`,
        [item.id_registro]
      );

      if (!localData) {
        // Si el registro local ya no existe, damos por terminada esta sync.
        return true; 
      }

      // Limpiar campos que no deben ir a la nube o son exclusivos de SQLite
      const payload = { ...localData };
      delete payload.estado_sync;
      
      // Enviar a Supabase con Upsert (funciona para insert y update basado en PK id_local)
      const { error } = await supabase
        .from(item.tabla)
        .upsert(payload, { onConflict: 'id_local' });

      if (error) {
        console.warn(`Error sincronizando ${item.tabla} (${item.id_registro}):`, error.message);
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
        if (item.operacion !== 'delete') {
          await this.db.runAsync(
            `UPDATE ${item.tabla} SET estado_sync = 'conflicto' WHERE id_local = ?`,
            [item.id_registro]
          );
        }
        await this.db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [item.id]);
      });
      console.log(`[SyncEngine] Conflicto marcado para ${item.tabla} - ${item.id_registro}`);
    } catch (e) {
      console.error('Error marcando conflicto:', e);
    }
  }
}
