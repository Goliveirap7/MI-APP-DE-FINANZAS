/**
 * DebtsScreen — Deudas con terceros (RF-10, RF-11, RF-12)
 *
 * Layout:
 *  ┌───────────────────────────────────────┐
 *  │  Header "Deudas"                      │
 *  ├───────────────────────────────────────┤
 *  │  Resumen: [Me deben] [Debo] [Neto]    │
 *  ├───────────────────────────────────────┤
 *  │  Filtro: Pendientes │ Pagadas │ Todas  │
 *  ├───────────────────────────────────────┤
 *  │  Lista de tarjetas de deuda           │
 *  │   👤 Persona  · fecha                 │
 *  │   S/ monto  [Me deben / Debo]         │
 *  │   [Marcar pagada]  (si pendiente)     │
 *  └───────────────────────────────────────┘
 *  FAB ＋ → abre BottomSheet con formulario
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
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';

import Card from '../../components/ui/Card';
import BottomSheet from '../../components/ui/BottomSheet';
import TypeToggle from '../../components/ui/TypeToggle';

import { useDeudas, type FiltroDeuda } from '../../hooks/useDeudas';
import type { NuevaDeuda } from '../../db/repositories/deudas';
import { useTheme } from '../../context/ThemeContext';
import { showToast } from '../../utils/toast';

// ─────────────────────────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().split('T')[0]; }

const FILTROS: { key: FiltroDeuda; label: string }[] = [
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'pagada',    label: 'Pagadas'    },
  { key: 'todas',     label: 'Todas'      },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function DebtsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { deudas, totales, loading, filtro, setFiltro, agregar, marcarPagada } = useDeudas();

  // Estado del form
  const [showForm, setShowForm]     = useState(false);
  const [persona, setPersona]       = useState('');
  const [monto, setMonto]           = useState('');
  const [direccion, setDireccion]   = useState<'me_deben'|'debo'>('me_deben');
  const [nota, setNota]             = useState('');
  const [saving, setSaving]         = useState(false);

  const neto = totales.me_deben - totales.debo;

  const resetForm = () => {
    setPersona(''); setMonto(''); setNota('');
    setDireccion('me_deben');
  };

  const handleAgregar = async () => {
    const montoNum = parseFloat(monto.replace(',', '.'));
    if (!persona.trim()) { showToast('Falta el nombre: Escribe el nombre de la persona.'); return; }
    if (!montoNum || montoNum <= 0) { showToast('Monto inválido: Ingresa un monto mayor a 0.'); return; }

    setSaving(true);
    try {
      const data: NuevaDeuda = {
        persona: persona.trim(),
        monto: montoNum,
        direccion,
        fecha: todayISO(),
        nota: nota.trim() || null,
      };
      await agregar(data);
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      showToast('Error: ' + (e?.message ?? 'No se pudo guardar.'));
    } finally {
      setSaving(false);
    }
  };

  const handleMarcarPagada = (id: string, persona: string) => {
    Alert.alert(
      'Marcar como pagada',
      `¿Confirmas que la deuda con ${persona} está saldada?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, pagada', onPress: () => marcarPagada(id) },
      ],
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backBtn} 
            activeOpacity={0.7} 
            onPress={() => navigation.goBack()}
          >
            <Image source={require('../../../assets/flechas/izquierda.png')} style={{ width: 16, height: 16, tintColor: colors.textPrimary }} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>🤝 Deudas</Text>
          <View style={{ width: 40, height: 40 }} />
        </View>

        {/* ── Resumen de totales ──────────────────── */}
        <View style={styles.totalesRow}>
          <TotalCard
            label="Me deben"
            amount={totales.me_deben}
            color={colors.income}
            icon="⬆"
          />
          <TotalCard
            label="Debo"
            amount={totales.debo}
            color={colors.expense}
            icon="⬇"
          />
          <TotalCard
            label="Neto"
            amount={neto}
            color={neto >= 0 ? colors.income : colors.expense}
            icon="="
          />
        </View>

        {/* ── Filtros ─────────────────────────────── */}
        <View style={styles.filtrosRow}>
          {FILTROS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filtroBtn, filtro === f.key && styles.filtroBtnActive]}
              onPress={() => setFiltro(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filtroText, filtro === f.key && styles.filtroTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Loading ─────────────────────────────── */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {/* ── Lista ───────────────────────────────── */}
        {!loading && deudas.length === 0 && (
          <Card>
            <Text style={styles.emptyText}>
              {filtro === 'pendiente'
                ? 'Sin deudas pendientes 🎉\nToca ＋ para registrar una.'
                : 'Sin registros en este filtro.'}
            </Text>
          </Card>
        )}

        {!loading && deudas.map((d) => {
          const esMeDeben  = d.direccion === 'me_deben';
          const esPagada   = d.estado === 'pagada';
          const accentColor = esMeDeben ? colors.income : colors.expense;

          return (
            <Card key={d.id_local} style={styles.deudaCard}>
              <View style={styles.deudaHeader}>
                {/* Persona + fecha */}
                <View style={styles.deudaPersona}>
                  <View style={[styles.personaAvatar, { backgroundColor: accentColor + '20' }]}>
                    <Text style={[styles.personaLetra, { color: accentColor }]}>
                      {d.persona.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.personaNombre}>{d.persona}</Text>
                    <Text style={styles.personaFecha}>
                      {new Date(d.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>

                {/* Badge dirección + estado */}
                <View style={styles.deudaBadges}>
                  <View style={[styles.badge, { backgroundColor: accentColor + '20', borderColor: accentColor + '50' }]}>
                    <Text style={[styles.badgeText, { color: accentColor }]}>
                      {esMeDeben ? 'Me deben' : 'Debo'}
                    </Text>
                  </View>
                  {esPagada && (
                    <View style={styles.badgePagada}>
                      <Text style={styles.badgePagadaText}>✓ Pagada</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Monto */}
              <Text style={[styles.deudaMonto, { color: accentColor }]}>
                {formatCurrency(d.monto)}
              </Text>

              {/* Nota */}
              {d.nota ? <Text style={styles.deudaNota}>{d.nota}</Text> : null}

              {/* Acción marcar pagada */}
              {!esPagada && (
                <TouchableOpacity
                  style={styles.pagarBtn}
                  onPress={() => handleMarcarPagada(d.id_local, d.persona)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pagarBtnText}>✓ Marcar como pagada</Text>
                </TouchableOpacity>
              )}
            </Card>
          );
        })}

        {/* Empty State */}
        {!loading && deudas.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: Spacing.xxl, opacity: 0.7 }}>
            <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>🌴</Text>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', paddingHorizontal: Spacing.xl }}>
              ¡Qué paz! No le debes nada a nadie (por ahora)
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ─────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <LinearGradient
          colors={[colors.debt, '#e06a20']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.fabText}>＋</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Bottom Sheet: Agregar deuda ──────────── */}
      <BottomSheet
        visible={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title="Nueva deuda"
      >
        {/* Dirección toggle */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Tipo</Text>
          <View style={styles.dirRow}>
            {(['me_deben', 'debo'] as const).map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dirChip,
                  direccion === d && {
                    backgroundColor: (d === 'me_deben' ? colors.income : colors.expense) + '20',
                    borderColor: d === 'me_deben' ? colors.income : colors.expense,
                  },
                ]}
                onPress={() => setDireccion(d)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dirChipText,
                  direccion === d && { color: d === 'me_deben' ? colors.income : colors.expense, fontWeight: FontWeight.semibold },
                ]}>
                  {d === 'me_deben' ? '⬆ Me deben' : '⬇ Debo'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Persona */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Persona</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la persona"
            placeholderTextColor={colors.textMuted}
            value={persona}
            onChangeText={setPersona}
            autoCapitalize="words"
          />
        </View>

        {/* Monto */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Monto (S/)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={monto}
            onChangeText={setMonto}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Nota */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Nota (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Motivo o descripción"
            placeholderTextColor={colors.textMuted}
            value={nota}
            onChangeText={setNota}
          />
        </View>

        {/* Guardar */}
        <TouchableOpacity
          onPress={handleAgregar}
          disabled={saving}
          activeOpacity={0.85}
          style={styles.saveWrapper}
        >
          <LinearGradient
            colors={[colors.debt, '#e06a20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Guardar deuda</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function TotalCard({ label, amount, color, icon }: { label: string; amount: number; color: string; icon: string }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={[styles.totalCard, { borderColor: color + '30' }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={[styles.totalAmount, { color }]}>{formatCurrency(Math.abs(amount))}</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  scroll:  { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  pageTitle: { color: colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgCardAlt, borderRadius: Radius.full },
  backBtnText: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  // Totales
  totalesRow: { flexDirection: 'row', gap: Spacing.sm },
  totalCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  totalLabel: { color: colors.textSecondary, fontSize: FontSize.xs },
  totalAmount:{ fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Filtros
  filtrosRow: { flexDirection: 'row', backgroundColor: colors.bgCardAlt, borderRadius: Radius.full, padding: 3, gap: 3 },
  filtroBtn:  { flex: 1, paddingVertical: Spacing.sm - 2, borderRadius: Radius.full, alignItems: 'center' },
  filtroBtnActive: { backgroundColor: colors.bgCard },
  filtroText: { color: colors.textMuted, fontSize: FontSize.xs },
  filtroTextActive: { color: colors.textPrimary, fontWeight: FontWeight.semibold },

  loadingRow: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyText:  { color: colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg, lineHeight: 22 },

  // Deuda card
  deudaCard:   { gap: Spacing.sm },
  deudaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deudaPersona:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  personaAvatar: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  personaLetra: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  personaNombre:{ color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  personaFecha: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  deudaBadges: { gap: 4, alignItems: 'flex-end' },
  badge:       { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  badgeText:   { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  badgePagada: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary + '50' },
  badgePagadaText: { fontSize: FontSize.xs, color: colors.primary },
  deudaMonto:  { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  deudaNota:   { color: colors.textSecondary, fontSize: FontSize.xs, fontStyle: 'italic' },
  pagarBtn:    { borderWidth: 1, borderColor: colors.primary + '50', borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: colors.primaryDim },
  pagarBtnText:{ color: colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  // FAB
  fab:         { position: 'absolute', bottom: 80, right: Spacing.lg, width: 58, height: 58, borderRadius: Radius.full, shadowColor: colors.debt, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  fabGradient: { width: '100%', height: '100%', borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  fabText:     { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: FontWeight.bold },

  // Form
  formRow:   { gap: Spacing.xs, marginBottom: Spacing.sm },
  formLabel: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
  input:     { backgroundColor: colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: FontSize.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  dirRow:    { flexDirection: 'row', gap: Spacing.sm },
  dirChip:   { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgInput, alignItems: 'center' },
  dirChipText:{ color: colors.textSecondary, fontSize: FontSize.sm },

  saveWrapper: { borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing.sm },
  saveBtn:     { paddingVertical: Spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
