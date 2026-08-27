import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useStreak } from '../../hooks/useStreak';
import { Radius, Spacing, FontSize, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function StreakScreen() {
  const navigation = useNavigation<any>();
  const { streak, maxStreak, streakStarted, activityHistory } = useStreak();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // Fecha formateada
  const formattedStartDate = useMemo(() => {
    if (!streakStarted) return 'Today';
    const date = new Date(streakStarted + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  const progressPercent = (streak / nextMilestone) * 100;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DAY STREAK</Text>
          <TouchableOpacity style={styles.infoBtn}>
            <Text style={styles.infoText}>i</Text>
          </TouchableOpacity>
        </View>

        {/* HERO SECTION */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(255, 170, 0, 0.4)', 'transparent']}
            style={styles.heroAura}
            start={{ x: 0.5, y: 0.2 }}
            end={{ x: 0.5, y: 0.8 }}
          />
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakSubtitle}>DAY STREAK</Text>
        </View>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{formattedStartDate}</Text>
            <Text style={styles.statLabel}>Streak started</Text>
          </View>
          <View style={[styles.statCol, styles.statColCenter]}>
            <Text style={styles.statValue}>Top 1%</Text>
            <Text style={styles.statLabel}>DEDICATION</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{maxStreak}</Text>
            <Text style={styles.statLabel}>Max streak</Text>
          </View>
        </View>

        {/* THIS WEEK */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>THIS WEEK</Text>
          <View style={styles.weekContainer}>
            {weeklyStatus.map((d, i) => (
              <View key={i} style={styles.dayCol}>
                <Text style={styles.dayName}>{d.dayName}</Text>
                <View style={[
                  styles.dayCircle,
                  d.isActive && styles.dayCircleActive,
                  d.isFuture && styles.dayCircleFuture
                ]}>
                  {d.isActive && <Text style={styles.dayFire}>🔥</Text>}
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
              <Text style={styles.progressText}>{daysToMilestone} more days</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressSubtext}>to unlock your next milestone.</Text>
            </View>

            <View style={[styles.milestoneIconBox, styles.milestoneIconBoxFuture]}>
              <Text style={[styles.milestoneIcon, { opacity: 0.3 }]}>🔥</Text>
              <Text style={styles.milestoneValue}>{nextMilestone}</Text>
            </View>
          </View>
        </View>

        {/* DEDICATION */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legacy-level dedication</Text>
          <Text style={styles.dedicationText}>
            Tu racha demuestra que eres una de las personas más dedicadas con sus finanzas. Mantener el hábito de registrar tus gastos te da una visión clara de tu salud financiera. ¡Sigue así!
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backBtn: { padding: 10 },
  backText: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: 'bold', letterSpacing: 2 },
  infoBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  infoText: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
    height: 240,
    justifyContent: 'center',
  },
  heroAura: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -20,
  },
  fireEmoji: {
    fontSize: 100,
    textShadowColor: 'rgba(255, 170, 0, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    marginBottom: 10,
  },
  streakNumber: { color: colors.textPrimary, fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  streakSubtitle: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: 'bold', letterSpacing: 2 },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statCol: { alignItems: 'center', flex: 1 },
  statColCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statValue: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.md },
  
  weekContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center' },
  dayName: { color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', marginBottom: 8 },
  dayCircle: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: colors.border, 
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayCircleActive: { borderColor: 'rgba(255, 170, 0, 0.5)', borderStyle: 'solid', backgroundColor: 'rgba(255, 170, 0, 0.1)' },
  dayCircleFuture: { opacity: 0.3 },
  dayFire: { fontSize: 14 },

  milestoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  milestoneIconBox: { alignItems: 'center' },
  milestoneIconBoxFuture: { opacity: 0.5 },
  milestoneIcon: { fontSize: 32, marginBottom: 4 },
  milestoneValue: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  
  progressContainer: { flex: 1, paddingHorizontal: Spacing.md, alignItems: 'center' },
  progressText: { color: colors.textPrimary, fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  progressBarBg: { width: '100%', height: 4, backgroundColor: colors.bgInput, borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#ff9800', borderRadius: 2 },
  progressSubtext: { color: colors.textSecondary, fontSize: 11 },

  dedicationText: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
});
