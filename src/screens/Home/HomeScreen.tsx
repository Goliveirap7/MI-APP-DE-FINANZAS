/**
 * HomeScreen — Pantalla principal: Resumen del mes (RF-07)
 * DATOS REALES desde SQLite vía useResumenMensual + useCategorias
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency, formatPercent, mesActualISO } from '../../utils/format';

import MonthSelector from '../../components/ui/MonthSelector';
import Card from '../../components/ui/Card';
import CategoryProgressRow from '../../components/ui/CategoryProgressRow';

import { useResumenMensual } from '../../hooks/useResumenMensual';
import { useCategorias } from '../../hooks/useCategorias';
import { useAuth } from '../../context/AuthContext';
import { useAvatar, AVATAR_IMAGES } from '../../hooks/useAvatar';
import { useStreak } from '../../hooks/useStreak';

// Emojis por nombre de categoría
const EMOJI_MAP: Record<string, string> = {
  'Servicios': '🏠',
  'Gastos necesarios': '🛒',
  'Gastos sin culpa': '🎉',
  'Salud': '💊',
  'Emergencia': '🚨',
  'Inversión': '📈',
};

const getGreeting = (username: string) => {
  const hour = new Date().getHours();
  const name = username ? `, ${username}` : '';

  if (hour >= 5 && hour < 12) {
    const greetings = [
      `Buenos días${name} 👋`,
      `¡Excelente mañana${name}! ☀️`,
      `¿Qué tal tu mañana${name}? ☕`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  } else if (hour >= 12 && hour < 18) {
    const greetings = [
      `Buenas tardes${name} 👋`,
      `¿Cómo va la tarde${name}? 🌤️`,
      `¡Linda tarde${name}! ✨`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  } else if (hour >= 18 && hour < 22) {
    const greetings = [
      `Buenas noches${name} 🌙`,
      `¿Cómo va la noche${name}? 🌌`,
      `¿Cenando${name}? 🍽️`,
      `¿Vaya noche tranquila eh${name}? 😌`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  } else if (hour >= 22 || hour < 1) {
    const greetings = [
      `Buenas noches${name} 🌙`,
      `¡A descansar${name}! 😴`,
      `Hora de dormir${name} 🛌`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  } else {
    // 1:00 AM to 4:59 AM
    const greetings = [
      `¿Vaya madrugada no${name}? 🦉`,
      `Aún despierto${name} 🌙`,
      `¡Qué tarde es${name}! 🌌`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
};

export default function HomeScreen() {
  const [mes, setMes] = useState(mesActualISO());
  const [showMenu, setShowMenu] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const navigation = useNavigation<any>();
  const { signOut, user } = useAuth();
  const { colors, toggleTheme, isDark } = useTheme();
  const { avatar } = useAvatar();
  const { streak } = useStreak();

  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const { resumen, categoriasReal, patrimonio, loading, refetch } =
    useResumenMensual(mes);
  const { catEgreso } = useCategorias();

  const porcentajeGastado =
    resumen && resumen.disponible > 0
      ? resumen.egresos_totales / resumen.disponible
      : 0;
  const diferenciaPositiva = (resumen?.diferencia ?? 0) >= 0;

  // Lógica de Pánico / Zen para el fondo principal
  const heroColors = React.useMemo(() => {
    if (porcentajeGastado >= 0.85) {
      // Modo Pánico
      return isDark ? ['#5a1818', '#3a0c0c'] : ['#ff5252', '#c62828'];
    } else if (porcentajeGastado < 0.50) {
      // Modo Zen
      return isDark ? ['#0d3d2e', '#112240'] : [colors.primary, '#00a87a'];
    }
    // Neutro
    return isDark ? ['#1a1040', '#0d1a40'] : [colors.primary, colors.secondary];
  }, [porcentajeGastado, isDark, colors]);

  // Combinar catEgreso con sus montos reales
  const categoriaRows = catEgreso.map((cat) => {
    const real = categoriasReal.find((r) => r.categoria_egreso_id === cat.id_local)?.total ?? 0;
    return {
      id: cat.id_local,
      nombre: cat.nombre,
      emoji: EMOJI_MAP[cat.nombre] ?? '📁',
      presupuesto: 0,   // TODO: leer de presupuesto_categoria
      real,
    };
  });

  const handleLogout = () => {
    setShowMenu(false);
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut }
    ]);
  };

  const usernameLetter = user?.user_metadata?.username?.charAt(0)?.toUpperCase() || 'U';
  const displayAvatar = avatar || usernameLetter;

  // Computamos el saludo dinámicamente usando useMemo para que se genere en cada render 
  // (o al menos cuando cambia el user, aunque la hora puede variar, esto será suficiente para cuando el componente se monta)
  const greetingText = React.useMemo(() => getGreeting(user?.user_metadata?.username || ''), [user?.user_metadata?.username]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ────────────────────────────────── */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.hamburgerBtn} activeOpacity={0.7} onPress={() => setShowMenu(true)}>
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Text style={styles.greeting}>{greetingText}</Text>
            </View>
            <Text style={styles.subGreeting}>Aquí está tu resumen</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Profile')}>
            {AVATAR_IMAGES[displayAvatar || ''] ? (
              <Image source={AVATAR_IMAGES[displayAvatar]} style={{ width: 28, height: 28 }} resizeMode="contain" />
            ) : (
              <Text style={styles.avatarText}>{displayAvatar}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal Menú de Hamburguesa */}
        <Modal visible={showMenu} transparent={true} animationType="fade" onRequestClose={() => setShowMenu(false)}>
          <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.menuContainer}>

                <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); navigation.navigate('Streak'); }}>
                  <Text style={styles.menuItemIcon}>🔥</Text>
                  <Text style={styles.menuItemText}>Mi Racha</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); navigation.navigate('Debts'); }}>
                  <Text style={styles.menuItemIcon}>🤝</Text>
                  <Text style={styles.menuItemText}>Mis Deudas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); navigation.navigate('Investments'); }}>
                  <Text style={styles.menuItemIcon}>📈</Text>
                  <Text style={styles.menuItemText}>Mis Inversiones</Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
                  <Text style={styles.menuItemIcon}>{isDark ? '☀️' : '🌙'}</Text>
                  <Text style={styles.menuItemText}>{isDark ? 'Modo Diurno' : 'Modo Nocturno'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                  <Text style={styles.menuItemIcon}>☁️</Text>
                  <Text style={styles.menuItemText}>Sincronizar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
                  <Text style={styles.menuItemIcon}>📊</Text>
                  <Text style={styles.menuItemText}>Exportar a Excel</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <Text style={styles.menuItemIcon}>🚪</Text>
                  <Text style={[styles.menuItemText, { color: colors.expense }]}>Cerrar sesión</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ── SELECTOR DE MES ───────────────────────── */}
        <MonthSelector mes={mes} onChange={(m) => { setMes(m); }} />

        {/* ── LOADING ───────────────────────────────── */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Calculando…</Text>
          </View>
        )}

        {/* ── HERO CARD: SALDO ACTUAL ─────────────────── */}
        {!loading && patrimonio && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('BalanceDetail')}
          >
            <LinearGradient
              colors={isDark ? ['#0d3d2e', '#112240'] : [colors.primary, '#00a87a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.85)' }]}>Saldo Disponible</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.heroAmount, { color: '#ffffff', width: 200 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {isBalanceHidden ? 'S/ *******' : formatCurrency(resumen?.diferencia ?? 0)}
                </Text>
                <TouchableOpacity onPress={() => setIsBalanceHidden(!isBalanceHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Image
                    source={isBalanceHidden ? require('../../../assets/view.png') : require('../../../assets/no view.png')}
                    style={{ width: 24, height: 24, tintColor: '#ffffff' }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.heroSubtext, { color: 'rgba(255,255,255,0.85)' }]}>
                En tu cartera virtual y billetera
              </Text>

              {resumen && resumen.saldo_inicial > 0 && (
                <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.heroBadgeText, { color: '#ffffff' }]}>
                    ↑ {formatCurrency(resumen.saldo_inicial)} transferido de meses anteriores
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── INGRESOS / EGRESOS ────────────────────── */}
        {!loading && resumen && (
          <View style={styles.row2}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('CategoryDetail', { mes, tipo: 'ingreso' })}>
              <Card style={styles.halfCard}>
                <View style={styles.flowIcon}>
                  <Text style={styles.flowEmoji}>⬆</Text>
                </View>
                <Text style={styles.flowLabel}>Ingresos</Text>
                <Text style={[styles.flowAmount, { color: colors.income }]}>
                  {formatCurrency(resumen.ingresos_totales)}
                </Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('CategoryDetail', { mes, tipo: 'egreso' })}>
              <Card style={styles.halfCard}>
                <View style={[styles.flowIcon, { backgroundColor: colors.expense + '20' }]}>
                  <Text style={styles.flowEmoji}>⬇</Text>
                </View>
                <Text style={styles.flowLabel}>Egresos</Text>
                <Text style={[styles.flowAmount, { color: colors.expense }]}>
                  {formatCurrency(resumen.egresos_totales)}
                </Text>
              </Card>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PRESUPUESTO POR CATEGORÍA ─────────────── */}
        {!loading && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gastos por categoría</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Budget')}>
                <Text style={styles.sectionLink}>Ver detalle →</Text>
              </TouchableOpacity>
            </View>

            {resumen && resumen.egresos_totales === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: Spacing.xl, opacity: 0.7 }}>
                <Text style={{ fontSize: 32, marginBottom: Spacing.xs }}>🦗</Text>
                <Text style={styles.emptyText}>Tu billetera está muy callada hoy...</Text>
                <Text style={[styles.emptyText, { fontSize: FontSize.xs, marginTop: 4 }]}>Toca el botón + para registrar tu primer gasto</Text>
              </View>
            ) : categoriaRows.length > 0 ? (
              <Card>
                {categoriaRows.map((cat, idx) => (
                  <React.Fragment key={cat.nombre}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('CategoryDetail', { mes, tipo: 'egreso', categoriaId: cat.id })}
                    >
                      <CategoryProgressRow data={cat} />
                    </TouchableOpacity>
                    {idx < categoriaRows.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </Card>
            ) : (
              <Card>
                <Text style={styles.emptyText}>No hay categorías disponibles.</Text>
              </Card>
            )}
          </>
        )}

        {/* ── PRESUPUESTO MENSUAL ─────── */}
        {!loading && resumen && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Presupuesto del mes</Text>
            </View>

            <Card>
              <Text style={styles.patrimonioTotal}>
                {formatCurrency(resumen.disponible)}
              </Text>
              <Text style={styles.patrimonioSubLabel}>Total disponible para gastar</Text>

              <View style={styles.heroTrackOuter}>
                <View
                  style={[
                    styles.heroTrackInner,
                    {
                      width: `${Math.min(porcentajeGastado * 100, 100)}%`,
                      backgroundColor:
                        porcentajeGastado > 0.9 ? colors.expense : colors.primary,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.heroSubtext, { marginTop: Spacing.xs, textAlign: 'center' }]}>
                {formatPercent(porcentajeGastado)} utilizado ·{' '}
                <Text style={{ color: diferenciaPositiva ? colors.income : colors.expense, fontWeight: FontWeight.semibold }}>
                  {diferenciaPositiva ? '+' : ''}
                  {formatCurrency(resumen.diferencia)} restante
                </Text>
              </Text>
            </Card>
          </>
        )}

        {/* ── PATRIMONIO TOTAL ──────────────────────── */}
        {!loading && patrimonio && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Otros Activos</Text>
            </View>

            <Card>
              <PatrimonioRow label="💵 Patrimonio Total" amount={patrimonio.total} color={colors.textPrimary} />
              <View style={styles.divider} />
              <PatrimonioRow label="🤝 Me deben" amount={patrimonio.me_deben} color={colors.income} />
              <View style={styles.divider} />
              <PatrimonioRow label="📈 Invertido" amount={patrimonio.invertido} color={colors.secondary} />
              {patrimonio.debo > 0 && (
                <>
                  <View style={styles.divider} />
                  <PatrimonioRow label="💳 Debo" amount={-patrimonio.debo} color={colors.expense} />
                </>
              )}
            </Card>
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* ── STREAK FAB ───────────────────────────── */}
      {streak > 1 && (
        <TouchableOpacity style={styles.streakFab} activeOpacity={0.85} onPress={() => navigation.navigate('Streak')}>
          <LinearGradient
            colors={['#ff9800', '#f57c00']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.streakFabText}>🔥 {streak}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── FAB ───────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate('AddTransaction')}>
        <LinearGradient
          colors={[colors.primary, '#00a87a']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.fabText}>＋</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function PatrimonioRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.patrimonioRow}>
      <Text style={styles.patrimonioLabel}>{label}</Text>
      <Text style={[styles.patrimonioAmount, { color }]}>
        {amount < 0 ? '-' : ''}{formatCurrency(Math.abs(amount))}
      </Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  headerRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: Spacing.xs },
  hamburgerBtn: { width: 42, height: 42, borderRadius: Radius.md, backgroundColor: colors.bgCardAlt, alignItems: 'center', justifyContent: 'center' },
  hamburgerText: { color: colors.textPrimary, fontSize: FontSize.xl },
  greeting: { color: colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  subGreeting: { color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  avatarBtn: { width: 42, height: 42, borderRadius: Radius.full, backgroundColor: colors.primary + '30', borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },

  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  loadingText: { color: colors.textSecondary, fontSize: FontSize.sm },

  heroCard: { borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: colors.primary + '30', gap: Spacing.sm },
  heroLabel: { color: colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroAmount: { color: colors.textPrimary, fontSize: FontSize.hero, fontWeight: FontWeight.bold, letterSpacing: -1 },
  heroTrackOuter: { height: 4, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: Spacing.xs },
  heroTrackInner: { height: '100%', borderRadius: Radius.full },
  heroSubtext: { color: colors.textSecondary, fontSize: FontSize.sm },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: Radius.sm, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, alignSelf: 'flex-start', marginTop: Spacing.xs },
  heroBadgeText: { color: colors.textSecondary, fontSize: FontSize.xs },

  row2: { flexDirection: 'row', gap: Spacing.md },
  halfCard: { flex: 1, gap: Spacing.xs },
  flowIcon: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  flowEmoji: { fontSize: 16 },
  flowLabel: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  flowAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  sectionTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  sectionLink: { color: colors.primary, fontSize: FontSize.sm },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: Spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg, lineHeight: 22 },

  patrimonioTotal: { color: colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center', marginBottom: Spacing.xs },
  patrimonioSubLabel: { color: colors.textSecondary, fontSize: FontSize.xs, textAlign: 'center', marginBottom: Spacing.xs },
  patrimonioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patrimonioLabel: { color: colors.textSecondary, fontSize: FontSize.sm },
  patrimonioAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  fab: { position: 'absolute', bottom: 24, right: Spacing.lg, width: 58, height: 58, borderRadius: Radius.full, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  streakFab: { position: 'absolute', bottom: 24, left: Spacing.lg, width: 58, height: 58, borderRadius: Radius.full, shadowColor: '#ff9800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  fabGradient: { width: '100%', height: '100%', borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: FontWeight.bold },
  streakFabText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-start', padding: Spacing.md, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  menuContainer: { backgroundColor: colors.bgCard, borderRadius: Radius.lg, width: 220, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8, marginTop: 40 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  menuItemIcon: { fontSize: 18 },
  menuItemText: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  menuDivider: { height: 1, backgroundColor: colors.border, marginVertical: Spacing.xs },
});
