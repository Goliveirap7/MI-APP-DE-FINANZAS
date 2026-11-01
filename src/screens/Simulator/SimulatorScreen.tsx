import React, { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useResumenMensual } from '../../hooks/useResumenMensual';
import { formatCurrency, mesActualISO } from '../../utils/format';
import { triggerSoftTap } from '../../utils/haptics';

interface SimulatedItem {
  id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion: string;
}

export default function SimulatorScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<any>();

  // Saldo real actual
  const { patrimonio } = useResumenMensual(mesActualISO());
  const actualBalance = patrimonio?.disponible ?? 0;

  // Estado del simulador
  const [baseBalance, setBaseBalance] = useState<number | null>(null);
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [customBaseText, setCustomBaseText] = useState('');

  const currentBase = baseBalance !== null ? baseBalance : actualBalance;

  // Formulario de nuevo movimiento simulado
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('egreso');
  const [montoText, setMontoText] = useState('');
  const [descText, setDescText] = useState('');

  // Lista de movimientos simulados
  const [items, setItems] = useState<SimulatedItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar borrador persistido desde AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@aphelios_simulator_draft');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.baseBalance !== undefined) setBaseBalance(parsed.baseBalance);
          if (Array.isArray(parsed.items)) setItems(parsed.items);
        }
      } catch (e) {
        console.warn('[SimulatorScreen] Error leyendo borrador local:', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Guardar automáticamente cambios en AsyncStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (baseBalance === null && items.length === 0) {
        AsyncStorage.removeItem('@aphelios_simulator_draft');
      } else {
        AsyncStorage.setItem('@aphelios_simulator_draft', JSON.stringify({ baseBalance, items }));
      }
    } catch (e) {
      console.warn('[SimulatorScreen] Error persistiendo borrador:', e);
    }
  }, [baseBalance, items, isLoaded]);

  // Cálculos proyectados
  const totalSimIngresos = useMemo(() => {
    return items.filter(i => i.tipo === 'ingreso').reduce((acc, curr) => acc + curr.monto, 0);
  }, [items]);

  const totalSimEgresos = useMemo(() => {
    return items.filter(i => i.tipo === 'egreso').reduce((acc, curr) => acc + curr.monto, 0);
  }, [items]);

  const netChange = totalSimIngresos - totalSimEgresos;
  const projectedBalance = currentBase + netChange;

  const handleAddItem = (tipoOverride?: 'ingreso' | 'egreso', montoOverride?: number, descOverride?: string) => {
    triggerSoftTap();
    const finalTipo = tipoOverride || tipo;
    const finalMonto = montoOverride !== undefined ? montoOverride : parseFloat(montoText);
    const finalDesc = descOverride !== undefined ? descOverride : descText.trim() || (finalTipo === 'ingreso' ? 'Ingreso simulado' : 'Gasto simulado');

    if (isNaN(finalMonto) || finalMonto <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a 0 para simular.');
      return;
    }

    const newItem: SimulatedItem = {
      id: Math.random().toString(36).substring(2, 9),
      tipo: finalTipo,
      monto: finalMonto,
      descripcion: finalDesc,
    };

    setItems(prev => [newItem, ...prev]);
    if (montoOverride === undefined) {
      setMontoText('');
      setDescText('');
    }
  };

  const handleRemoveItem = (id: string) => {
    triggerSoftTap();
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleReset = () => {
    triggerSoftTap();
    Alert.alert(
      'Reiniciar simulación',
      '¿Deseas borrar todos los movimientos simulados y volver a tu saldo real actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: async () => {
            setItems([]);
            setBaseBalance(null);
            setIsEditingBase(false);
            setCustomBaseText('');
            setMontoText('');
            setDescText('');
            try {
              await AsyncStorage.removeItem('@aphelios_simulator_draft');
            } catch (e) {}
          },
        },
      ]
    );
  };

  const handleSaveCustomBase = () => {
    triggerSoftTap();
    const parsed = parseFloat(customBaseText);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Monto inválido', 'Ingresa un saldo base válido.');
      return;
    }
    setBaseBalance(parsed);
    setIsEditingBase(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            triggerSoftTap();
            navigation.goBack();
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Simulador Financiero</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
          <Text style={styles.resetText}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── BANNER EXPLICATIVO ── */}
        <View style={styles.sandboxBanner}>
          <Text style={styles.sandboxIcon}>🛡️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sandboxTitle}>Modo Sandbox Aislado</Text>
            <Text style={styles.sandboxSub}>
              Los cambios en esta pantalla son 100% hipotéticos. No afectan tus bancos, ni presupuestos, ni tu base de datos.
            </Text>
          </View>
        </View>

        {/* ── TARJETA HERO: SALDO PROYECTADO ── */}
        <LinearGradient
          colors={projectedBalance >= 0 ? ['#0d3d2e', '#112240'] : ['#5a1818', '#260a0a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroLabel}>Saldo Proyectado</Text>
          <Text
            style={[
              styles.heroAmount,
              { color: projectedBalance >= 0 ? '#ffffff' : colors.expense },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(projectedBalance)}
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Saldo Base Inicial</Text>
              <Text style={styles.heroStatValue}>{formatCurrency(currentBase)}</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Impacto Neto</Text>
              <Text
                style={[
                  styles.heroStatValue,
                  { color: netChange >= 0 ? colors.income : colors.expense, fontWeight: FontWeight.bold },
                ]}
              >
                {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
              </Text>
            </View>
          </View>

          {/* Ajustar saldo base opcional */}
          {isEditingBase ? (
            <View style={styles.customBaseRow}>
              <TextInput
                style={styles.customBaseInput}
                placeholder="Ej: 5000"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={customBaseText}
                onChangeText={setCustomBaseText}
                autoFocus
              />
              <TouchableOpacity style={styles.customBaseSaveBtn} onPress={handleSaveCustomBase}>
                <Text style={{ color: '#fff', fontWeight: FontWeight.bold }}>Aplicar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customBaseCancelBtn}
                onPress={() => setIsEditingBase(false)}
              >
                <Text style={{ color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.customBaseToggle}
              onPress={() => {
                triggerSoftTap();
                setCustomBaseText(currentBase.toString());
                setIsEditingBase(true);
              }}
            >
              <Text style={styles.customBaseToggleText}>
                ✏️ {baseBalance !== null ? 'Saldo base personalizado (editar)' : 'Tomando saldo real actual (toca para cambiar base)'}
              </Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* ── BOTONES DE ACCIÓN RÁPIDA (PRESETS) ── */}
        <Text style={styles.sectionTitle}>Simulaciones rápidas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
          <TouchableOpacity
            style={[styles.presetBtn, { borderColor: colors.income + '50' }]}
            onPress={() => handleAddItem('ingreso', 500, 'Bono extra')}
          >
            <Text style={[styles.presetText, { color: colors.income }]}>+ S/ 500 Bono</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, { borderColor: colors.income + '50' }]}
            onPress={() => handleAddItem('ingreso', 1000, 'Sueldo extra')}
          >
            <Text style={[styles.presetText, { color: colors.income }]}>+ S/ 1,000 Sueldo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, { borderColor: colors.expense + '50' }]}
            onPress={() => handleAddItem('egreso', 150, 'Salida fin de semana')}
          >
            <Text style={[styles.presetText, { color: colors.expense }]}>− S/ 150 Salida</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, { borderColor: colors.expense + '50' }]}
            onPress={() => handleAddItem('egreso', 500, 'Compra electrodoméstico')}
          >
            <Text style={[styles.presetText, { color: colors.expense }]}>− S/ 500 Compra</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, { borderColor: colors.expense + '50' }]}
            onPress={() => handleAddItem('egreso', 1000, 'Viaje/Vacaciones')}
          >
            <Text style={[styles.presetText, { color: colors.expense }]}>− S/ 1,000 Viaje</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── FORMULARIO PERSONALIZADO ── */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Agregar movimiento simulado</Text>

          {/* Toggle tipo */}
          <View style={styles.typeToggleRow}>
            <TouchableOpacity
              style={[styles.typeBtn, tipo === 'egreso' && styles.typeBtnActiveExpense]}
              onPress={() => {
                triggerSoftTap();
                setTipo('egreso');
              }}
            >
              <Text style={[styles.typeBtnText, tipo === 'egreso' && { color: '#fff', fontWeight: FontWeight.bold }]}>
                📉 Simular Gasto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, tipo === 'ingreso' && styles.typeBtnActiveIncome]}
              onPress={() => {
                triggerSoftTap();
                setTipo('ingreso');
              }}
            >
              <Text style={[styles.typeBtnText, tipo === 'ingreso' && { color: '#fff', fontWeight: FontWeight.bold }]}>
                📈 Simular Ingreso
              </Text>
            </TouchableOpacity>
          </View>

          {/* Monto y concepto */}
          <TextInput
            style={styles.input}
            placeholder="S/ 0.00 (Monto a simular)"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={montoText}
            onChangeText={setMontoText}
          />

          <TextInput
            style={styles.input}
            placeholder="Descripción (ej: Comprar zapatillas, Bono)"
            placeholderTextColor={colors.textMuted}
            value={descText}
            onChangeText={setDescText}
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: tipo === 'ingreso' ? colors.income : colors.expense },
            ]}
            activeOpacity={0.8}
            onPress={() => handleAddItem()}
          >
            <Text style={styles.submitBtnText}>
              {tipo === 'ingreso' ? '+ Añadir Ingreso a Simulación' : '− Añadir Gasto a Simulación'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── LISTADO DE MOVIMIENTOS SIMULADOS ── */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>
            Movimientos simulados ({items.length})
          </Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={() => setItems([])}>
              <Text style={{ color: colors.expense, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }}>
                Vaciar lista
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Sin movimientos simulados</Text>
            <Text style={styles.emptySub}>
              Usa los botones rápidos o el formulario de arriba para proyectar cómo cambiaría tu saldo ante futuros gastos o ingresos.
            </Text>
          </View>
        ) : (
          <View style={styles.itemsListCard}>
            {items.map((item, idx) => (
              <View key={item.id}>
                <View style={styles.itemRow}>
                  <View
                    style={[
                      styles.itemIconBadge,
                      {
                        backgroundColor:
                          item.tipo === 'ingreso' ? colors.income + '20' : colors.expense + '20',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>
                      {item.tipo === 'ingreso' ? '⬆️' : '⬇️'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <Text style={styles.itemDesc} numberOfLines={1}>
                      {item.descripcion}
                    </Text>
                    <Text style={styles.itemType}>
                      {item.tipo === 'ingreso' ? 'Ingreso simulado' : 'Gasto simulado'}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.itemAmount,
                      { color: item.tipo === 'ingreso' ? colors.income : colors.expense },
                    ]}
                  >
                    {item.tipo === 'ingreso' ? '+' : '−'}
                    {formatCurrency(item.monto)}
                  </Text>

                  <TouchableOpacity
                    style={styles.itemDeleteBtn}
                    onPress={() => handleRemoveItem(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>
                {idx < items.length - 1 && <View style={styles.itemDivider} />}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: Spacing.xs },
    backText: { color: colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    headerTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    resetBtn: { padding: Spacing.xs },
    resetText: { color: colors.expense, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

    scroll: { flex: 1 },
    content: { padding: Spacing.md },

    sandboxBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: colors.bgCardAlt,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.md,
    },
    sandboxIcon: { fontSize: 24 },
    sandboxTitle: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    sandboxSub: { color: colors.textSecondary, fontSize: FontSize.xs, lineHeight: 16, marginTop: 2 },

    heroCard: {
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    heroAmount: { fontSize: 32, fontWeight: FontWeight.bold, marginVertical: Spacing.xs },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderRadius: Radius.md,
      padding: Spacing.sm + 2,
      marginTop: Spacing.sm,
    },
    heroStatItem: { flex: 1, alignItems: 'center' },
    heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
    heroStatValue: { color: '#ffffff', fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginTop: 2 },
    heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

    customBaseToggle: { marginTop: Spacing.md, alignSelf: 'center' },
    customBaseToggleText: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, textDecorationLine: 'underline' },
    customBaseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
    customBaseInput: {
      flex: 1,
      backgroundColor: colors.bgInput,
      color: colors.textPrimary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderRadius: Radius.sm,
      fontSize: FontSize.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    customBaseSaveBtn: { backgroundColor: colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.sm },
    customBaseCancelBtn: { paddingHorizontal: Spacing.xs },

    sectionTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    presetsRow: { gap: Spacing.sm, marginBottom: Spacing.lg },
    presetBtn: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
    },
    presetText: { fontSize: FontSize.xs + 1, fontWeight: FontWeight.semibold },

    formCard: {
      backgroundColor: colors.bgCard,
      borderRadius: Radius.xl,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.lg,
    },
    formTitle: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
    typeToggleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    typeBtn: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: colors.bgCardAlt,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeBtnActiveExpense: { backgroundColor: colors.expense, borderColor: colors.expense },
    typeBtnActiveIncome: { backgroundColor: colors.income, borderColor: colors.income },
    typeBtnText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
    input: {
      backgroundColor: colors.bgInput,
      color: colors.textPrimary,
      fontSize: FontSize.sm,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitBtn: {
      paddingVertical: Spacing.md,
      borderRadius: Radius.md,
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    submitBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

    listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    itemsListCard: {
      backgroundColor: colors.bgCard,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    itemRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
    itemIconBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
    itemDesc: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    itemType: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    itemAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginRight: Spacing.sm },
    itemDeleteBtn: { padding: Spacing.xs },
    itemDivider: { height: 1, backgroundColor: colors.border, marginLeft: 56 },

    emptyState: {
      padding: Spacing.xl,
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyIcon: { fontSize: 32, marginBottom: Spacing.xs },
    emptyTitle: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 4 },
    emptySub: { color: colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18 },
  });
