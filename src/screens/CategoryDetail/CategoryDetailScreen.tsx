import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useDatabase } from '../../db/database';
import { useCategorias } from '../../hooks/useCategorias';
import { getTransaccionesDetalle, TransaccionLocal } from '../../db/repositories/transacciones';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';

interface RouteParams {
  mes: string;
  tipo: 'ingreso' | 'egreso';
  categoriaId?: string;
}

export default function CategoryDetailScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { mes, tipo, categoriaId } = (route.params as RouteParams) || {};
  
  const db = useDatabase();
  const { catIngreso, catEgreso, conceptosPor } = useCategorias();
  
  const [transacciones, setTransacciones] = useState<TransaccionLocal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!mes || !tipo) return;
    setLoading(true);
    try {
      const data = await getTransaccionesDetalle(db, mes, tipo, categoriaId);
      setTransacciones(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [db, mes, tipo, categoriaId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getCategoryName = (id: string | null) => {
    if (!id) return 'Sin categoría';
    if (tipo === 'ingreso') {
      return catIngreso.find(c => c.id_local === id)?.nombre || 'Desconocido';
    } else {
      return catEgreso.find(c => c.id_local === id)?.nombre || 'Desconocido';
    }
  };

  // Agrupar por nombre de categoría
  const grouped = transacciones.reduce((acc, t) => {
    const catId = tipo === 'ingreso' ? t.categoria_ingreso_id : t.categoria_egreso_id;
    const catName = getCategoryName(catId);
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(t);
    return acc;
  }, {} as Record<string, TransaccionLocal[]>);

  const sections = Object.keys(grouped).map(title => ({
    title,
    data: grouped[title]
  }));

  const handlePressItem = (t: TransaccionLocal) => {
    navigation.navigate('TransactionDetail', { transaccionId: t.id_local });
  };

  const title = tipo === 'ingreso' ? 'Detalle de Ingresos' : 'Detalle de Gastos';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : transacciones.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay registros en esta categoría.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id_local}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.itemCard}
              onPress={() => navigation.navigate('TransactionDetail', { transaccionId: item.id_local })}
            >
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemDate}>
                    {new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                  </Text>
                  <Text style={styles.itemDesc} numberOfLines={1}>
                    {item.nota || 'Sin nota'}
                  </Text>
                </View>
                <View style={styles.itemAmountCol}>
                  <Text style={[styles.itemAmount, { color: tipo === 'ingreso' ? colors.income : colors.expense }]}>
                    {tipo === 'ingreso' ? '+' : '-'}{formatCurrency(item.monto_real)}
                  </Text>
                  <Text style={styles.editHint}>Ver detalle {'>'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: Spacing.xs, width: 60 },
  backBtnText: { color: colors.primary, fontSize: FontSize.md },
  headerTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: FontSize.md },
  listContent: { padding: Spacing.md, paddingBottom: 100 },
  sectionHeader: { backgroundColor: colors.bg, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, textTransform: 'uppercase' },
  itemCard: { backgroundColor: colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: colors.border },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemInfo: { flex: 1, marginRight: Spacing.sm },
  itemDate: { color: colors.textSecondary, fontSize: FontSize.xs, marginBottom: 2 },
  itemDesc: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  itemAmountCol: { alignItems: 'flex-end' },
  itemAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  editHint: { color: colors.primary, fontSize: FontSize.xs, marginTop: 4 },
});
