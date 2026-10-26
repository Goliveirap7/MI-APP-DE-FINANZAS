/**
 * CategoriesScreen — Gestión personalizada de Categorías y Subtipos (RF-16).
 *
 * Permite al usuario:
 *  - Ver y editar categorías de egreso (gastos) e ingreso.
 *  - Expandir cada categoría de egreso para gestionar sus subtipos (conceptos de detalle).
 *  - Añadir nuevas categorías y subtipos con sincronización a Supabase.
 *  - Ocultar/eliminar de forma segura sin romper el historial de transacciones.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useDatabase } from '../../db/database';
import { useSyncEngine } from '../../hooks/useSyncEngine';
import { triggerSoftTap } from '../../utils/haptics';
import { showToast } from '../../utils/toast';
import BottomSheet from '../../components/ui/BottomSheet';

import {
  getCatEgresoByEspacio,
  getCatIngresoByEspacio,
  getConceptosByCategoria,
  insertCatEgreso,
  updateCatEgreso,
  deleteCatEgreso,
  insertConceptoDetalle,
  updateConceptoDetalle,
  deleteConceptoDetalle,
  insertCatIngreso,
  updateCatIngreso,
  deleteCatIngreso,
  countTransaccionesByCatEgreso,
  countTransaccionesByCatIngreso,
  countTransaccionesByConcepto,
  type CatEgreso,
  type CatIngreso,
  type ConceptoDetalle,
} from '../../db/repositories/categorias';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ICON_MAP: Record<string, any> = {
  'Servicios': require('../../../assets/categorias/servicios.png'),
  'Gastos necesarios': require('../../../assets/categorias/gastos_necesarios.png'),
  'Gastos sin culpa': require('../../../assets/categorias/gastos_sin_culpa.png'),
  'Salud': require('../../../assets/categorias/salud.png'),
  'Emergencia': require('../../../assets/categorias/emergencia.png'),
  'Inversión': require('../../../assets/categorias/inversiones.png'),
};

const EMOJI_INGRESO: Record<string, string> = {
  'Salario': '💼',
  'Negocio': '🏪',
  'Otros': '💰',
};

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const db = useDatabase();
  const { triggerSync } = useSyncEngine();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState<'egreso' | 'ingreso'>('egreso');
  const [loading, setLoading] = useState(true);

  const [catEgreso, setCatEgreso] = useState<CatEgreso[]>([]);
  const [catIngreso, setCatIngreso] = useState<CatIngreso[]>([]);
  const [conceptosMap, setConceptosMap] = useState<Record<string, ConceptoDetalle[]>>({});
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Form BottomSheet
  const [showSheet, setShowSheet] = useState(false);
  const [sheetType, setSheetType] = useState<'cat_egreso' | 'cat_ingreso' | 'concepto'>('cat_egreso');
  const [isEditing, setIsEditing] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [nombreInput, setNombreInput] = useState('');
  const [parentCatNombre, setParentCatNombre] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allEgresos, allIngresos] = await Promise.all([
        getCatEgresoByEspacio(db),
        getCatIngresoByEspacio(db),
      ]);
      const egresos = allEgresos.filter(c => c.nombre.trim().toLowerCase() !== 'transferencias');
      const ingresos = allIngresos.filter(c => c.nombre.trim().toLowerCase() !== 'transferencias');
      setCatEgreso(egresos);
      setCatIngreso(ingresos);

      // Cargar conceptos para cada categoría de egreso
      const map: Record<string, ConceptoDetalle[]> = {};
      for (const cat of egresos) {
        const conc = await getConceptosByCategoria(db, cat.id_local);
        map[cat.id_local] = conc;
      }
      setConceptosMap(map);
    } catch (e) {
      console.warn('[CategoriesScreen] Error cargando categorías:', e);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (catId: string) => {
    triggerSoftTap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCatId(prev => (prev === catId ? null : catId));
  };

  // ── Modales de creación / edición ──────────────────────────────────────────

  const openNewCatEgreso = () => {
    triggerSoftTap();
    setSheetType('cat_egreso');
    setIsEditing(false);
    setTargetId(null);
    setNombreInput('');
    setShowSheet(true);
  };

  const openEditCatEgreso = (cat: CatEgreso) => {
    triggerSoftTap();
    setSheetType('cat_egreso');
    setIsEditing(true);
    setTargetId(cat.id_local);
    setNombreInput(cat.nombre);
    setShowSheet(true);
  };

  const openNewConcepto = (cat: CatEgreso) => {
    triggerSoftTap();
    setSheetType('concepto');
    setIsEditing(false);
    setTargetId(cat.id_local); // Almacena el id de la categoría padre
    setParentCatNombre(cat.nombre);
    setNombreInput('');
    setShowSheet(true);
  };

  const openEditConcepto = (concepto: ConceptoDetalle) => {
    triggerSoftTap();
    setSheetType('concepto');
    setIsEditing(true);
    setTargetId(concepto.id_local);
    setParentCatNombre('');
    setNombreInput(concepto.nombre);
    setShowSheet(true);
  };

  const openNewCatIngreso = () => {
    triggerSoftTap();
    setSheetType('cat_ingreso');
    setIsEditing(false);
    setTargetId(null);
    setNombreInput('');
    setShowSheet(true);
  };

  const openEditCatIngreso = (cat: CatIngreso) => {
    triggerSoftTap();
    setSheetType('cat_ingreso');
    setIsEditing(true);
    setTargetId(cat.id_local);
    setNombreInput(cat.nombre);
    setShowSheet(true);
  };

  // ── Guardado ───────────────────────────────────────────────────────────────

  const handleGuardar = async () => {
    const trimmed = nombreInput.trim();
    if (!trimmed) {
      showToast('Por favor escribe un nombre.');
      return;
    }

    setSaving(true);
    try {
      if (sheetType === 'cat_egreso') {
        if (isEditing && targetId) {
          await updateCatEgreso(db, targetId, trimmed);
          showToast('Categoría actualizada.');
        } else {
          await insertCatEgreso(db, trimmed);
          showToast('Categoría creada con éxito.');
        }
      } else if (sheetType === 'concepto') {
        if (isEditing && targetId) {
          await updateConceptoDetalle(db, targetId, trimmed);
          showToast('Subtipo actualizado.');
        } else if (targetId) {
          await insertConceptoDetalle(db, targetId, trimmed);
          showToast('Subtipo añadido con éxito.');
        }
      } else if (sheetType === 'cat_ingreso') {
        if (isEditing && targetId) {
          await updateCatIngreso(db, targetId, trimmed);
          showToast('Categoría de ingreso actualizada.');
        } else {
          await insertCatIngreso(db, trimmed);
          showToast('Categoría de ingreso creada.');
        }
      }

      setShowSheet(false);
      await loadData();
      triggerSync().catch(() => {});
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminaciones ──────────────────────────────────────────────────────────

  const handleDeleteCatEgreso = async (cat: CatEgreso) => {
    triggerSoftTap();
    const count = await countTransaccionesByCatEgreso(db, cat.id_local);

    const title = count > 0 ? `Ocultar "${cat.nombre}"` : `Eliminar "${cat.nombre}"`;
    const message = count > 0
      ? `Esta categoría tiene ${count} transacciones registradas. Se ocultará de la lista para nuevos registros sin alterar tu historial ni reportes pasados.`
      : `¿Estás seguro de que deseas eliminar la categoría "${cat.nombre}"?`;

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: count > 0 ? 'Ocultar' : 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCatEgreso(db, cat.id_local);
            showToast('Categoría removida.');
            await loadData();
            triggerSync().catch(() => {});
          } catch (e) {
            showToast('Error al eliminar categoría.');
          }
        },
      },
    ]);
  };

  const handleDeleteConcepto = async (concepto: ConceptoDetalle) => {
    triggerSoftTap();
    const count = await countTransaccionesByConcepto(db, concepto.id_local);

    const title = count > 0 ? `Ocultar "${concepto.nombre}"` : `Eliminar "${concepto.nombre}"`;
    const message = count > 0
      ? `Este subtipo tiene ${count} transacciones registradas. Se ocultará para futuros registros sin alterar tus transacciones anteriores.`
      : `¿Deseas eliminar el subtipo "${concepto.nombre}"?`;

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: count > 0 ? 'Ocultar' : 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConceptoDetalle(db, concepto.id_local);
            showToast('Subtipo removido.');
            await loadData();
            triggerSync().catch(() => {});
          } catch (e) {
            showToast('Error al eliminar subtipo.');
          }
        },
      },
    ]);
  };

  const handleDeleteCatIngreso = async (cat: CatIngreso) => {
    triggerSoftTap();
    const count = await countTransaccionesByCatIngreso(db, cat.id_local);

    const title = count > 0 ? `Ocultar "${cat.nombre}"` : `Eliminar "${cat.nombre}"`;
    const message = count > 0
      ? `Esta categoría tiene ${count} transacciones de ingreso registradas. Se ocultará para nuevas operaciones manteniendo tu historial intacto.`
      : `¿Deseas eliminar la categoría "${cat.nombre}"?`;

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: count > 0 ? 'Ocultar' : 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCatIngreso(db, cat.id_local);
            showToast('Categoría de ingreso removida.');
            await loadData();
            triggerSync().catch(() => {});
          } catch (e) {
            showToast('Error al eliminar.');
          }
        },
      },
    ]);
  };

  const getSheetTitle = () => {
    if (sheetType === 'cat_egreso') {
      return isEditing ? 'Editar Categoría de Gasto' : 'Nueva Categoría de Gasto';
    }
    if (sheetType === 'concepto') {
      return isEditing
        ? 'Editar Subtipo'
        : `Nuevo Subtipo en "${parentCatNombre}"`;
    }
    return isEditing ? 'Editar Categoría de Ingreso' : 'Nueva Categoría de Ingreso';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => {
            triggerSoftTap();
            navigation.goBack();
          }}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Categorías y Conceptos</Text>
          <Text style={styles.headerSubtitle}>Personaliza tus gastos, ingresos y subtipos</Text>
        </View>
      </View>

      {/* ── SELECTOR DE TABS ──────────────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'egreso' && styles.tabButtonActiveExpense]}
          activeOpacity={0.8}
          onPress={() => {
            triggerSoftTap();
            setActiveTab('egreso');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'egreso' && styles.tabTextActive]}>
            🔴 Gastos ({catEgreso.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ingreso' && styles.tabButtonActiveIncome]}
          activeOpacity={0.8}
          onPress={() => {
            triggerSoftTap();
            setActiveTab('ingreso');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'ingreso' && styles.tabTextActive]}>
            🟢 Ingresos ({catIngreso.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── CONTENIDO ─────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'egreso' ? (
            /* ── PESTAÑA: GASTOS (EGRESOS) ── */
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categorías de Gastos</Text>
                <TouchableOpacity
                  style={styles.addMainBtn}
                  activeOpacity={0.8}
                  onPress={openNewCatEgreso}
                >
                  <Text style={styles.addMainBtnText}>＋ Nueva Categoría</Text>
                </TouchableOpacity>
              </View>

              {catEgreso.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>📂</Text>
                  <Text style={styles.emptyTitle}>Sin categorías de gasto</Text>
                  <Text style={styles.emptySubtitle}>Agrega tu primera categoría para organizar tus presupuestos.</Text>
                </View>
              ) : (
                catEgreso.map(cat => {
                  const isExpanded = expandedCatId === cat.id_local;
                  const conceptos = conceptosMap[cat.id_local] || [];
                  const iconSrc = ICON_MAP[cat.nombre];

                  return (
                    <View key={cat.id_local} style={styles.catCard}>
                      {/* Cabecera de la Categoría */}
                      <TouchableOpacity
                        style={styles.catHeader}
                        activeOpacity={0.7}
                        onPress={() => toggleExpand(cat.id_local)}
                      >
                        <View style={styles.catIconWrap}>
                          {iconSrc ? (
                            <Image source={iconSrc} style={styles.catIcon} resizeMode="contain" />
                          ) : (
                            <Text style={styles.catEmojiFallback}>📁</Text>
                          )}
                        </View>

                        <View style={styles.catInfo}>
                          <Text style={styles.catNombre}>{cat.nombre}</Text>
                          <Text style={styles.catSubtext}>
                            {conceptos.length === 0
                              ? 'Catálogo abierto (sin subtipos)'
                              : `${conceptos.length} subtipo${conceptos.length === 1 ? '' : 's'}`}
                          </Text>
                        </View>

                        {/* Botones de acción de la categoría */}
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => openEditCatEgreso(cat)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.iconBtnText}>✏️</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => handleDeleteCatEgreso(cat)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.iconBtnText}>🗑️</Text>
                          </TouchableOpacity>

                          <Text style={styles.chevronText}>{isExpanded ? '▲' : '▼'}</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Subtipos Expandidos (Conceptos de Detalle) */}
                      {isExpanded && (
                        <View style={styles.conceptosContainer}>
                          <View style={styles.conceptosDivider} />

                          <View style={styles.conceptosHeaderRow}>
                            <Text style={styles.conceptosSectionTitle}>Subtipos disponibles</Text>
                            <TouchableOpacity
                              style={styles.addSubtipoBtn}
                              activeOpacity={0.7}
                              onPress={() => openNewConcepto(cat)}
                            >
                              <Text style={styles.addSubtipoBtnText}>＋ Añadir subtipo</Text>
                            </TouchableOpacity>
                          </View>

                          {conceptos.length === 0 ? (
                            <View style={styles.emptySubtiposBox}>
                              <Text style={styles.emptySubtiposText}>
                                Esta categoría no tiene subtipos definidos aún. Puedes añadir los que utilices como "Desayuno", "Almuerzo", etc.
                              </Text>
                            </View>
                          ) : (
                            conceptos.map(conc => (
                              <View key={conc.id_local} style={styles.conceptoRow}>
                                <View style={styles.conceptoDot} />
                                <Text style={styles.conceptoNombre}>{conc.nombre}</Text>

                                <View style={styles.conceptoActions}>
                                  <TouchableOpacity
                                    style={styles.iconBtnSm}
                                    onPress={() => openEditConcepto(conc)}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  >
                                    <Text style={styles.iconBtnTextSm}>✏️</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.iconBtnSm}
                                    onPress={() => handleDeleteConcepto(conc)}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  >
                                    <Text style={styles.iconBtnTextSm}>🗑️</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          ) : (
            /* ── PESTAÑA: INGRESOS ── */
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Fuentes de Ingreso</Text>
                <TouchableOpacity
                  style={styles.addMainBtn}
                  activeOpacity={0.8}
                  onPress={openNewCatIngreso}
                >
                  <Text style={styles.addMainBtnText}>＋ Nueva Categoría</Text>
                </TouchableOpacity>
              </View>

              {catIngreso.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>💵</Text>
                  <Text style={styles.emptyTitle}>Sin categorías de ingreso</Text>
                  <Text style={styles.emptySubtitle}>Agrega las fuentes de tus ingresos como Sueldo, Ventas, etc.</Text>
                </View>
              ) : (
                catIngreso.map(cat => {
                  const emoji = EMOJI_INGRESO[cat.nombre] || '💰';

                  return (
                    <View key={cat.id_local} style={styles.catCard}>
                      <View style={styles.catHeader}>
                        <View style={styles.catIconWrap}>
                          <Text style={styles.catEmojiFallback}>{emoji}</Text>
                        </View>

                        <View style={styles.catInfo}>
                          <Text style={styles.catNombre}>{cat.nombre}</Text>
                          <Text style={styles.catSubtext}>Categoría de ingreso</Text>
                        </View>

                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => openEditCatIngreso(cat)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.iconBtnText}>✏️</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => handleDeleteCatIngreso(cat)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.iconBtnText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* ── BOTTOM SHEET PARA AGREGAR / EDITAR ─────────────────────────────── */}
      <BottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title={getSheetTitle()}
      >
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Nombre:</Text>
          <TextInput
            style={styles.textInput}
            value={nombreInput}
            onChangeText={setNombreInput}
            placeholder="Ej: Gimnasio, Mascotas, etc."
            placeholderTextColor={colors.textMuted}
            autoFocus
            maxLength={40}
          />

          <View style={styles.formButtonsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={() => setShowSheet(false)}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              activeOpacity={0.8}
              onPress={handleGuardar}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    backBtnText: {
      fontSize: 28,
      color: colors.textPrimary,
      lineHeight: 32,
    },
    headerTitles: {
      flex: 1,
    },
    headerTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
    },
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
      backgroundColor: colors.bgCard,
      borderRadius: Radius.lg,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabButton: {
      flex: 1,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.md,
    },
    tabButtonActiveExpense: {
      backgroundColor: colors.expense + '20',
      borderWidth: 1,
      borderColor: colors.expense,
    },
    tabButtonActiveIncome: {
      backgroundColor: colors.income + '20',
      borderWidth: 1,
      borderColor: colors.income,
    },
    tabText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textPrimary,
      fontWeight: FontWeight.bold,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.textPrimary,
    },
    addMainBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.sm + 4,
      paddingVertical: Spacing.xs + 2,
      borderRadius: Radius.md,
    },
    addMainBtnText: {
      color: '#FFFFFF',
      fontSize: FontSize.xs + 1,
      fontWeight: FontWeight.bold,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    loadingText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl * 2,
      backgroundColor: colors.bgCard,
      borderRadius: Radius.lg,
      marginTop: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: Spacing.sm,
    },
    emptyTitle: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.textPrimary,
    },
    emptySubtitle: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: Spacing.xl,
      marginTop: 4,
    },
    catCard: {
      backgroundColor: colors.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.sm,
      overflow: 'hidden',
    },
    catHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
    },
    catIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: isDark ? colors.bgCardAlt : '#F0F4F8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    catIcon: {
      width: 26,
      height: 26,
    },
    catEmojiFallback: {
      fontSize: 22,
    },
    catInfo: {
      flex: 1,
    },
    catNombre: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.textPrimary,
    },
    catSubtext: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? '#25293A' : '#F1F3F5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnText: {
      fontSize: 15,
    },
    chevronText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    conceptosContainer: {
      backgroundColor: isDark ? '#141722' : '#F8FAFC',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
    },
    conceptosDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: Spacing.sm,
    },
    conceptosHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: Spacing.xs,
    },
    conceptosSectionTitle: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    addSubtipoBtn: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.sm,
      backgroundColor: colors.primaryDim,
      borderWidth: 1,
      borderColor: colors.primary + '50',
    },
    addSubtipoBtnText: {
      fontSize: FontSize.xs,
      color: colors.primary,
      fontWeight: FontWeight.bold,
    },
    emptySubtiposBox: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    emptySubtiposText: {
      fontSize: FontSize.xs,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    conceptoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '60',
    },
    conceptoDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      marginRight: Spacing.sm,
    },
    conceptoNombre: {
      flex: 1,
      fontSize: FontSize.sm,
      color: colors.textPrimary,
    },
    conceptoActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconBtnSm: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDark ? '#202436' : '#EAEEF2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnTextSm: {
      fontSize: 12,
    },
    formContainer: {
      paddingVertical: Spacing.sm,
    },
    inputLabel: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    textInput: {
      backgroundColor: colors.bgInput,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Platform.OS === 'ios' ? Spacing.sm + 2 : Spacing.sm,
      fontSize: FontSize.md,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.lg,
    },
    formButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radius.md,
      backgroundColor: colors.bgCardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.textSecondary,
    },
    saveBtn: {
      flex: 2,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      color: '#FFFFFF',
    },
  });
