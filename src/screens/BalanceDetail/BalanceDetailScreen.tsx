import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useDatabase } from '../../db/database';
import { getHistorial, getHistorialTransferencias, insertTransaccion, type TransaccionLocal } from '../../db/repositories/transacciones';
import { getOrCreateCategoriaTransferencias } from '../../db/repositories/categorias';
import { useResumenMensual } from '../../hooks/useResumenMensual';
import { formatCurrency, formatDateMedium } from '../../utils/format';
import { useCategorias } from '../../hooks/useCategorias';
import { useTheme } from '../../context/ThemeContext';
import * as Crypto from 'expo-crypto';
import { triggerSoftTap } from '../../utils/haptics';
import { SyncEngine } from '../../db/sync/SyncEngine';
import { useWalletConfig, WalletItem } from '../../hooks/useWalletConfig';

export default function BalanceDetailScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const db = useDatabase();
  const navigation = useNavigation<any>();
  const { wallets, getWalletLabel, updateWalletLabel } = useWalletConfig();
  
  const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
  const { patrimonio, loading: loadingResumen, refetch } = useResumenMensual(currentMonth);
  const { catIngreso, catEgreso } = useCategorias();

  const [historial, setHistorial] = useState<TransaccionLocal[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [historyTab, setHistoryTab] = useState<'ingresos' | 'transferencias'>('ingresos');

  // Modals state
  const [showAdjustWarning, setShowAdjustWarning] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustWallet, setAdjustWallet] = useState('Alfin');
  const [adjustAmount, setAdjustAmount] = useState('');

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferOrigin, setTransferOrigin] = useState('Yape');
  const [transferDest, setTransferDest] = useState('Interbank');
  const [transferAmount, setTransferAmount] = useState('');

  // Modal editar nombre de banco / cuenta
  const [showEditWalletModal, setShowEditWalletModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletItem | null>(null);
  const [customWalletName, setCustomWalletName] = useState('');

  const [saving, setSaving] = useState(false);

  const loadHistory = React.useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const data = historyTab === 'transferencias'
        ? await getHistorialTransferencias(db, undefined, 50)
        : await getHistorial(db, 'ingreso', undefined, 50);
      setHistorial(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistorial(false);
    }
  }, [db, historyTab]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getCatName = (id: string | null) => {
    if (!id) return 'Sin categoría';
    const cIng = catIngreso.find(x => x.id_local === id);
    if (cIng) return cIng.nombre;
    const cEgr = catEgreso.find(x => x.id_local === id);
    if (cEgr) return cEgr.nombre;
    return 'Sin categoría';
  };

  const handleAdjust = async () => {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount < 0) return Alert.alert('Error', 'Ingresa un monto válido.');
    
    setSaving(true);
    try {
      const currentBalance = patrimonio?.billeteras_detalle?.[adjustWallet] || 0;
      const diff = amount - currentBalance;
      
      if (diff === 0) {
        setShowAdjust(false);
        return;
      }

      const tipo = diff > 0 ? 'ingreso' : 'egreso';
      const absDiff = Math.abs(diff);
      
      await insertTransaccion(db, {
        tipo,
        fecha: new Date().toISOString().split('T')[0],
        monto_real: absDiff,
        billetera: adjustWallet,
        metodo_pago: adjustWallet === 'Efectivo' ? 'efectivo' : 'virtual',
        nota: 'Reconciliación de saldo',
      } as any);

      new SyncEngine(db).pushToCloud();
      triggerSoftTap();
      setShowAdjust(false);
      setAdjustAmount('');
      refetch();
      loadHistory();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return Alert.alert('Error', 'Ingresa un monto válido.');
    if (transferOrigin === transferDest) return Alert.alert('Error', 'Las billeteras deben ser diferentes.');

    const originBalance = patrimonio?.billeteras_detalle?.[transferOrigin] || 0;
    if (Math.round(amount * 100) > Math.round(originBalance * 100)) {
      return Alert.alert('Saldo insuficiente', `Solo tienes S/ ${originBalance.toFixed(2)} en ${transferOrigin}.`);
    }
    
    setSaving(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const transferGroupId = `trf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const { egresoId, ingresoId } = await getOrCreateCategoriaTransferencias(db);
      
      // Egreso de origen
      await insertTransaccion(db, {
        tipo: 'egreso',
        fecha: date,
        monto_real: amount,
        billetera: transferOrigin,
        metodo_pago: transferOrigin === 'Efectivo' ? 'efectivo' : 'virtual',
        categoria_egreso_id: egresoId,
        nota: `Transferencia a ${transferDest} [ref:${transferGroupId}]`,
      } as any);

      // Ingreso a destino
      await insertTransaccion(db, {
        tipo: 'ingreso',
        fecha: date,
        monto_real: amount,
        billetera: transferDest,
        metodo_pago: transferDest === 'Efectivo' ? 'efectivo' : 'virtual',
        categoria_ingreso_id: ingresoId,
        nota: `Transferencia desde ${transferOrigin} [ref:${transferGroupId}]`,
      } as any);

      new SyncEngine(db).pushToCloud();
      triggerSoftTap();
      setShowTransfer(false);
      setTransferAmount('');
      refetch();
      loadHistory();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWalletName = async () => {
    if (!editingWallet) return;
    try {
      await updateWalletLabel(editingWallet.id, customWalletName);
      triggerSoftTap();
      setShowEditWalletModal(false);
      setEditingWallet(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar el nombre.');
    }
  };

  const renderWallet = (w: WalletItem) => {
    const balance = patrimonio?.billeteras_detalle?.[w.id] || 0;
    return (
      <View key={w.id} style={styles.walletCard}>
        <View style={styles.walletRow}>
          <View style={[styles.walletIconWrapper, { backgroundColor: w.color + '20' }]}>
            <Text style={styles.walletIcon}>{w.icon}</Text>
          </View>
          <View style={styles.walletInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.walletLabel}>{w.label}</Text>
              <TouchableOpacity
                onPress={() => {
                  triggerSoftTap();
                  setEditingWallet(w);
                  setCustomWalletName(w.label);
                  setShowEditWalletModal(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.walletEditBtn}
              >
                <Text style={styles.walletEditIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.walletAmount}>{formatCurrency(balance)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { triggerSoftTap(); navigation.goBack(); }} style={{ padding: 10 }}>
          <Text style={{ color: colors.primary, fontSize: FontSize.md }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Saldo</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {/* ACTIONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowTransfer(true)}>
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionText}>Transferir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { triggerSoftTap(); setShowAdjustWarning(true); }}>
            <Text style={styles.actionIcon}>⚖️</Text>
            <Text style={styles.actionText}>Ajustar Saldo</Text>
          </TouchableOpacity>
        </View>

        {loadingResumen ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.xl }} />
        ) : (
          <>
            {/* VIRTUAL WALLETS */}
            <Text style={styles.sectionTitle}>Billeteras Virtuales y Bancos</Text>
            <View style={styles.walletsGrid}>
              {wallets.filter(w => w.isVirtual).map(renderWallet)}
            </View>

            {/* PHYSICAL WALLET */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Billetera Física</Text>
            <View style={styles.walletsGrid}>
              {wallets.filter(w => !w.isVirtual).map(renderWallet)}
            </View>
          </>
        )}

        {/* HISTORIAL */}
        <View style={[styles.historySection, { marginTop: Spacing.xl }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: Radius.full, padding: 3, borderWidth: 1, borderColor: colors.border }}>
              <TouchableOpacity
                onPress={() => { triggerSoftTap(); setHistoryTab('ingresos'); }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: Radius.full,
                  backgroundColor: historyTab === 'ingresos' ? colors.primary : 'transparent',
                }}
              >
                <Text style={{
                  color: historyTab === 'ingresos' ? '#ffffff' : colors.textSecondary,
                  fontSize: FontSize.sm,
                  fontWeight: FontWeight.semibold
                }}>
                  💰 Ingresos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { triggerSoftTap(); setHistoryTab('transferencias'); }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: Radius.full,
                  backgroundColor: historyTab === 'transferencias' ? colors.primary : 'transparent',
                }}
              >
                <Text style={{
                  color: historyTab === 'transferencias' ? '#ffffff' : colors.textSecondary,
                  fontSize: FontSize.sm,
                  fontWeight: FontWeight.semibold
                }}>
                  🔄 Transferencias
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {loadingHistorial ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : historial.length > 0 ? (
            <View style={styles.listContainer}>
              {historial.map((tx, idx) => {
                const isTransfer = historyTab === 'transferencias';
                const cleanNote = (tx.nota || '').replace(/\[ref:[^\]]+\]/, '').trim();
                return (
                  <View key={tx.id_local}>
                    <TouchableOpacity 
                      style={styles.txRow}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('TransactionDetail', { transaccionId: tx.id_local })}
                    >
                      <View style={[styles.txIconWrapper, isTransfer && { backgroundColor: 'rgba(0, 210, 180, 0.15)' }]}>
                        <Text style={styles.txIcon}>
                          {isTransfer ? '🔄' : (tx.metodo_pago === 'efectivo' ? '💵' : '💳')}
                        </Text>
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txCat}>
                          {isTransfer ? (cleanNote || 'Transferencia entre cuentas') : getCatName(tx.categoria_ingreso_id)}
                        </Text>
                        <Text style={styles.txDate}>{formatDateMedium(tx.fecha)}</Text>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={[styles.txAmount, isTransfer && { color: colors.primary }]}>
                          {isTransfer ? '' : '+'}{formatCurrency(tx.monto_real)}
                        </Text>
                        <Text style={styles.txMethod}>{getWalletLabel(tx.billetera)}</Text>
                      </View>
                    </TouchableOpacity>
                    {idx < historial.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {historyTab === 'ingresos' ? 'Aún no hay ingresos registrados.' : 'Aún no hay transferencias registradas.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL ADVERTENCIA ANTES DE AJUSTAR SALDO */}
      <Modal visible={showAdjustWarning} transparent animationType="fade" onRequestClose={() => setShowAdjustWarning(false)}>
        <View style={styles.modalBgCenter}>
          <View style={styles.modalCardCenter}>
            <Text style={styles.warningIcon}>💡</Text>
            <Text style={styles.modalTitleCenter}>¿Olvidaste registrar algún movimiento?</Text>
            <Text style={styles.modalSubCenter}>
              Si detectas una diferencia en tu saldo porque olvidaste anotar un ingreso o egreso, te recomendamos registrarlo con su fecha respectiva para que tus estadísticas mensuales y presupuestos sean precisos.
            </Text>
            <Text style={[styles.modalSubCenter, { fontSize: FontSize.xs, color: colors.textMuted, marginTop: Spacing.xs }]}>
              En caso de no recordar o no tener mapeado el motivo, puedes proceder con una reconciliación de saldo sin alterar tus gastos presupuestados del mes.
            </Text>

            <View style={styles.modalActionsCol}>
              <TouchableOpacity
                style={styles.modalBtnProceed}
                activeOpacity={0.8}
                onPress={() => {
                  triggerSoftTap();
                  setShowAdjustWarning(false);
                  setShowAdjust(true);
                }}
              >
                <Text style={styles.modalBtnTextProceed}>Proceder de todos modos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnCancelCenter}
                activeOpacity={0.7}
                onPress={() => {
                  triggerSoftTap();
                  setShowAdjustWarning(false);
                }}
              >
                <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL AJUSTE */}
      <Modal visible={showAdjust} transparent animationType="slide" onRequestClose={() => setShowAdjust(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalBg}
        >
          <TouchableWithoutFeedback onPress={() => setShowAdjust(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Ajustar Saldo</Text>
              <Text style={styles.modalSub}>Actualiza el saldo real de tu cuenta.</Text>
              
              <View style={styles.modalWallets}>
                {wallets.map(w => (
                  <TouchableOpacity 
                    key={w.id} 
                    style={[styles.modalWalletBtn, adjustWallet === w.id && { borderColor: w.color, backgroundColor: w.color + '10' }]}
                    onPress={() => setAdjustWallet(w.id)}
                  >
                    <Text style={[styles.modalWalletText, adjustWallet === w.id && { color: w.color }]}>{w.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="S/ 0.00 (Nuevo saldo real)"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={adjustAmount}
                onChangeText={setAdjustAmount}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowAdjust(false)}>
                  <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleAdjust} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnTextConfirm}>Ajustar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL TRANSFERENCIA */}
      <Modal visible={showTransfer} transparent animationType="slide" onRequestClose={() => setShowTransfer(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalBg}
        >
          <TouchableWithoutFeedback onPress={() => setShowTransfer(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Transferir Saldo</Text>
              
              <Text style={styles.modalLabel}>Desde:</Text>
              <View style={styles.modalWallets}>
                {wallets.map(w => (
                  <TouchableOpacity 
                    key={'orig'+w.id} 
                    style={[styles.modalWalletBtn, transferOrigin === w.id && { borderColor: w.color, backgroundColor: w.color + '10' }]}
                    onPress={() => setTransferOrigin(w.id)}
                  >
                    <Text style={[styles.modalWalletText, transferOrigin === w.id && { color: w.color }]}>{w.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Hacia:</Text>
              <View style={styles.modalWallets}>
                {wallets.map(w => (
                  <TouchableOpacity 
                    key={'dest'+w.id} 
                    style={[styles.modalWalletBtn, transferDest === w.id && { borderColor: w.color, backgroundColor: w.color + '10' }]}
                    onPress={() => setTransferDest(w.id)}
                  >
                    <Text style={[styles.modalWalletText, transferDest === w.id && { color: w.color }]}>{w.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="S/ 0.00 (Monto a transferir)"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={transferAmount}
                onChangeText={setTransferAmount}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowTransfer(false)}>
                  <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleTransfer} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnTextConfirm}>Transferir</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL EDITAR NOMBRE DE BANCO / CUENTA LOCAL */}
      <Modal visible={showEditWalletModal} transparent animationType="slide" onRequestClose={() => { setShowEditWalletModal(false); setEditingWallet(null); }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalBg}
        >
          <TouchableWithoutFeedback onPress={() => { setShowEditWalletModal(false); setEditingWallet(null); }}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Editar Nombre del Banco</Text>
              <Text style={styles.modalSub}>
                Personaliza el nombre de esta cuenta para adaptarlo al banco que usas (ej. BCP, BBVA, Scotiabank). Este cambio es solo local para tu cuenta.
              </Text>

              <Text style={styles.modalLabel}>Nombre local para "{editingWallet?.id}"</Text>
              <TextInput
                style={styles.input}
                placeholder="Escribe el nombre de tu banco"
                placeholderTextColor={colors.textMuted}
                value={customWalletName}
                onChangeText={setCustomWalletName}
                autoCapitalize="words"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalBtnCancel} 
                  onPress={() => {
                    setShowEditWalletModal(false);
                    setEditingWallet(null);
                  }}
                >
                  <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalBtnConfirm} 
                  onPress={handleSaveWalletName}
                >
                  <Text style={styles.modalBtnTextConfirm}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  actionsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  actionBtn: { flex: 1, flexDirection: 'row', backgroundColor: colors.bgCard, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  actionIcon: { fontSize: 18 },
  actionText: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  sectionTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.md, marginLeft: Spacing.xs },
  
  walletsGrid: { gap: Spacing.sm },
  walletCard: { backgroundColor: colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: colors.border },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  walletIconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  walletIcon: { fontSize: 22 },
  walletInfo: { flex: 1 },
  walletLabel: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: 2 },
  walletEditBtn: { padding: 4, borderRadius: Radius.sm, backgroundColor: colors.bgInput, opacity: 0.8 },
  walletEditIcon: { fontSize: 13 },
  walletAmount: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  historySection: { marginTop: Spacing.sm },
  listContainer: { backgroundColor: colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  txIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgInput, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  txIcon: { fontSize: 18 },
  txInfo: { flex: 1, justifyContent: 'center' },
  txCat: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: 2 },
  txDate: { color: colors.textSecondary, fontSize: FontSize.xs },
  txRight: { alignItems: 'flex-end' },
  txAmount: { color: colors.income, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 2 },
  txMethod: { color: colors.textMuted, fontSize: FontSize.xs, textTransform: 'capitalize' },

  divider: { height: 1, backgroundColor: colors.border, marginLeft: 72 },
  emptyState: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: FontSize.md },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bg, padding: Spacing.xl, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '85%' },
  modalTitle: { color: colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  modalSub: { color: colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.lg },
  modalLabel: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  modalWallets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  modalWalletBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard },
  modalWalletText: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  input: { backgroundColor: colors.bgInput, color: colors.textPrimary, fontSize: FontSize.md, borderRadius: Radius.md, padding: Spacing.md, marginVertical: Spacing.md, borderWidth: 1, borderColor: colors.border },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  modalBtnCancel: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: colors.bgInput, alignItems: 'center' },
  modalBtnConfirm: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  modalBtnTextCancel: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  modalBtnTextConfirm: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  // Center warning modal
  modalBgCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalCardCenter: { backgroundColor: colors.bgCard, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  warningIcon: { fontSize: 36, marginBottom: Spacing.sm },
  modalTitleCenter: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', marginBottom: Spacing.sm },
  modalSubCenter: { color: colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  modalActionsCol: { width: '100%', marginTop: Spacing.xl, gap: Spacing.sm },
  modalBtnProceed: { backgroundColor: colors.primary, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center', width: '100%' },
  modalBtnTextProceed: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  modalBtnCancelCenter: { backgroundColor: colors.bgCardAlt, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: colors.border },
});
