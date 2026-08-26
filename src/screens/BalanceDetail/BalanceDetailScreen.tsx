import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useDatabase } from '../../db/database';
import { getHistorial, type TransaccionLocal } from '../../db/repositories/transacciones';
import { useResumenMensual } from '../../hooks/useResumenMensual';
import { formatCurrency, formatDateMedium } from '../../utils/format';
import { useCategorias } from '../../hooks/useCategorias';
import { useTheme } from '../../context/ThemeContext';

export default function BalanceDetailScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const db = useDatabase();
  const navigation = useNavigation<any>();
  
  // We use current month to get the latest patrimonio values
  const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
  const { patrimonio, loading: loadingResumen } = useResumenMensual(currentMonth);
  const { catIngreso } = useCategorias();

  const [historial, setHistorial] = useState<TransaccionLocal[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  useEffect(() => {
    async function load() {
      setLoadingHistorial(true);
      try {
        const data = await getHistorial(db, 'ingreso', undefined, 50);
        setHistorial(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistorial(false);
      }
    }
    load();
  }, [db]);

  const getCatName = (id: string | null) => {
    if (!id) return 'Otros';
    const c = catIngreso.find(x => x.id_local === id);
    return c ? c.nombre : 'Otros';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Text style={{ color: colors.primary, fontSize: FontSize.md }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Saldo</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {/* CARDS */}
        {loadingResumen ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.xl }} />
        ) : (
          <View style={styles.cardsRow}>
            <View style={styles.walletCard}>
              <View style={styles.walletIconWrapper}>
                <Text style={styles.walletIcon}>💳</Text>
              </View>
              <Text style={styles.walletLabel}>Billetera Virtual</Text>
              <Text style={styles.walletAmount}>
                {formatCurrency(patrimonio?.disponible_virtual || 0)}
              </Text>
            </View>

            <View style={styles.walletCard}>
              <View style={[styles.walletIconWrapper, { backgroundColor: colors.income + '20' }]}>
                <Text style={styles.walletIcon}>💵</Text>
              </View>
              <Text style={styles.walletLabel}>Billetera Física</Text>
              <Text style={[styles.walletAmount, { color: colors.income }]}>
                {formatCurrency(patrimonio?.disponible_efectivo || 0)}
              </Text>
            </View>
          </View>
        )}

        {/* HISTORIAL */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historial de Ingresos</Text>
          
          {loadingHistorial ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : historial.length > 0 ? (
            <View style={styles.listContainer}>
              {historial.map((tx, idx) => (
                <View key={tx.id_local}>
                  <TouchableOpacity 
                    style={styles.txRow}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('TransactionDetail', { transaccionId: tx.id_local })}
                  >
                    <View style={styles.txIconWrapper}>
                      <Text style={styles.txIcon}>
                        {tx.metodo_pago === 'efectivo' ? '💵' : '💳'}
                      </Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txCat}>{getCatName(tx.categoria_ingreso_id)}</Text>
                      <Text style={styles.txDate}>{formatDateMedium(tx.fecha)}</Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={styles.txAmount}>+{formatCurrency(tx.monto_real)}</Text>
                      <Text style={styles.txMethod}>
                        {tx.metodo_pago === 'efectivo' ? 'Efectivo' : 'Virtual'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {idx < historial.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aún no hay ingresos registrados.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  cardsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  walletCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  walletIconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  walletIcon: { fontSize: 24 },
  walletLabel: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: 4 },
  walletAmount: { color: colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },

  historySection: { marginTop: Spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.md, marginLeft: Spacing.xs },
  
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
});
