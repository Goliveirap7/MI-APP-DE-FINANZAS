import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = '@app_streak';
const LAST_LOGIN_KEY = '@app_last_login';

export function useStreak() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    updateStreak();
  }, []);

  const updateStreak = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = await AsyncStorage.getItem(LAST_LOGIN_KEY);
      const currentStreakStr = await AsyncStorage.getItem(STREAK_KEY);
      let currentStreak = parseInt(currentStreakStr || '0', 10);

      if (!lastLogin) {
        // Primera vez
        currentStreak = 1;
        await AsyncStorage.setItem(LAST_LOGIN_KEY, today);
        await AsyncStorage.setItem(STREAK_KEY, currentStreak.toString());
      } else if (lastLogin !== today) {
        // Revisar si fue ayer
        const lastLoginDate = new Date(lastLogin);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate.getTime() - lastLoginDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Fue ayer, mantener racha
          currentStreak += 1;
        } else if (diffDays > 1) {
          // Pasó más de un día, reiniciar racha
          currentStreak = 1;
        }

        await AsyncStorage.setItem(LAST_LOGIN_KEY, today);
        await AsyncStorage.setItem(STREAK_KEY, currentStreak.toString());
      }

      setStreak(currentStreak);
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  return { streak };
}
