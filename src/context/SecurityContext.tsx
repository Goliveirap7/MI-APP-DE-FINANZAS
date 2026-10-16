import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import LocalLockScreen from '../screens/LocalLockScreen';
import { useTheme } from './ThemeContext';

interface SecurityContextData {
  isBiometricEnabled: boolean;
  toggleBiometric: (enabled: boolean) => Promise<boolean>;
  authenticate: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextData>({} as any);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSecurity();
  }, []);

  const checkSecurity = async () => {
    try {
      const enabled = await AsyncStorage.getItem('biometric_enabled');
      if (enabled === 'true') {
        setIsBiometricEnabled(true);
        const lastUnlock = await AsyncStorage.getItem('last_unlock_date');
        const today = new Date().toISOString().split('T')[0];
        
        if (lastUnlock === today) {
          setIsUnlocked(true);
        } else {
          setIsUnlocked(false);
        }
      } else {
        setIsUnlocked(true);
      }
    } catch (e) {
      setIsUnlocked(true);
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        setIsUnlocked(true);
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear Aphelios',
        fallbackLabel: 'Usar PIN o Patrón',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem('last_unlock_date', today);
        setIsUnlocked(true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const toggleBiometric = async (enabled: boolean) => {
    if (enabled) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return false;

      // Pedir huella para confirmar que son ellos
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Activar Bloqueo Biométrico',
        fallbackLabel: 'Usar PIN o Patrón',
      });
      if (!result.success) return false;
    }
    
    await AsyncStorage.setItem('biometric_enabled', enabled ? 'true' : 'false');
    setIsBiometricEnabled(enabled);
    if (!enabled) setIsUnlocked(true);
    return true;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isBiometricEnabled && !isUnlocked) {
    return <LocalLockScreen onAuthenticate={authenticate} />;
  }

  return (
    <SecurityContext.Provider value={{ isBiometricEnabled, toggleBiometric, authenticate }}>
      {children}
    </SecurityContext.Provider>
  );
}

export const useSecurity = () => useContext(SecurityContext);
