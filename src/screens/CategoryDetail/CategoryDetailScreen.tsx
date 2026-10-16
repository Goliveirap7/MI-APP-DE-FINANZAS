import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { triggerSoftTap } from '../../utils/haptics';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Vibration,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useDatabase } from '../../db/database';
import { SyncEngine } from '../../db/sync/SyncEngine';
import { useCategorias } from '../../hooks/useCategorias';
import { getTransaccionesDetalle, deleteTransaccion, TransaccionLocal } from '../../db/repositories/transacciones';
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
  const [searchQuery, setSearchQuery] = useState('');

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const getCategoryName = useCallback((id: string | null) => {
    if (!id) return 'Sin categoría';
    if (tipo === 'ingreso') {
      return catIngreso.find(c => c.id_local === id)?.nombre || 'Desconocido';
    } else {
      return catEgreso.find(c => c.id_local === id)?.nombre || 'Desconocido';
    }
  }, [tipo, catIngreso, catEgreso]);

  // Transacciones filtradas por el buscador
  const filteredTransacciones = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transacciones;
    return transacciones.filter(t => {
      const nota = (t.nota || '').toLowerCase();
      const catName = getCategoryName(tipo === 'ingreso' ? t.categoria_ingreso_id : t.categoria_egreso_id).toLowerCase();
      const montoStr = t.monto_real.toString();
      const fecha = (t.fecha || '').toLowerCase();
      const billetera = (t.billetera || '').toLowerCase();
      return (
        nota.includes(q) ||
        catName.includes(q) ||
        montoStr.includes(q) ||
        fecha.includes(q) ||
        billetera.includes(q)
      );
    });
  }, [transacciones, searchQuery, tipo, getCategoryName]);

  // Agrupar por nombre de categoría
  const grouped = useMemo(() => {
    return filteredTransacciones.reduce((acc, t) => {
      const catId = tipo === 'ingreso' ? t.categoria_ingreso_id : t.categoria_egreso_id;
      const catName = getCategoryName(catId);
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(t);
      return acc;
    }, {} as Record<string, TransaccionLocal[]>);
  }, [filteredTransacciones, tipo, getCategoryName]);

  const sections = useMemo(() => {
    return Object.keys(grouped).map(title => ({
      title,
      data: grouped[title]
    }));
  }, [grouped]);

  const handleLongPress = (id: string) => {
      triggerSoftTap();
    setIsSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const handlePressItem = (t: TransaccionLocal) => {
    if (isSelectionMode) {
        triggerSoftTap();
      const newSelected = new Set(selectedIds);
      if (newSelected.has(t.id_local)) {
        newSelected.delete(t.id_local);
        if (newSelected.size === 0) setIsSelectionMode(false);
      } else {
        newSelected.add(t.id_local);
      }
      setSelectedIds(newSelected);
    } else {
        triggerSoftTap();
      navigation.navigate('TransactionDetail', { transaccionId: t.id_local });
    }
  };

  const handleSelectAll = () => {
      triggerSoftTap();
    if (selectedIds.size === transacciones.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(transacciones.map(t => t.id_local)));
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
      triggerSoftTap();
    Alert.alert('Borrar registros', `¿Estás seguro de borrar ${selectedIds.size} registro(s)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await Promise.all(Array.from(selectedIds).map(id => deleteTransaccion(db, id)));

            // Forzar subida a Supabase de los eliminados al instante
            const syncEngine = new SyncEngine(db);
            await syncEngine.pushToCloud();

            setIsSelectionMode(false);
            setSelectedIds(new Set());
            await loadData();
          } catch (e) {
            console.error(e);
          }
        }
      }
    ]);
  };

  const title = tipo === 'ingreso' ? 'Detalle de Ingresos' : 'Detalle de Gastos';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {isSelectionMode ? (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}>
            <Text style={styles.backBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSelectAll}>
            <Text style={[styles.headerTitle, { fontSize: FontSize.md, color: colors.primary }]}>Seleccionar todos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backBtn, { alignItems: 'flex-end' }]} onPress={handleDelete}>
            <Text style={[styles.backBtnText, { color: colors.expense, fontWeight: 'bold' }]}>Borrar ({selectedIds.size})</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { triggerSoftTap(); navigation.goBack(); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Image source={require('../../../assets/flechas/izquierda.png')} style={{ width: 12, height: 12, tintColor: colors.primary }} resizeMode="contain" /><Text style={styles.backBtnText}>Volver</Text></View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 60 }} />
        </View>
      )}

      {/* Buscador de detalles */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={`Buscar en ${tipo === 'ingreso' ? 'ingresos' : 'gastos'}...`}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                triggerSoftTap();
                setSearchQuery('');
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.clearSearchBtn}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.trim().length > 0 && (
          <View style={styles.searchMetaRow}>
            <Text style={styles.searchCountText}>
              {filteredTransacciones.length} de {transacciones.length} transacciones
            </Text>
            <TouchableOpacity onPress={() => { triggerSoftTap(); setSearchQuery(''); }}>
              <Text style={styles.clearLinkText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : transacciones.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay registros en esta categoría.</Text>
        </View>
      ) : filteredTransacciones.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🔎</Text>
          <Text style={styles.emptySearchTitle}>Sin resultados</Text>
          <Text style={styles.emptyText}>No encontramos transacciones que coincidan con "{searchQuery}"</Text>
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => { triggerSoftTap(); setSearchQuery(''); }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearFilterBtnText}>Restablecer búsqueda</Text>
          </TouchableOpacity>
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
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id_local);
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.itemCard,
                  isSelectionMode && isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
                onPress={() => handlePressItem(item)}
                onLongPress={() => handleLongPress(item.id_local)}
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
                    <Text style={styles.editHint}>
                      {isSelectionMode ? (isSelected ? '✅' : '○') : 'Ver detalle >'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
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
  
  // Estilos del buscador
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: colors.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FontSize.sm,
    paddingVertical: 4,
  },
  clearSearchBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  searchMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    marginTop: 6,
  },
  searchCountText: {
    color: colors.textMuted,
    fontSize: FontSize.xs,
  },
  clearLinkText: {
    color: colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  emptySearchTitle: {
    color: colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  clearFilterBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  clearFilterBtnText: {
    color: colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
