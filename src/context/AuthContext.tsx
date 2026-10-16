import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

const PERSISTED_SESSION_KEY = '@app_persisted_session';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isOffline: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  session: null,
  user: null,
  loading: true,
  isOffline: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Inicializar sesión (primero caché local offline, luego Supabase)
    const initAuth = async () => {
      let cachedSession: Session | null = null;
      try {
        const stored = await AsyncStorage.getItem(PERSISTED_SESSION_KEY);
        if (stored) {
          cachedSession = JSON.parse(stored);
          if (isMounted && cachedSession) {
            setSession(cachedSession);
            setLoading(false); // Acceso inmediato para que no se congele sin internet
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Error leyendo sesión guardada:', e);
      }

      // Intentar obtener sesión fresca de Supabase con timeout de 3.5 segundos
      try {
        const timeoutPromise = new Promise<{ data: { session: Session | null }; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 3500)
        );

        const { data } = await Promise.race([supabase.auth.getSession(), timeoutPromise]);
        
        if (isMounted) {
          if (data?.session) {
            setSession(data.session);
            setIsOffline(false);
            await AsyncStorage.setItem(PERSISTED_SESSION_KEY, JSON.stringify(data.session));
          } else if (!cachedSession) {
            // Solo si no teníamos sesión en caché, declaramos sesión nula
            setSession(null);
          }
        }
      } catch (err: any) {
        console.log('[AuthContext] Modo sin conexión activo al iniciar:', err?.message);
        if (isMounted) {
          setIsOffline(true);
          // Si había sesión en caché, la conservamos para que el usuario pueda usar la app offline
          if (cachedSession) {
            setSession(cachedSession);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // 2. Escuchar cambios de autenticación emitidos por Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          await AsyncStorage.removeItem(PERSISTED_SESSION_KEY);
        } else if (currentSession) {
          setSession(currentSession);
          setIsOffline(false);
          await AsyncStorage.setItem(PERSISTED_SESSION_KEY, JSON.stringify(currentSession));
        }
        setLoading(false);
      }
    );

    // 3. Escuchar reconexión a internet para refrescar la sesión en background
    const netUnsubscribe = NetInfo.addEventListener(async (state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      if (isMounted) setIsOffline(!online);

      if (online) {
        try {
          const { data } = await supabase.auth.getSession();
          if (isMounted && data?.session) {
            setSession(data.session);
            await AsyncStorage.setItem(PERSISTED_SESSION_KEY, JSON.stringify(data.session));
          }
        } catch (e) {
          // Fallo silencioso si la red es inestable
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      netUnsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[AuthContext] Error cerrando sesión en Supabase:', e);
    }
    await AsyncStorage.removeItem(PERSISTED_SESSION_KEY);
    setSession(null);
  };

  const value = {
    session,
    user: session?.user || null,
    loading,
    isOffline,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
