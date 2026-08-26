import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, type ThemeColors } from '../constants/theme';

export type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeType;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (t: ThemeType) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  colors: LightColors,
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to light mode as requested by user
  const [theme, setThemeState] = useState<ThemeType>('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('@app_theme');
        if (storedTheme === 'dark' || storedTheme === 'light') {
          setThemeState(storedTheme);
        }
      } catch (e) {
        console.error('Error loading theme', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setTheme = async (t: ThemeType) => {
    setThemeState(t);
    try {
      await AsyncStorage.setItem('@app_theme', t);
    } catch (e) {
      console.error('Error saving theme', e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const isDark = theme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  if (loading) return null;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
