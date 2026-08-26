import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useDatabase } from '../../db/database';
import { getTransaccionById, TransaccionLocal } from '../../db/repositories/transacciones';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';

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
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
            <Text style={{ color: colors.primary, fontSize: FontSize.md }}>← Volver</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Transacción no encontrada.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isIngreso = tx.tipo === 'ingreso';
  const accentColor = isIngreso ? colors.income : colors.expense;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Text style={{ color: colors.primary, fontSize: FontSize.md }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('AddTransaction', { transaccionId: tx.id_local })}
          style={{ padding: 10 }}
        >
          <Text style={{ color: colors.primary, fontSize: FontSize.md, fontWeight: 'bold' }}>Editar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {/* Monto */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: accentColor }]}>
            {isIngreso ? '+' : '-'}{formatCurrency(tx.monto_real)}
          </Text>
          <Text style={styles.date}>{formatDateLabel(tx.fecha)}</Text>
        </View>

        {/* Nota / Concepto */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nota o Concepto</Text>
          <Text style={styles.noteText}>
            {tx.nota ? tx.nota : 'Sin detalles adicionales.'}
          </Text>
        </View>

        {/* Foto */}
        {tx.foto_uri && (
          <View style={styles.card}>
             <Text style={styles.cardTitle}>Foto adjunta</Text>
             <Image source={{ uri: tx.foto_uri }} style={styles.image} />
          </View>
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
  image: { width: '100%', height: 300, borderRadius: Radius.md, resizeMode: 'cover', backgroundColor: '#000' }
});
