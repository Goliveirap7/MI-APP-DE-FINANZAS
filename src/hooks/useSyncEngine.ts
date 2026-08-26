/**
 * useSyncEngine.ts — Hook para iniciar y controlar la sincronización.
 * Se suscribe a cambios de red y dispara el motor.
 */
import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDatabase } from '../db/database';
import { SyncEngine } from '../db/sync/SyncEngine';
import { useAuth } from '../context/AuthContext';

export function useSyncEngine() {
  const db = useDatabase();
  const { session } = useAuth();
  
  // Guardamos la instancia en un ref para no recrearla
  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    // Si no hay sesión, no intentamos sincronizar
    if (!session) return;

    if (!engineRef.current) {
      engineRef.current = new SyncEngine(db);
    }

    // 1. Intentar sincronizar apenas arranca (si hay conexión)
    engineRef.current.processQueue();

    // 2. Suscribirse a cambios de red. Si vuelve la red, intentar sincronizar.
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        engineRef.current?.processQueue();
      }
    });

    // 3. (Opcional) Polling cada X minutos como respaldo
    const intervalId = setInterval(() => {
      engineRef.current?.processQueue();
    }, 5 * 60 * 1000); // Cada 5 minutos

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [db, session]);

  // Exponemos un método manual por si queremos forzar la sync desde la UI (ej. Pull to refresh)
  const triggerSync = async () => {
    if (session && engineRef.current) {
      await engineRef.current.processQueue();
    }
  };

  return { triggerSync };
}
