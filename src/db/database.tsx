/**
 * database.ts — inicialización de SQLite, DbProvider y useDatabase hook.
 *
 * Uso en App.tsx:
 *   <DbProvider>
 *     <RootNavigator />
 *   </DbProvider>
 *
 * Uso en cualquier componente:
 *   const db = useDatabase();
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import * as SQLite from 'expo-sqlite';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import { SCHEMA_SQL } from './schema';
import { seedIfEmpty } from './seed';
import { migrarTransaccionesSinCategoriaATransferencias } from './repositories/categorias';
import { FontSize, type ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

// ─── Tipo del contexto ───────────────────────────────────────────────────────

type DB = SQLite.SQLiteDatabase;

const DbContext = createContext<DB | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function DbProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const [db, setDb]       = useState<DB | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const database = await SQLite.openDatabaseAsync('app_finanzas.db');
        
        // Crear tablas si no existen
        await database.execAsync(SCHEMA_SQL);

        // Migraciones dinámicas para bases de datos existentes
        try {
          await database.execAsync(`ALTER TABLE presupuesto_categoria ADD COLUMN monto_asignado REAL NOT NULL DEFAULT 0;`);
        } catch (e: any) {
          if (!e?.message?.includes('duplicate column name')) {
            console.warn('[DB] Migración monto_asignado falló:', e);
          }
        }

        try {
          await database.execAsync(`ALTER TABLE transacciones ADD COLUMN foto_uri TEXT;`);
        } catch (e: any) {
          // Ignorar si la columna ya existe
          if (!e?.message?.includes('duplicate column name')) {
            console.warn('[DB] Migración foto_uri falló:', e);
          }
        }
        
        try {
          await database.execAsync(`ALTER TABLE transacciones ADD COLUMN metodo_pago TEXT NOT NULL DEFAULT 'virtual';`);
        } catch (e: any) {
          // Ignorar si la columna ya existe
          if (!e?.message?.includes('duplicate column name')) {
            console.warn('[DB] Migración metodo_pago falló:', e);
          }
        }

        try {
          await database.execAsync(`
            CREATE TABLE IF NOT EXISTS presupuesto_concepto (
              id_local              TEXT PRIMARY KEY,
              id_remoto             TEXT,
              espacio_id            TEXT NOT NULL REFERENCES espacios(id_local) ON DELETE CASCADE,
              mes                   TEXT NOT NULL,
              categoria_egreso_id   TEXT NOT NULL REFERENCES categorias_egreso(id_local) ON DELETE CASCADE,
              concepto_detalle_id   TEXT NOT NULL REFERENCES conceptos_detalle(id_local) ON DELETE CASCADE,
              monto_asignado        REAL NOT NULL DEFAULT 0,
              estado_sync           TEXT NOT NULL DEFAULT 'pendiente',
              fecha_modificacion    TEXT NOT NULL,
              eliminado             INTEGER NOT NULL DEFAULT 0,
              UNIQUE (espacio_id, mes, concepto_detalle_id)
            );
            CREATE INDEX IF NOT EXISTS idx_presup_concepto_mes ON presupuesto_concepto (espacio_id, mes, categoria_egreso_id);
          `);
        } catch (e: any) {
          console.warn('[DB] Migración presupuesto_concepto falló:', e);
        }

        // Sembrar catálogo inicial si la DB está vacía
        await seedIfEmpty(database);

        // Migración: asegurar categoría Transferencias y mover transacciones sin categoría
        try {
          await migrarTransaccionesSinCategoriaATransferencias(database);
        } catch (migErr) {
          console.warn('[DB] Error ejecutando migración de transferencias:', migErr);
        }

        setDb(database);
      } catch (e: any) {
        console.error('[DB] Error inicializando SQLite:', e);
        setError(e?.message ?? 'Error desconocido');
      }
    })();
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ Error de base de datos</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Iniciando…</Text>
      </View>
    );
  }

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDatabase(): DB {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDatabase() debe usarse dentro de <DbProvider>');
  return db;
}

// ─── Estilos splash mínimo ───────────────────────────────────────────────────

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 8,
  },
  errorText: {
    color: colors.expense,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  errorSub: {
    color: colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
