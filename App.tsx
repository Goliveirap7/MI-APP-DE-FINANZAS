/**
 * Punto de entrada de la aplicación.
 * DbProvider inicializa SQLite antes de montar el navigator.
 */
import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { DbProvider } from './src/db/database';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { SecurityProvider } from './src/context/SecurityContext';
import AnimatedSplashScreen from './src/components/ui/AnimatedSplashScreen';

export default function App() {
  const [isSplashDone, setIsSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F1117' }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <DbProvider>
              <SecurityProvider>
                <StatusBar style="light" />
                <RootNavigator />
              </SecurityProvider>
            </DbProvider>
          </AuthProvider>
        </ThemeProvider>
        {!isSplashDone && (
          <AnimatedSplashScreen onFinish={() => setIsSplashDone(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
