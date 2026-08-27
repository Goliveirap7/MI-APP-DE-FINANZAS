/**
 * InvestmentsScreen — Activos de inversión (RF-13, RF-14, RF-15)
 *
 * Layout:
 *  ┌───────────────────────────────────────┐
 *  │  Header "Inversiones"                 │
 *  ├───────────────────────────────────────┤
 *  │  Hero: Total invertido (grande)        │
 *  ├───────────────────────────────────────┤
 *  │  Lista de activos:                    │
 *  │   📈 BTC         S/ 850.00    [Editar]│
 *  │   📊 SPYG        S/ 400.00    [Editar]│
 *  └───────────────────────────────────────┘
 *  FAB ＋ → BottomSheet para agregar activo
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
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';

import Card from '../../components/ui/Card';
import BottomSheet from '../../components/ui/BottomSheet';

import { useInversiones } from '../../hooks/useInversiones';
import type { NuevoActivo, ActivoLocal } from '../../db/repositories/inversiones';
import { useTheme } from '../../context/ThemeContext';
import { showToast } from '../../utils/toast';

// ─────────────────────────────────────────────────────────────────────────────

export default function InvestmentsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { activos, totalInvertido, loading, agregar, actualizarMonto } = useInversiones();

  // Estados del form Agregar
  const [showForm, setShowForm]       = useState(false);
  const [nombre, setNombre]           = useState('');
  const [monto, setMonto]             = useState('');
  const [nota, setNota]               = useState('');
  const [saving, setSaving]           = useState(false);

  // Estados del form Editar
  const [editando, setEditando]       = useState<ActivoLocal | null>(null);
  const [nuevoMonto, setNuevoMonto]   = useState('');

  const resetForm = () => {
    setNombre(''); setMonto(''); setNota(''); };

  const handleAgregar = async () => {
    const montoNum = parseFloat(monto.replace(',', '.'));
    if (!nombre.trim()) { showToast('Nombre requerido: Escribe el nombre del activo.'); return; }
    if (!montoNum || montoNum <= 0) { showToast('Monto inválido: Ingresa un monto mayor a 0.'); return; }

    setSaving(true);
    try {
      const data: NuevoActivo = {
        nombre: nombre.trim(),
        monto_invertido: montoNum,
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

  const handleEditar = async () => {
    if (!editando) return;
    const montoNum = parseFloat(nuevoMonto.replace(',', '.'));
    if (!montoNum || montoNum <= 0) { showToast('Monto inválido'); return; }

    setSaving(true);
    try {
      await actualizarMonto(editando.id_local, montoNum);
      setEditando(null);
      setNuevoMonto('');
    } catch (e: any) {
      showToast('Error: ' + (e?.message ?? 'No se pudo actualizar.'));
    } finally {
      setSaving(false);
    }
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
          <Text style={styles.pageTitle}>📈 Inversiones</Text>
          <View style={{ width: 40, height: 40 }} />
        </View>

        {/* ── Hero: total invertido ───────────────── */}
        <LinearGradient
          colors={['#1a1040', '#0d1a40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.85)' }]}>Total invertido</Text>
          <Text style={[styles.heroAmount, { color: '#ffffff' }]}>{formatCurrency(totalInvertido)}</Text>
          <Text style={[styles.heroSub, { color: 'rgba(255,255,255,0.7)' }]}>
            {activos.length === 0
              ? 'Sin activos registrados'
              : `${activos.length} activo${activos.length > 1 ? 's' : ''}`}
          </Text>
        </LinearGradient>

        {/* ── Loading ─────────────────────────────── */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.secondary} />
          </View>
        )}

        {/* ── Lista de activos ────────────────────── */}
        {!loading && activos.length === 0 && (
          <Card>
            <Text style={styles.emptyText}>
              Sin activos registrados aún.{'\n'}Toca ＋ para agregar el primero.
            </Text>
          </Card>
        )}

        {!loading && activos.map((activo, idx) => {
          const pct = totalInvertido > 0
            ? (activo.monto_invertido / totalInvertido) * 100
            : 0;

          return (
            <Card key={activo.id_local}>
              <View style={styles.activoRow}>
                {/* Ícono + nombre */}
                <View style={styles.activoInfo}>
                  <View style={styles.activoIcon}>
                    <Text style={styles.activoEmoji}>
                      {getEmojiForActivo(activo.nombre)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.activoNombre}>{activo.nombre}</Text>
                    {activo.nota ? (
                      <Text style={styles.activoNota}>{activo.nota}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Monto + botón editar */}
                <View style={styles.activoRight}>
                  <Text style={[styles.activoMonto, { color: colors.secondary }]}>
                    {formatCurrency(activo.monto_invertido)}
                  </Text>
                  <TouchableOpacity
                    style={styles.editarBtn}
                    onPress={() => {
                      setEditando(activo);
                      setNuevoMonto(activo.monto_invertido.toString());
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editarBtnText}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Barra de proporción */}
              <View style={styles.pctTrackOuter}>
                <View
                  style={[
                    styles.pctTrackInner,
                    { width: `${Math.round(pct)}%`, backgroundColor: colors.secondary },
                  ]}
                />
              </View>
              <Text style={styles.pctLabel}>{Math.round(pct)}% del total</Text>
            </Card>
          );
        })}

        {/* Empty State */}
        {!loading && activos.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: Spacing.xxl, opacity: 0.7 }}>
            <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>💤</Text>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', paddingHorizontal: Spacing.xl }}>
              Tu dinero está tomando una siesta. ¡Ponlo a trabajar! 📈
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ─────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <LinearGradient
          colors={[colors.secondary, '#4f46e5']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.fabText}>＋</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── BottomSheet: Agregar activo ─────────── */}
      <BottomSheet
        visible={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title="Nuevo activo"
      >
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Nombre del activo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. BTC, SPYG, Factoring"
            placeholderTextColor={colors.textMuted}
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Monto invertido (S/)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={monto}
            onChangeText={setMonto}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Nota (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. plataforma, estrategia"
            placeholderTextColor={colors.textMuted}
            value={nota}
            onChangeText={setNota}
          />
        </View>

        <TouchableOpacity
          onPress={handleAgregar}
          disabled={saving}
          activeOpacity={0.85}
          style={styles.saveWrapper}
        >
          <LinearGradient
            colors={[colors.secondary, '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Guardar activo</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </BottomSheet>

      {/* ── BottomSheet: Editar monto ───────────── */}
      <BottomSheet
        visible={editando !== null}
        onClose={() => { setEditando(null); setNuevoMonto(''); }}
        title={`Actualizar: ${editando?.nombre ?? ''}`}
      >
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Nuevo monto invertido (S/)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={nuevoMonto}
            onChangeText={setNuevoMonto}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        <TouchableOpacity
          onPress={handleEditar}
          disabled={saving}
          activeOpacity={0.85}
          style={styles.saveWrapper}
        >
          <LinearGradient
            colors={[colors.secondary, '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Actualizar monto</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ─── Helper: emoji por nombre de activo ──────────────────────────────────────

function getEmojiForActivo(nombre: string): string {
  const n = nombre.toUpperCase();
  if (n.includes('BTC') || n.includes('BITCOIN')) return '₿';
  if (n.includes('ETH')) return 'Ξ';
  if (n.includes('FACTOR')) return '🏦';
  if (n.includes('SPY') || n.includes('VOO') || n.includes('QQQ')) return '🇺🇸';
  if (n.includes('DEPOT') || n.includes('PLAZO')) return '🏛';
  return '📊';
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

  // Hero
  heroCard:   { borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: colors.secondary + '30' },
  heroLabel:  { color: colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroAmount: { color: colors.textPrimary, fontSize: FontSize.hero, fontWeight: FontWeight.bold, letterSpacing: -1 },
  heroSub:    { color: colors.textSecondary, fontSize: FontSize.xs },

  loadingRow: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyText:  { color: colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg, lineHeight: 22 },

  // Activo card
  activoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  activoInfo:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  activoIcon:  { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: colors.secondary + '20', alignItems: 'center', justifyContent: 'center' },
  activoEmoji: { fontSize: 20 },
  activoNombre:{ color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  activoNota:  { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  activoRight: { alignItems: 'flex-end', gap: 4 },
  activoMonto: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  editarBtn:   { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: colors.secondary + '50', backgroundColor: colors.secondary + '10' },
  editarBtnText:{ color: colors.secondary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  pctTrackOuter: { height: 4, borderRadius: Radius.full, backgroundColor: colors.bgInput, overflow: 'hidden', marginTop: Spacing.xs },
  pctTrackInner: { height: '100%', borderRadius: Radius.full },
  pctLabel:      { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },

  // FAB
  fab:         { position: 'absolute', bottom: 80, right: Spacing.lg, width: 58, height: 58, borderRadius: Radius.full, shadowColor: colors.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  fabGradient: { width: '100%', height: '100%', borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  fabText:     { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: FontWeight.bold },

  // Form
  formRow:   { gap: Spacing.xs, marginBottom: Spacing.sm },
  formLabel: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
  input:     { backgroundColor: colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: FontSize.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },

  saveWrapper: { borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing.sm },
  saveBtn:     { paddingVertical: Spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
