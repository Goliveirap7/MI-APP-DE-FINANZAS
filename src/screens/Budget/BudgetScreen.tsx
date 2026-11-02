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
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { formatCurrency, formatPercent, mesActualISO, clamp } from '../../utils/format';
import { triggerSoftTap } from '../../utils/haptics';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const toggleExpand = (catId: string) => {
    triggerSoftTap();
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const {
    disponible,
    rows,
    totalPct,
    totalMonto,
    loading,
    saving,
    hasExistingBudget,
    existingBudgetSummary,
    hasDraft,
    updatePct,
    updateMonto,
    updateConceptMonto,
    guardar,
    discardDraft,
    refetch,
  } = usePresupuesto(mes);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

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
    // Si ya existe un presupuesto previo asignado, mostrar modal de confirmación con el listado
    if (hasExistingBudget && existingBudgetSummary.length > 0) {
      triggerSoftTap();
      setShowConfirmModal(true);
    } else {
      await ejecutarGuardado();
    }
  };

  const ejecutarGuardado = async () => {
    setShowConfirmModal(false);
    try {
      await guardar();
      new SyncEngine(db).pushToCloud();
      showToast('El presupuesto del mes fue guardado correctamente ✅');
      refetch();
    } catch (e: any) {
      showToast('Error: ' + (e?.message ?? 'No se pudo guardar.'));
    }
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

        {/* ── AVISO DE BORRADOR GUARDADO EN STORAGE ─── */}
        {hasDraft && !loading && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 176, 32, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(255, 176, 32, 0.4)',
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            marginVertical: Spacing.xs,
          }}>
            <Text style={{ color: colors.warning, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }}>
              📝 Cambios guardados en borrador
            </Text>
            <TouchableOpacity 
              onPress={() => {
                triggerSoftTap();
                Alert.alert(
                  'Descartar borrador',
                  '¿Deseas restablecer las categorías al presupuesto guardado anteriormente?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Restablecer', style: 'destructive', onPress: discardDraft }
                  ]
                );
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, textDecorationLine: 'underline' }}>
                Restablecer
              </Text>
            </TouchableOpacity>
          </View>
        )}

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

              {/* ── Botón expandir/colapsar conceptos ─── */}
              <TouchableOpacity
                style={styles.expandBtn}
                onPress={() => toggleExpand(row.categoria.id_local)}
                activeOpacity={0.7}
              >
                <Text style={styles.expandBtnText}>
                  {expandedCats[row.categoria.id_local]
                    ? '▲ Ocultar conceptos'
                    : `▼ Desglosar conceptos (${row.conceptos.length})`}
                </Text>
              </TouchableOpacity>

              {/* ── Lista de conceptos desglosados ────── */}
              {expandedCats[row.categoria.id_local] && (
                <View style={styles.conceptContainer}>
                  <View style={styles.conceptDivider} />
                  <Text style={styles.conceptSectionTitle}>
                    Sobres de {nombre} (Conceptos)
                  </Text>
                  {row.conceptos.length === 0 ? (
                    <Text style={styles.conceptEmptyText}>
                      No tienes conceptos creados en esta categoría.{'\n'}
                      Puedes agregarlos desde el menú &gt; Categorías y Conceptos.
                    </Text>
                  ) : (
                    row.conceptos.map((conc) => {
                      const concDiff = conc.monto_presupuesto - conc.monto_real;
                      const isOver = conc.monto_real > conc.monto_presupuesto && conc.monto_presupuesto > 0;
                      return (
                        <View key={conc.concepto.id_local} style={styles.conceptItem}>
                          <View style={{ flex: 1, marginRight: Spacing.sm }}>
                            <Text style={styles.conceptName}>{conc.concepto.nombre}</Text>
                            <Text style={styles.conceptReal}>
                              Gastado: <Text style={{ color: colors.textPrimary, fontWeight: FontWeight.semibold }}>{formatCurrency(conc.monto_real)}</Text>
                              {conc.monto_presupuesto > 0 && (
                                <Text style={{ color: isOver ? colors.expense : colors.income }}>
                                  {' '}({isOver ? '-' : '+'}{formatCurrency(Math.abs(concDiff))})
                                </Text>
                              )}
                            </Text>
                          </View>
                          <View style={styles.conceptInputWrapper}>
                            <Text style={styles.conceptCurrencyPrefix}>S/</Text>
                            <TextInput
                              style={styles.conceptTextInput}
                              defaultValue={conc.monto_presupuesto > 0 ? conc.monto_presupuesto.toString() : ''}
                              placeholder="0.00"
                              placeholderTextColor={colors.textMuted}
                              keyboardType="numeric"
                              onEndEditing={(e) => {
                                const val = parseFloat(e.nativeEvent.text) || 0;
                                updateConceptMonto(row.categoria.id_local, conc.concepto.id_local, val);
                              }}
                            />
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
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

      {/* ── MODAL DE CONFIRMACIÓN DE CAMBIO DE PRESUPUESTO ── */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Presupuesto actual detectado</Text>
            <Text style={styles.modalSub}>
              Ya tienes un presupuesto actual asignado para este mes:
            </Text>

            <View style={styles.summaryList}>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {existingBudgetSummary.map((item, idx) => (
                  <View key={idx} style={styles.summaryRow}>
                    <Text style={styles.summaryCatName} numberOfLines={1}>
                      {EMOJI[item.nombre] || '📁'} {item.nombre}
                    </Text>
                    <View style={styles.summaryRight}>
                      <Text style={styles.summaryPct}>{item.pct.toFixed(1)}%</Text>
                      <Text style={styles.summaryMonto}>{formatCurrency(item.monto)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.modalQuestion}>
              ¿Estás seguro que deseas cambiarlo?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                activeOpacity={0.7}
                onPress={() => {
                  triggerSoftTap();
                  setShowConfirmModal(false);
                }}
              >
                <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnConfirm}
                activeOpacity={0.8}
                onPress={() => {
                  triggerSoftTap();
                  ejecutarGuardado();
                }}
              >
                <Text style={styles.modalBtnTextConfirm}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Botón y desglose por conceptos
  expandBtn: {
    paddingVertical: Spacing.xs + 2,
    marginTop: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtnText: {
    color: colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  conceptContainer: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  conceptDivider: {
    height: 1,
    backgroundColor: colors.border + '40',
    marginBottom: Spacing.sm,
  },
  conceptSectionTitle: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conceptEmptyText: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: Spacing.xs,
    lineHeight: 18,
  },
  conceptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '20',
  },
  conceptName: {
    fontSize: FontSize.sm,
    color: colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  conceptReal: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  conceptInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.xs + 2,
    minWidth: 85,
    height: 34,
  },
  conceptCurrencyPrefix: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginRight: 4,
    fontWeight: FontWeight.semibold,
  },
  conceptTextInput: {
    flex: 1,
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    paddingVertical: 0,
    textAlign: 'right',
  },

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

  // Modal confirmación
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  modalSub: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  summaryList: {
    backgroundColor: colors.bg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: Spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  summaryCatName: {
    fontSize: FontSize.sm,
    color: colors.textPrimary,
    fontWeight: FontWeight.medium,
    flex: 1,
    marginRight: Spacing.sm,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryPct: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
    color: colors.primary,
  },
  summaryMonto: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
  },
  modalQuestion: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextCancel: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  modalBtnTextConfirm: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
