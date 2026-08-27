import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = '@app_streak';
const LAST_LOGIN_KEY = '@app_last_login';
const MAX_STREAK_KEY = '@app_max_streak';
const STREAK_STARTED_KEY = '@app_streak_started';
const ACTIVITY_HISTORY_KEY = '@app_activity_history';

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [streakStarted, setStreakStarted] = useState<string | null>(null);
  const [activityHistory, setActivityHistory] = useState<string[]>([]);

  useEffect(() => {
    updateStreak();
  }, []);

  const updateStreak = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = await AsyncStorage.getItem(LAST_LOGIN_KEY);
      const currentStreakStr = await AsyncStorage.getItem(STREAK_KEY);
      const maxStreakStr = await AsyncStorage.getItem(MAX_STREAK_KEY);
      const startedStr = await AsyncStorage.getItem(STREAK_STARTED_KEY);
      const historyStr = await AsyncStorage.getItem(ACTIVITY_HISTORY_KEY);
      
      let currentStreak = parseInt(currentStreakStr || '0', 10);
      let currentMaxStreak = parseInt(maxStreakStr || '0', 10);
      let currentStarted = startedStr || today;
      let history = historyStr ? JSON.parse(historyStr) : [];

      if (!lastLogin) {
        // Primera vez
        currentStreak = 1;
        currentStarted = today;
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
          currentStarted = today; // Reinicia la fecha de inicio
        }
      }

      // Actualizar Max Streak
      if (currentStreak > currentMaxStreak) {
        currentMaxStreak = currentStreak;
      }

      // Agregar hoy al historial si no está
      if (!history.includes(today)) {
        history.push(today);
        // Opcional: limitar el tamaño del historial a los últimos 30-90 días si se desea, 
        // pero para la semana es suficiente tener las fechas.
        // history = history.slice(-90); 
      }

      await AsyncStorage.setItem(LAST_LOGIN_KEY, today);
      await AsyncStorage.setItem(STREAK_KEY, currentStreak.toString());
      await AsyncStorage.setItem(MAX_STREAK_KEY, currentMaxStreak.toString());
      await AsyncStorage.setItem(STREAK_STARTED_KEY, currentStarted);
      await AsyncStorage.setItem(ACTIVITY_HISTORY_KEY, JSON.stringify(history));

      setStreak(currentStreak);
      setMaxStreak(currentMaxStreak);
      setStreakStarted(currentStarted);
      setActivityHistory(history);

    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  return { streak, maxStreak, streakStarted, activityHistory };
}
