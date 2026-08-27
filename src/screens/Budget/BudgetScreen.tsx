/**
 * BudgetScreen — Presupuesto del mes (RF-04, RF-05, RF-06)
 *
 * Layout:
 *  ┌─────────────────────────────────────────┐
 *  │  Header + Selector de mes               │
 *  ├─────────────────────────────────────────┤
 *  │  Hero: Disponible │ Total asignado       │
 *  │  Barra global de asignación (0–100%)    │
 *  ├─────────────────────────────────────────┤
 *  │  Advertencia si ≠ 100%                  │
 *  ├─────────────────────────────────────────┤
 *  │  Por categoría (editable):              │
 *  │   Emoji Nombre     [−] 14% [+]          │
 *  │   Monto: S/535   = S/ de S/             │
 *  │   ████████░░░░  Real S/535  +S/0.00     │
 *  ├─────────────────────────────────────────┤
 *  │  [Guardar presupuesto]                  │
 *  └─────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { formatCurrency, formatPercent, mesActualISO, clamp } from '../../utils/format';

import MonthSelector from '../../components/ui/MonthSelector';
import Card from '../../components/ui/Card';
import BudgetInput from '../../components/ui/BudgetInput';
import CategoryProgressRow from '../../components/ui/CategoryProgressRow';

import { useFocusEffect } from '@react-navigation/native';
import { SyncEngine } from '../../db/sync/SyncEngine';
import { showToast } from '../../utils/toast';
import { useDatabase } from '../../db/database';
import { usePresupuesto } from '../../hooks/usePresupuesto';
import { useTheme } from '../../context/ThemeContext';

// Emojis por nombre de categoría
const EMOJI: Record<string, string> = {
  'Servicios':          '🏠',
  'Gastos necesarios':  '🛒',
  'Gastos sin culpa':   '🎉',
  'Salud':              '💊',
  'Emergencia':         '🚨',
  'Inversión':          '📈',
};

export default function BudgetScreen() {
  const { colors } = useTheme();
  const db = useDatabase();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const [mes, setMes] = useState(mesActualISO());

  const {
    disponible,
    rows,
    totalPct,
    totalMonto,
    loading,
    saving,
    updatePct,
    updateMonto,
    guardar,
    refetch,
  } = usePresupuesto(mes);

  const errorMonto      = Math.abs(totalMonto - disponible);
  const pctRatio        = disponible > 0 ? clamp(totalMonto / disponible, 0, 1) : 0;
  const pctCompleto     = disponible > 0 && errorMonto <= 0.1;
  const pctSobrepasado  = totalMonto > disponible;

  const globalBarColor = pctSobrepasado
    ? colors.expense
    : pctCompleto
    ? colors.income
    : colors.warning;

  const handleGuardar = async () => {
    if (disponible > 0 && !pctCompleto) {
      showToast(`Has asignado S/ ${totalMonto.toFixed(2)} pero tienes S/ ${disponible.toFixed(2)} disponibles.`);
      return;
    }
    try {
      await guardar();
      new SyncEngine(db).pushToCloud();
      showToast('El presupuesto del mes fue guardado correctamente.');
      refetch();
    } catch (e: any) {
      showToast('Error: ' + (e?.message ?? 'No se pudo guardar.'));
    } finally { };
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Presupuesto del mes</Text>
          <Text style={styles.headerSub}>
            Define cómo distribuir tu dinero disponible
          </Text>
        </View>

        {/* ── SELECTOR DE MES ───────────────────────── */}
        <MonthSelector mes={mes} onChange={setMes} />

        {/* ── LOADING ───────────────────────────────── */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Cargando presupuesto…</Text>
          </View>
        )}

        {/* ── HERO: DISPONIBLE + TOTAL ASIGNADO ─────── */}
        {!loading && (
          <LinearGradient
            colors={['#112240', '#0d3d2e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroRow}>
              {/* Disponible */}
              <View style={styles.heroCol}>
                <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.85)' }]}>Disponible</Text>
                <Text style={[styles.heroAmount, { color: '#ffffff' }]}>
                  {formatCurrency(disponible)}
                </Text>
              </View>

              {/* Divisor */}
              <View style={styles.heroDivider} />

              {/* Asignado */}
              <View style={styles.heroCol}>
                <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.85)' }]}>Asignado</Text>
                <Text style={[
                  styles.heroAmount,
                  { color: pctSobrepasado ? colors.expense : pctCompleto ? colors.income : colors.warning },
                ]}>
                  {formatCurrency(totalMonto)}
                </Text>
              </View>
            </View>

            {/* Barra global */}
            <View style={styles.globalTrackOuter}>
              <View
                style={[
                  styles.globalTrackInner,
                  {
                    width: `${Math.min(pctRatio * 100, 100)}%`,
                    backgroundColor: globalBarColor,
                  },
                ]}
              />
            </View>

            <Text style={[styles.globalStatus, { color: globalBarColor }]}>
              {disponible === 0
                ? 'No hay dinero disponible este mes'
                : pctCompleto
                ? '✨ Distribución completa – listo para guardar'
                : pctSobrepasado
                ? `⚠️ Sobrepasado en S/ ${(totalMonto - disponible).toFixed(2)} – reduce alguna categoría`
                : `Faltan S/ ${(disponible - totalMonto).toFixed(2)} por asignar`}
            </Text>
          </LinearGradient>
        )}

        {/* ── FILAS POR CATEGORÍA ───────────────────── */}
        {!loading && rows.length === 0 && (
          <Card>
            <Text style={styles.emptyText}>
              No hay categorías de egreso configuradas.{'\n'}
              Ve a Configuración para agregarlas.
            </Text>
          </Card>
        )}

        {!loading && rows.map((row) => {
          const nombre = row.categoria.nombre;
          const emoji  = EMOJI[nombre] ?? '📁';
          const accent = row.diferencia < 0 ? colors.expense : colors.primary;

          return (
            <Card key={row.categoria.id_local} style={styles.rowCard}>
              {/* ── Nombre + stepper ─────────────────── */}
              <View style={styles.rowHeader}>
                <View style={styles.rowTitle}>
                  <Text style={styles.rowEmoji}>{emoji}</Text>
                  <Text style={styles.rowNombre}>{nombre}</Text>
                </View>
                <BudgetInput
                  porcentaje={row.porcentaje}
                  monto={row.monto_presupuesto}
                  onUpdatePct={(v) => updatePct(row.categoria.id_local, v)}
                  onUpdateMonto={(v) => updateMonto(row.categoria.id_local, v)}
                  accentColor={accent}
                  disponible={disponible}
                />
              </View>

              {/* ── Monto calculado ──────────────────── */}
              <View style={styles.montoRow}>
                <Text style={styles.montoLabel}>
                  Presupuesto:{' '}
                  <Text style={{ color: colors.textPrimary, fontWeight: FontWeight.semibold }}>
                    {formatCurrency(row.monto_presupuesto)}
                  </Text>
                </Text>
                <Text style={styles.montoLabel}>
                  {formatPercent(row.porcentaje / 100)} de disponible
                </Text>
              </View>

              {/* ── Barra presupuesto vs real ─────────── */}
              <CategoryProgressRow
                data={{
                  nombre:      '',
                  presupuesto: row.monto_presupuesto,
                  real:        row.monto_real,
                }}
              />
            </Card>
          );
        })}

        {/* ── BOTÓN GUARDAR ─────────────────────────── */}
        {!loading && (
          <TouchableOpacity
            onPress={handleGuardar}
            disabled={saving}
            activeOpacity={0.85}
            style={styles.saveWrapper}
          >
            <LinearGradient
              colors={
                pctCompleto
                  ? [colors.primary, '#00a87a']
                  : [colors.bgCardAlt, colors.bgCardAlt]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtn}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[
                  styles.saveBtnText,
                  !pctCompleto && disponible > 0 && { color: colors.textMuted },
                ]}>
                  {pctCompleto || disponible === 0 ? 'Guardar presupuesto' : `Asigna los S/ ${(disponible - totalMonto).toFixed(2)} restantes`}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scroll:  { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  // Header
  header:     { alignItems: 'center', gap: Spacing.xs },
  headerTitle:{ color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  headerSub:  { color: colors.textSecondary, fontSize: FontSize.xs, textAlign: 'center' },

  // Loading
  loadingRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  loadingText: { color: colors.textSecondary, fontSize: FontSize.sm },

  // Hero
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroCol: { flex: 1, alignItems: 'center', gap: 4 },
  heroDivider: { width: 1, height: 40, backgroundColor: colors.border },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroAmount: {
    color: colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  globalTrackOuter: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  globalTrackInner: {
    height: '100%',
    borderRadius: Radius.full,
  },
  globalStatus: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },

  // Fila por categoría
  rowCard: { gap: Spacing.sm },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  rowEmoji:  { fontSize: 22 },
  rowNombre: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1 },

  montoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  montoLabel: { color: colors.textSecondary, fontSize: FontSize.xs },

  // Vacío
  emptyText: { color: colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg, lineHeight: 22 },

  // Guardar
  saveWrapper: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    marginTop: Spacing.xs,
  },
  saveBtn: { paddingVertical: Spacing.md + 2, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
