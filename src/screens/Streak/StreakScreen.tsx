import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { triggerSoftTap } from '../../utils/haptics';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useStreak } from '../../hooks/useStreak';
import { Radius, Spacing, FontSize, FontWeight, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const DAYS_OF_WEEK = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export default function StreakScreen() {
  const navigation = useNavigation<any>();
  const { streak, maxStreak, streakStarted, activityHistory } = useStreak();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Fecha formateada en español
  const formattedStartDate = useMemo(() => {
    if (!streakStarted) return 'Hoy';
    const [y, m, d] = streakStarted.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }, [streakStarted]);

  // Días de esta semana
  const weeklyStatus = useMemo(() => {
    const today = new Date();
    // Ajustar para que Lunes sea 0 y Domingo 6
    const dayOfWeek = (today.getDay() + 6) % 7; 
    
    // Obtener el Lunes de esta semana
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    return DAYS_OF_WEEK.map((dayName, index) => {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + index);
      const isoDate = currentDay.toISOString().split('T')[0];
      const isActive = activityHistory.includes(isoDate);
      const isFuture = currentDay > today;
      return { dayName, isActive, isFuture };
    });
  }, [activityHistory]);

  // Próximo hito
  const nextMilestone = useMemo(() => {
    const milestones = [3, 7, 14, 30, 50, 100, 365, 500, 1000];
    for (let m of milestones) {
      if (streak < m) return m;
    }
    return streak + 100;
  }, [streak]);

  const daysToMilestone = nextMilestone - streak;
  const progressPercent = Math.min((streak / nextMilestone) * 100, 100);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { triggerSoftTap(); navigation.goBack(); }} style={styles.backBtn}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Image 
                source={require('../../../assets/flechas/izquierda.png')} 
                style={{ width: 14, height: 14, tintColor: colors.primary }} 
                resizeMode="contain" 
              />
              <Text style={{ color: colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold }}>Volver</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RACHA DIARIA</Text>
          <TouchableOpacity 
            style={styles.infoBtn}
            onPress={() => {
              triggerSoftTap();
              Alert.alert(
                'Racha de Constancia 🔥',
                'Tu racha aumenta cada día que registras al menos un movimiento financiero. Mantener el hábito te ayuda a no perder el control de tus finanzas.'
              );
            }}
          >
            <Text style={styles.infoText}>i</Text>
          </TouchableOpacity>
        </View>

        {/* HERO CARD */}
        <LinearGradient
          colors={isDark ? ['#1e2538', '#111624'] : ['#ffffff', '#f1f5f9']}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroAura} />
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakSubtitle}>DÍAS CONSECUTIVOS</Text>
        </LinearGradient>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{formattedStartDate}</Text>
            <Text style={styles.statLabel}>Iniciada</Text>
          </View>
          <View style={[styles.statCol, styles.statColCenter]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>Top 1%</Text>
            <Text style={styles.statLabel}>Dedicación</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{maxStreak} {maxStreak === 1 ? 'día' : 'días'}</Text>
            <Text style={styles.statLabel}>Racha máxima</Text>
          </View>
        </View>

        {/* THIS WEEK */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Esta semana</Text>
          <View style={styles.weekContainer}>
            {weeklyStatus.map((d, i) => (
              <View key={i} style={styles.dayCol}>
                <Text style={styles.dayName}>{d.dayName}</Text>
                <View style={[
                  styles.dayCircle,
                  d.isActive && styles.dayCircleActive,
                  d.isFuture && styles.dayCircleFuture
                ]}>
                  {d.isActive ? (
                    <Text style={styles.dayFire}>🔥</Text>
                  ) : (
                    <View style={styles.dayDot} />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* MILESTONE */}
        <View style={styles.card}>
          <View style={styles.milestoneRow}>
            <View style={styles.milestoneIconBox}>
              <Text style={styles.milestoneIcon}>🔥</Text>
              <Text style={styles.milestoneValue}>{streak}</Text>
            </View>
            
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>Faltan {daysToMilestone} {daysToMilestone === 1 ? 'día' : 'días'}</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressSubtext}>para tu próximo hito de {nextMilestone} días</Text>
            </View>

            <View style={[styles.milestoneIconBox, styles.milestoneIconBoxFuture]}>
              <Text style={[styles.milestoneIcon, { opacity: 0.35 }]}>🏆</Text>
              <Text style={styles.milestoneValue}>{nextMilestone}</Text>
            </View>
          </View>
        </View>

        {/* DEDICATION */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Constancia y Salud Financiera</Text>
          <Text style={styles.dedicationText}>
            Tu racha demuestra tu compromiso con tus metas de ahorro. Registrar cada ingreso y gasto te permite ver con total claridad a dónde va tu dinero. ¡Sigue encendiendo tu racha cada día!
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: 1.5 },
  infoBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  infoText: { color: colors.textSecondary, fontSize: 16, fontWeight: FontWeight.bold },
  
  heroCard: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  heroAura: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
    top: -20,
  },
  fireEmoji: {
    fontSize: 80,
    marginBottom: 8,
  },
  streakNumber: { color: colors.textPrimary, fontSize: 56, fontWeight: '900', letterSpacing: -1 },
  streakSubtitle: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 2, marginTop: 4 },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.lg,
  },
  statCol: { alignItems: 'center', flex: 1 },
  statColCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statValue: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 2 },
  statLabel: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: Spacing.md },
  
  weekContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center' },
  dayName: { color: colors.textSecondary, fontSize: 11, fontWeight: FontWeight.semibold, marginBottom: 8 },
  dayCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    borderWidth: 1.5, 
    borderColor: colors.border, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: colors.bgInput,
  },
  dayCircleActive: { 
    borderColor: '#ff9800', 
    backgroundColor: 'rgba(255, 152, 0, 0.15)' 
  },
  dayCircleFuture: { opacity: 0.35 },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  dayFire: { fontSize: 16 },

  milestoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  milestoneIconBox: { alignItems: 'center', width: 44 },
  milestoneIconBoxFuture: { opacity: 0.5 },
  milestoneIcon: { fontSize: 28, marginBottom: 4 },
  milestoneValue: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  
  progressContainer: { flex: 1, paddingHorizontal: Spacing.md, alignItems: 'center' },
  progressText: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 8 },
  progressBarBg: { width: '100%', height: 6, backgroundColor: colors.bgInput, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#ff9800', borderRadius: 3 },
  progressSubtext: { color: colors.textSecondary, fontSize: FontSize.xs, textAlign: 'center' },

  dedicationText: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22 },
});
