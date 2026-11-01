/**
 * AnnualSummaryScreen — Resumen anual (RF-08)
 *
 * Muestra el total de ingresos vs egresos del año, con un balance neto
 * y una lista (gráfico de barras horizontales) por cada mes interactiva.
 * Al tocar un mes, muestra el desglose día a día de ese mes.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import YearSelector from '../../components/ui/YearSelector';
import Card from '../../components/ui/Card';
import { useResumenAnual } from '../../hooks/useResumenAnual';
import { useTheme } from '../../context/ThemeContext';
import { useDatabase } from '../../db/database';
import { getDetalleDiarioMes, type DiaReporte } from '../../db/repositories/reportes';
import { triggerSoftTap } from '../../utils/haptics';

const MESES_NOMBRES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_COMPLETOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function AnnualSummaryScreen() {
  const { colors } = useTheme();
  const db = useDatabase();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const { meses, totalIngresos, totalEgresos, balance, loading } = useResumenAnual(year);

  // Estado para el modal de detalle diario de un mes
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedMonthName, setSelectedMonthName] = useState<string>('');
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [dailyData, setDailyData] = useState<DiaReporte[]>([]);
  const [monthTotalIngresos, setMonthTotalIngresos] = useState(0);
  const [monthTotalEgresos, setMonthTotalEgresos] = useState(0);

  // Encontrar el máximo absoluto para escalar las barras proporcionalmente en el año
  const maxMonto = Math.max(
    1, // evitar división por 0
    ...meses.map(m => Math.max(m.ingresos, m.egresos))
  );

  const handleOpenMonthDetail = async (mesISO: string, monthIndex: number) => {
    triggerSoftTap();
    setSelectedMonth(mesISO);
    setSelectedMonthName(`${MESES_COMPLETOS[monthIndex]} ${year}`);
    setLoadingDaily(true);
    try {
      const res = await getDetalleDiarioMes(db, mesISO);
      setDailyData(res.dias);
      setMonthTotalIngresos(res.totalIngresos);
      setMonthTotalEgresos(res.totalEgresos);
    } catch (e) {
      console.warn('[AnnualSummary] Error cargando detalle diario:', e);
    } finally {
      setLoadingDaily(false);
    }
  };

  // Día con mayor gasto y mayor ingreso
  const topGastoDia = useMemo(() => {
    if (dailyData.length === 0) return null;
    const sorted = [...dailyData].filter(d => d.egresos > 0).sort((a, b) => b.egresos - a.egresos);
    return sorted.length > 0 ? sorted[0] : null;
  }, [dailyData]);

  const topIngresoDia = useMemo(() => {
    if (dailyData.length === 0) return null;
    const sorted = [...dailyData].filter(d => d.ingresos > 0).sort((a, b) => b.ingresos - a.ingresos);
    return sorted.length > 0 ? sorted[0] : null;
  }, [dailyData]);

  // Días que tuvieron al menos un movimiento
  const diasConMovimiento = useMemo(() => {
    return dailyData.filter(d => d.ingresos > 0 || d.egresos > 0);
  }, [dailyData]);

  const maxMontoDiario = useMemo(() => {
    return Math.max(1, ...dailyData.map(d => Math.max(d.ingresos, d.egresos)));
  }, [dailyData]);

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
            <Text style={styles.heroLabel}>Balance Neto Operativo</Text>
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

        {/* ── Gráfico de barras mensual interactivo ───────────── */}
        {!loading && (
          <Card>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Flujo por mes</Text>
              <Text style={styles.chartHint}>Toca un mes para ver días 👆</Text>
            </View>
            
            {meses.map((mesData, index) => {
              const nombreMes = MESES_NOMBRES[index];
              const pctIngresos = (mesData.ingresos / maxMonto) * 100;
              const pctEgresos = (mesData.egresos / maxMonto) * 100;
              const hasData = mesData.ingresos > 0 || mesData.egresos > 0;

              return (
                <TouchableOpacity
                  key={mesData.mes}
                  style={styles.monthRowTouchable}
                  activeOpacity={0.7}
                  onPress={() => handleOpenMonthDetail(mesData.mes, index)}
                >
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

                  <Text style={styles.monthArrow}>›</Text>
                </TouchableOpacity>
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

      {/* ── MODAL DETALLE DIARIO DEL MES ── */}
      <Modal
        visible={selectedMonth !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMonth(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Detalle Diario</Text>
                <Text style={styles.modalSub}>{selectedMonthName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  triggerSoftTap();
                  setSelectedMonth(null);
                }}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingDaily ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                {/* Resumen del mes en modal */}
                <View style={styles.monthHeroSummary}>
                  <View style={styles.monthSummaryStat}>
                    <Text style={styles.summarySmallLabel}>Ingresos</Text>
                    <Text style={[styles.summarySmallVal, { color: colors.income }]}>
                      +{formatCurrency(monthTotalIngresos)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.monthSummaryStat}>
                    <Text style={styles.summarySmallLabel}>Egresos</Text>
                    <Text style={[styles.summarySmallVal, { color: colors.expense }]}>
                      −{formatCurrency(monthTotalEgresos)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.monthSummaryStat}>
                    <Text style={styles.summarySmallLabel}>Neto</Text>
                    <Text
                      style={[
                        styles.summarySmallVal,
                        {
                          color:
                            monthTotalIngresos >= monthTotalEgresos
                              ? colors.income
                              : colors.expense,
                        },
                      ]}
                    >
                      {formatCurrency(monthTotalIngresos - monthTotalEgresos)}
                    </Text>
                  </View>
                </View>

                {/* Highlights: Días pico */}
                {(topGastoDia || topIngresoDia) && (
                  <View style={styles.highlightsContainer}>
                    {topGastoDia && (
                      <View style={[styles.highlightCard, { borderColor: colors.expense + '40' }]}>
                        <Text style={styles.highlightEmoji}>🔥</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.highlightTitle}>Mayor día de gastos</Text>
                          <Text style={styles.highlightSub}>
                            Día {topGastoDia.dia}: {formatCurrency(topGastoDia.egresos)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {topIngresoDia && (
                      <View style={[styles.highlightCard, { borderColor: colors.income + '40' }]}>
                        <Text style={styles.highlightEmoji}>💰</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.highlightTitle}>Mayor día de ingresos</Text>
                          <Text style={styles.highlightSub}>
                            Día {topIngresoDia.dia}: +{formatCurrency(topIngresoDia.ingresos)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Desglose día por día */}
                <Text style={styles.dailySectionTitle}>
                  Movimientos por día ({diasConMovimiento.length} días con actividad)
                </Text>

                {diasConMovimiento.length === 0 ? (
                  <View style={styles.emptyDaily}>
                    <Text style={styles.emptyDailyText}>
                      No hubo ingresos ni egresos en este mes.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dailyListContainer}>
                    {diasConMovimiento.map(dia => {
                      const pctIngreso = (dia.ingresos / maxMontoDiario) * 100;
                      const pctEgreso = (dia.egresos / maxMontoDiario) * 100;

                      return (
                        <View key={dia.fecha} style={styles.dailyRow}>
                          <View style={styles.dailyDateBadge}>
                            <Text style={styles.dailyDateText}>Día {dia.dia}</Text>
                          </View>

                          <View style={styles.dailyBarsArea}>
                            {dia.ingresos > 0 && (
                              <View style={styles.dailyBarLine}>
                                <View style={[styles.dailyBarFill, { width: `${Math.max(pctIngreso, 6)}%`, backgroundColor: colors.income }]} />
                                <Text style={[styles.dailyBarText, { color: colors.income }]}>
                                  +{formatCurrency(dia.ingresos)}
                                </Text>
                              </View>
                            )}
                            {dia.egresos > 0 && (
                              <View style={styles.dailyBarLine}>
                                <View style={[styles.dailyBarFill, { width: `${Math.max(pctEgreso, 6)}%`, backgroundColor: colors.expense }]} />
                                <Text style={[styles.dailyBarText, { color: colors.expense }]}>
                                  −{formatCurrency(dia.egresos)}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  chartTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  chartHint: { color: colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  monthRowTouchable: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs + 2, borderRadius: Radius.sm },
  monthNameBox: { width: 40 },
  monthName:  { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  barsContainer: { flex: 1, gap: 4, paddingLeft: Spacing.sm, borderLeftWidth: 1, borderLeftColor: colors.borderLight },
  barWrapper: { height: 8, backgroundColor: 'transparent', width: '100%' },
  bar:        { height: '100%', borderRadius: Radius.sm },
  barIngreso: { backgroundColor: colors.income },
  barEgreso:  { backgroundColor: colors.expense },
  monthArrow: { color: colors.textMuted, fontSize: 18, marginLeft: Spacing.sm, paddingRight: 4 },

  // Leyenda
  legendRow:  { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginTop: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textSecondary, fontSize: FontSize.xs },

  // Modal Detalle
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgCard, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  modalSub: { color: colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgCardAlt, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  monthHeroSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.md,
  },
  monthSummaryStat: { alignItems: 'center' },
  summarySmallLabel: { color: colors.textMuted, fontSize: FontSize.xs, marginBottom: 2 },
  summarySmallVal: { fontSize: FontSize.sm + 1, fontWeight: FontWeight.bold },
  summaryDivider: { width: 1, height: 26, backgroundColor: colors.border },

  highlightsContainer: { gap: Spacing.xs, marginBottom: Spacing.md },
  highlightCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.bgCardAlt, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1 },
  highlightEmoji: { fontSize: 22 },
  highlightTitle: { color: colors.textSecondary, fontSize: FontSize.xs },
  highlightSub: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  dailySectionTitle: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  emptyDaily: { padding: Spacing.lg, alignItems: 'center' },
  emptyDailyText: { color: colors.textMuted, fontSize: FontSize.sm },

  dailyListContainer: { gap: Spacing.sm },
  dailyRow: { backgroundColor: colors.bg, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: colors.border + '50' },
  dailyDateBadge: { marginBottom: 4 },
  dailyDateText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  dailyBarsArea: { gap: 4 },
  dailyBarLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dailyBarFill: { height: 12, borderRadius: Radius.sm },
  dailyBarText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
