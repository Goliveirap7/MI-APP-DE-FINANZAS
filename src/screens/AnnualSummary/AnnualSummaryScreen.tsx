/**
 * AnnualSummaryScreen — Resumen anual (RF-08)
 *
 * Muestra el total de ingresos vs egresos del año, con un balance neto
 * y una lista (gráfico de barras horizontales) por cada mes.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import YearSelector from '../../components/ui/YearSelector';
import Card from '../../components/ui/Card';
import { useResumenAnual } from '../../hooks/useResumenAnual';
import { useTheme } from '../../context/ThemeContext';

const MESES_NOMBRES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function AnnualSummaryScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const { meses, totalIngresos, totalEgresos, balance, loading } = useResumenAnual(year);

  // Encontrar el máximo absoluto para escalar las barras proporcionalmente
  const maxMonto = Math.max(
    1, // evitar división por 0
    ...meses.map(m => Math.max(m.ingresos, m.egresos))
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>📅 Resumen Anual</Text>

        <YearSelector year={year} onChange={setYear} />

        {/* ── Hero: Balance Anual ───────────────── */}
        {!loading && (
          <LinearGradient
            colors={['#1a2035', '#0f172a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroLabel}>Balance Neto</Text>
            <Text style={[
              styles.heroAmount, 
              { color: balance >= 0 ? colors.income : colors.expense }
            ]}>
              {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
            </Text>

            <View style={styles.heroDivider} />

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.statLabel}>Total Ingresos</Text>
                <Text style={[styles.statValue, { color: colors.income }]}>
                  {formatCurrency(totalIngresos)}
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.statLabel}>Total Egresos</Text>
                <Text style={[styles.statValue, { color: colors.expense }]}>
                  {formatCurrency(totalEgresos)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* ── Loading ─────────────────────────────── */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {/* ── Gráfico de barras mensual ───────────── */}
        {!loading && (
          <Card>
            <Text style={styles.chartTitle}>Flujo por mes</Text>
            
            {meses.map((mesData, index) => {
              const nombreMes = MESES_NOMBRES[index];
              const pctIngresos = (mesData.ingresos / maxMonto) * 100;
              const pctEgresos = (mesData.egresos / maxMonto) * 100;
              const hasData = mesData.ingresos > 0 || mesData.egresos > 0;

              return (
                <View key={mesData.mes} style={styles.monthRow}>
                  <View style={styles.monthNameBox}>
                    <Text style={[styles.monthName, !hasData && { color: colors.textMuted }]}>
                      {nombreMes}
                    </Text>
                  </View>
                  
                  <View style={styles.barsContainer}>
                    {/* Barra de Ingresos */}
                    <View style={styles.barWrapper}>
                      <View 
                        style={[
                          styles.bar, 
                          styles.barIngreso, 
                          { width: `${pctIngresos}%` }
                        ]} 
                      />
                    </View>
                    
                    {/* Barra de Egresos */}
                    <View style={styles.barWrapper}>
                      <View 
                        style={[
                          styles.bar, 
                          styles.barEgreso, 
                          { width: `${pctEgresos}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Leyenda */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
                <Text style={styles.legendText}>Ingresos</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
                <Text style={styles.legendText}>Egresos</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  scroll:  { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  pageTitle: { color: colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
  loadingRow: { alignItems: 'center', paddingVertical: Spacing.lg },

  // Hero
  heroCard:   { borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  heroLabel:  { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.xs },
  heroAmount: { fontSize: FontSize.hero, fontWeight: FontWeight.bold, letterSpacing: -1 },
  heroDivider:{ width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: Spacing.md },
  heroStatsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  heroStat:   { alignItems: 'center', gap: 4 },
  statLabel:  { color: colors.textSecondary, fontSize: FontSize.xs },
  statValue:  { fontSize: FontSize.md, fontWeight: FontWeight.bold },

  // Gráfico
  chartTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
  monthRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  monthNameBox: { width: 40 },
  monthName:  { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  barsContainer: { flex: 1, gap: 4, paddingLeft: Spacing.sm, borderLeftWidth: 1, borderLeftColor: colors.borderLight },
  barWrapper: { height: 8, backgroundColor: 'transparent', width: '100%' },
  bar:        { height: '100%', borderRadius: Radius.sm },
  barIngreso: { backgroundColor: colors.income },
  barEgreso:  { backgroundColor: colors.expense },

  // Leyenda
  legendRow:  { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textSecondary, fontSize: FontSize.xs },
});
