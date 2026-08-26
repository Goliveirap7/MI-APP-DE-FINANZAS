/**
 * AddTransactionScreen — Registrar transacción (RF-01)
 * Guarda en SQLite local con estado_sync = 'pendiente' (offline-first §18).
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import type { TipoTransaccion } from '../../constants/types';
import { formatCurrency } from '../../utils/format';
import NetInfo from '@react-native-community/netinfo';

import TypeToggle from '../../components/ui/TypeToggle';
import CategoryPicker, { type CategoryOption } from '../../components/ui/CategoryPicker';

import { useCategorias } from '../../hooks/useCategorias';
import { insertTransaccion, getTransaccionById, updateTransaccion, deleteTransaccion } from '../../db/repositories/transacciones';
import { useDatabase } from '../../db/database';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date  = new Date(y, m - 1, d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

// Emojis para categorías
const EMOJI_INGRESO: Record<string, string> = {
  'Salario': '💼', 'Negocio': '🏪', 'Otros': '💰',
};
const EMOJI_EGRESO: Record<string, string> = {
  'Servicios': '🏠', 'Gastos necesarios': '🛒', 'Gastos sin culpa': '🎉',
  'Salud': '💊', 'Emergencia': '🚨', 'Inversión': '📈',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AddTransactionScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const db = useDatabase();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const transaccionId = route.params?.transaccionId as string | undefined;

  const { catIngreso, catEgreso, conceptosPor, loading: loadingCats } = useCategorias();

  const [tipo, setTipo]               = useState<TipoTransaccion>('egreso');
  const [monto, setMonto]             = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [conceptoId, setConceptoId]   = useState<string | null>(null);
  const [conceptos, setConceptos]     = useState<{ id_local: string; nombre: string }[]>([]);
  const [fecha, setFecha]             = useState(todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [metodoPago, setMetodoPago]   = useState<'virtual' | 'efectivo'>('virtual');
  const [nota, setNota]               = useState('');
  const [fotoUri, setFotoUri]         = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [isEditing, setIsEditing]     = useState(false);

  // Animaciones
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleError = (msg: string) => {
    triggerShake();
    Alert.alert('¡Ups!', msg);
  };

  // Cargar datos si estamos en modo edición
  useEffect(() => {
    if (transaccionId) {
      setIsEditing(true);
      getTransaccionById(db, transaccionId).then(t => {
        if (t) {
          setTipo(t.tipo);
          setMonto(t.monto_real.toString());
          setCategoriaId(t.tipo === 'ingreso' ? t.categoria_ingreso_id : t.categoria_egreso_id);
          setConceptoId(t.concepto_detalle_id);
          setFecha(t.fecha);
          setMetodoPago(t.metodo_pago || 'virtual');
          setNota(t.nota || '');
          setFotoUri(t.foto_uri || null);
        }
      });
    } else {
      setIsEditing(false);
    }
  }, [transaccionId, db]);

  // Cuando cambia la categoría seleccionada, cargar sus conceptos
  useEffect(() => {
    if (tipo === 'egreso' && categoriaId) {
      conceptosPor(categoriaId).then(setConceptos);
    } else {
      setConceptos([]);
    }
    // No blanquear conceptoId si estamos en edición y el concepto pertenece a la categoría
    if (!isEditing) setConceptoId(null);
  }, [categoriaId, tipo, conceptosPor, isEditing]);

  const handleTipoChange = (t: TipoTransaccion) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    setTipo(t);
    setCategoriaId(null);
    setConceptoId(null);
  };

  // Convertir a CategoryOption para el picker
  const cats: CategoryOption[] =
    tipo === 'ingreso'
      ? catIngreso.map((c) => ({ id: c.id_local, nombre: c.nombre, emoji: EMOJI_INGRESO[c.nombre] ?? '💰' }))
      : catEgreso.map((c)  => ({ id: c.id_local, nombre: c.nombre, emoji: EMOJI_EGRESO[c.nombre]  ?? '📁' }));

  const accentColor = tipo === 'ingreso' ? colors.income : colors.expense;
  const montoNum    = parseFloat(monto) || 0;
  const canSave     = montoNum > 0 && categoriaId !== null;

  const handleGuardar = async () => {
    if (saving) return;

    if (montoNum <= 0) {
      return handleError('¡Ups! Parece que olvidaste poner el monto 💸');
    }
    if (!categoriaId) {
      return handleError('¡Ey! Necesitamos saber la categoría 😅');
    }

    setSaving(true);
    try {
      const data = {
        tipo,
        fecha,
        categoria_ingreso_id: tipo === 'ingreso' ? categoriaId : null,
        categoria_egreso_id:  tipo === 'egreso'  ? categoriaId : null,
        concepto_detalle_id:  conceptoId,
        monto_real:           montoNum,
        nota: nota.trim() || null,
        foto_uri:             fotoUri,
        metodo_pago:          metodoPago,
      };

      if (isEditing && transaccionId) {
        await updateTransaccion(db, transaccionId, data);
      } else {
        await insertTransaccion(db, data as any);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const netState = await NetInfo.fetch();
      const message = `${tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} de ${formatCurrency(montoNum)} ${isEditing ? 'actualizado' : 'registrado'}.`;

      if (netState.isConnected) {
        Alert.alert('✅ Éxito', message, [{ text: 'OK', onPress: () => {
          if (isEditing) navigation.goBack(); else resetForm();
        } }]);
      } else {
        Alert.alert('✅ Éxito', message, [{
          text: 'OK',
          onPress: () => {
            if (isEditing) navigation.goBack(); else resetForm();
            setTimeout(() => {
              Alert.alert('Modo sin conexión', 'Se sincronizará cuando haya conexión.');
            }, 1000);
          }
        }]);
      }

    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar la transacción.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = () => {
    Alert.alert('Eliminar transacción', '¿Estás seguro que deseas eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        if (!transaccionId) return;
        setSaving(true);
        try {
          await deleteTransaccion(db, transaccionId);
          navigation.goBack();
        } catch (e: any) {
          Alert.alert('Error', e?.message ?? 'No se pudo eliminar.');
        } finally {
          setSaving(false);
        }
      }}
    ]);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para subir fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFecha(selectedDate.toISOString().split('T')[0]);
    }
  };

  const resetForm = () => {
    setMonto('');
    setCategoriaId(null);
    setConceptoId(null);
    setNota('');
    setFotoUri(null);
    setMetodoPago('virtual');
    setFecha(todayISO());
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between' }]}>
          {isEditing && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
              <Text style={{ color: colors.primary, fontSize: FontSize.md }}>← Volver</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, !isEditing && { flex: 1, textAlign: 'center' }]}>
            {isEditing ? 'Editar transacción' : 'Nueva transacción'}
          </Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleEliminar} style={{ padding: 10 }}>
              <Text style={{ color: colors.expense, fontSize: FontSize.md }}>🗑 Borrar</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
        </View>

        {/* Toggle */}
        <TypeToggle value={tipo} onChange={handleTipoChange} />
        
        {/* Toggle Método de Pago */}
        <View style={styles.walletToggleContainer}>
          <TouchableOpacity 
            style={[styles.walletToggleBtn, metodoPago === 'virtual' && styles.walletToggleBtnActive]}
            onPress={() => setMetodoPago('virtual')}
            activeOpacity={0.7}
          >
            <Text style={[styles.walletToggleText, metodoPago === 'virtual' && { color: accentColor }]}>💳 Virtual</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.walletToggleBtn, metodoPago === 'efectivo' && styles.walletToggleBtnActive]}
            onPress={() => setMetodoPago('efectivo')}
            activeOpacity={0.7}
          >
            <Text style={[styles.walletToggleText, metodoPago === 'efectivo' && { color: accentColor }]}>💵 Efectivo</Text>
          </TouchableOpacity>
        </View>

        {/* Monto display */}
        <Animated.View style={[styles.amountDisplay, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.currency}>S/</Text>
          <TextInput
            style={[styles.amountText, { color: accentColor, minWidth: 100 }]}
            value={monto}
            onChangeText={(text) => {
              // Permitir solo números y un punto decimal
              const filtered = text.replace(/[^0-9.]/g, '');
              if ((filtered.match(/\./g) || []).length <= 1) {
                setMonto(filtered);
              }
            }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
          />
        </Animated.View>

        {/* Categorías */}
        {loadingCats ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.md }} />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Categoría</Text>
            </View>
            <CategoryPicker
              options={cats}
              selected={categoriaId}
              onSelect={setCategoriaId}
              accentColor={accentColor}
            />
          </>
        )}

        {/* Conceptos */}
        {tipo === 'egreso' && categoriaId && (
          <View style={styles.conceptoSection}>
            <Text style={[styles.sectionLabel, { paddingHorizontal: Spacing.md }]}>
              Concepto
            </Text>
            {conceptos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.conceptoRow}
              >
                {conceptos.map((c) => (
                  <TouchableOpacity
                    key={c.id_local}
                    style={[
                      styles.conceptoChip,
                      conceptoId === c.id_local && {
                        backgroundColor: accentColor + '20',
                        borderColor: accentColor,
                      },
                    ]}
                    onPress={() => setConceptoId(c.id_local)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.conceptoText,
                        conceptoId === c.id_local && { color: accentColor, fontWeight: FontWeight.semibold },
                      ]}
                    >
                      {c.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              /* Catálogo abierto — campo de texto libre */
              <TextInput
                style={styles.notaInput}
                placeholder="Escribe el concepto…"
                placeholderTextColor={colors.textMuted}
                value={nota}
                onChangeText={setNota}
                maxLength={500}
              />
            )}
          </View>
        )}

        {/* Fecha + nota */}
        <View style={styles.metaRow}>
          <TouchableOpacity style={styles.metaChip} activeOpacity={0.7} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.metaIcon}>📅</Text>
            <Text style={styles.metaLabel}>{formatDateLabel(fecha)}</Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={new Date(fecha + 'T00:00:00')}
              mode="date"
              display="default"
              onChange={onChangeDate}
              maximumDate={new Date()}
            />
          )}

          {!(tipo === 'egreso' && categoriaId && conceptos.length === 0) && (
            <TextInput
              style={styles.notaInline}
              placeholder="Nota (opcional)"
              placeholderTextColor={colors.textMuted}
              value={nota}
              onChangeText={setNota}
              maxLength={500}
            />
          )}
        </View>

        {/* Foto Picker */}
        <View style={styles.photoContainer}>
          {fotoUri ? (
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: fotoUri }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => setFotoUri(null)}>
                <Text style={styles.photoDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.7}>
              <Text style={styles.photoBtnIcon}>📸</Text>
              <Text style={styles.photoBtnText}>Adjuntar foto</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botón guardar */}
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <TouchableOpacity
            onPress={handleGuardar}
            disabled={saving}
            activeOpacity={0.85}
            style={styles.saveWrapper}
          >
            <LinearGradient
              colors={
                canSave
                  ? tipo === 'ingreso'
                    ? ['#00C896', '#00a87a']
                    : ['#FF5C5C', '#d94040']
                  : [colors.bgCardAlt, colors.bgCardAlt]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtn}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.saveBtnText, !canSave && { color: colors.textMuted }]}>
                  {canSave ? `Guardar ${tipo}` : 'Selecciona categoría y monto'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  scroll:  { flex: 1 },
  content: { gap: Spacing.md, paddingVertical: Spacing.md },

  header:      { paddingHorizontal: Spacing.md, alignItems: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  dateText: { color: colors.textSecondary, fontSize: FontSize.md },

  walletToggleContainer: { flexDirection: 'row', backgroundColor: colors.bgInput, borderRadius: Radius.md, padding: 4, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  walletToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.sm },
  walletToggleBtnActive: { backgroundColor: colors.bgCard },
  walletToggleText: { color: colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  amountDisplay: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  currency:      { color: colors.textSecondary, fontSize: FontSize.xl, fontWeight: FontWeight.medium, marginBottom: 8 },
  amountText:    { fontSize: 56, fontWeight: FontWeight.bold, letterSpacing: -2 },

  section:      { paddingHorizontal: Spacing.md },
  sectionLabel: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.xs },

  conceptoSection: { gap: Spacing.xs },
  conceptoRow:     { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  conceptoChip:    { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: colors.bgCardAlt, borderWidth: 1.5, borderColor: colors.border },
  conceptoText:    { color: colors.textSecondary, fontSize: FontSize.sm },

  notaInput: { marginHorizontal: Spacing.md, backgroundColor: colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: FontSize.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },

  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  metaChip:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: colors.bgCardAlt, borderRadius: Radius.full, borderWidth: 1, borderColor: colors.border, paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md },
  metaIcon:  { fontSize: 14 },
  metaLabel: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  notaInline:{ flex: 1, backgroundColor: colors.bgInput, borderRadius: Radius.full, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: FontSize.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2 },

  saveWrapper: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radius.full, overflow: 'hidden', shadowColor: colors.expense, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  saveBtn:     { paddingVertical: Spacing.md + 2, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: 0.3 },

  photoContainer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'flex-start' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  photoBtnIcon: { fontSize: 16 },
  photoBtnText: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  photoPreviewWrapper: { position: 'relative', borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  photoPreview: { width: 120, height: 160, borderRadius: Radius.md, resizeMode: 'cover' },
  photoDeleteBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  photoDeleteText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
