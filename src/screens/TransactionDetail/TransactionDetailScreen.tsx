import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { triggerSoftTap } from '../../utils/haptics';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useDatabase } from '../../db/database';
import { getTransaccionById, deleteTransaccion, TransaccionLocal } from '../../db/repositories/transacciones';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';
import { useWalletConfig } from '../../hooks/useWalletConfig';
import { SyncEngine } from '../../db/sync/SyncEngine';

function formatDateLabel(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date  = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function TransactionDetailScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const db = useDatabase();
  const { getWalletLabel } = useWalletConfig();
  const { transaccionId } = route.params;

  const [tx, setTx] = useState<TransaccionLocal | null>(null);
  const [loading, setLoading] = useState(true);

  // Recargar al hacer focus por si venimos de editarla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTx();
    });
    loadTx();
    return unsubscribe;
  }, [navigation, transaccionId, db]);

  const loadTx = async () => {
    setLoading(true);
    const data = await getTransaccionById(db, transaccionId);
    setTx(data);
    setLoading(false);
  };

  const isTransfer = !!(tx?.nota && (tx.nota.includes('Transferencia') || tx.nota.includes('[ref:')));
  const isIngreso = tx?.tipo === 'ingreso';
  const accentColor = isTransfer ? colors.primary : (isIngreso ? colors.income : colors.expense);

  let transferOrigin = tx?.billetera || '';
  let transferDest = '';
  if (tx?.nota?.includes('Transferencia a ')) {
    transferDest = tx.nota.replace(/Transferencia a /, '').replace(/\[ref:[^\]]+\]/, '').trim();
  } else if (tx?.nota?.includes('Transferencia desde ')) {
    transferOrigin = tx.nota.replace(/Transferencia desde /, '').replace(/\[ref:[^\]]+\]/, '').trim();
    transferDest = tx.billetera;
  }

  const cleanNote = (tx?.nota || '').replace(/\[ref:[^\]]+\]/, '').trim();

  const handleDelete = () => {
    if (!tx) return;
    triggerSoftTap();
    Alert.alert(
      isTransfer ? 'Eliminar transferencia' : 'Eliminar transacción',
      isTransfer 
        ? `¿Deseas revertir esta transferencia de S/ ${tx.monto_real.toFixed(2)}? Se actualizarán automáticamente los saldos de ambas cuentas.`
        : `¿Deseas eliminar este registro de S/ ${tx.monto_real.toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteTransaccion(db, tx.id_local);
              new SyncEngine(db).pushToCloud();
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e.message);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!tx) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { triggerSoftTap(); navigation.goBack(); }} style={{ padding: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Image source={require('../../../assets/flechas/izquierda.png')} style={{ width: 12, height: 12, tintColor: colors.primary }} resizeMode="contain" /><Text style={{ color: colors.primary, fontSize: FontSize.md }}>Volver</Text></View>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Transacción no encontrada.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { triggerSoftTap(); navigation.goBack(); }} style={{ padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Image source={require('../../../assets/flechas/izquierda.png')} style={{ width: 12, height: 12, tintColor: colors.primary }} resizeMode="contain" /><Text style={{ color: colors.primary, fontSize: FontSize.md }}>Volver</Text></View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isTransfer ? 'Transferencia' : 'Detalle'}</Text>
        {isTransfer ? (
          <TouchableOpacity onPress={handleDelete} style={{ padding: 10 }}>
            <Text style={{ color: colors.expense, fontSize: FontSize.md, fontWeight: 'bold' }}>Borrar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={() => navigation.navigate('AddTransaction', { transaccionId: tx.id_local })}
            style={{ padding: 10 }}
          >
            <Text style={{ color: colors.primary, fontSize: FontSize.md, fontWeight: 'bold' }}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {/* Monto */}
        <View style={styles.amountContainer}>
          {isTransfer && (
            <View style={[styles.transferBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.transferBadgeText, { color: colors.primary }]}>🔄 Movimiento Interno</Text>
            </View>
          )}
          <Text style={[styles.amount, { color: accentColor }]}>
            {isTransfer ? '' : (isIngreso ? '+' : '-')}{formatCurrency(tx.monto_real)}
          </Text>
          <Text style={styles.date}>{formatDateLabel(tx.fecha)}</Text>
        </View>

        {isTransfer ? (
          <>
            {/* Origen y Destino */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cuenta Origen</Text>
              <Text style={styles.noteText}>{getWalletLabel(transferOrigin) || 'Cuenta origen'}</Text>
            </View>

            {transferDest ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Cuenta Destino</Text>
                <Text style={styles.noteText}>{getWalletLabel(transferDest) || 'Cuenta destino'}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Información Contable</Text>
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                Este movimiento traslada dinero entre tus propias cuentas sin registrar gasto ni ingreso operativo.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.deleteBtn, { borderColor: colors.expense }]} 
              activeOpacity={0.8}
              onPress={handleDelete}
            >
              <Text style={[styles.deleteBtnText, { color: colors.expense }]}>🗑️ Revertir Transferencia</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Nota / Concepto */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nota o Concepto</Text>
              <Text style={styles.noteText}>
                {tx.nota ? tx.nota : 'Sin detalles adicionales.'}
              </Text>
            </View>

            {/* Cuenta / Billetera */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cuenta / Billetera</Text>
              <Text style={styles.noteText}>
                {getWalletLabel(tx.billetera)} ({tx.metodo_pago === 'efectivo' ? 'Efectivo 💵' : 'Virtual 💳'})
              </Text>
            </View>

            {/* Foto */}
            {tx.foto_uri && (
              <View style={styles.card}>
                 <Text style={styles.cardTitle}>Foto adjunta</Text>
                 <Image source={{ uri: tx.foto_uri }} style={styles.image} />
              </View>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg },
  amountContainer: { alignItems: 'center', marginVertical: Spacing.lg },
  amount: { fontSize: 48, fontWeight: FontWeight.bold, letterSpacing: -1 },
  date: { color: colors.textSecondary, fontSize: FontSize.md, marginTop: Spacing.xs },
  card: { backgroundColor: colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textTransform: 'uppercase', marginBottom: Spacing.sm },
  noteText: { color: colors.textPrimary, fontSize: FontSize.md, lineHeight: 22 },
  image: { width: '100%', height: 300, borderRadius: Radius.md, resizeMode: 'cover', backgroundColor: '#000' },
  transferBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, marginBottom: Spacing.sm },
  transferBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  deleteBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  deleteBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
