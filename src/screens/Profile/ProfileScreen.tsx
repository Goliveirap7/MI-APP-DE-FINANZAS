import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDatabase } from '../../db/database';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { pickAndImportCSV } from '../../utils/csvImport';
import { DEFAULT_ESPACIO_ID } from '../../db/seed';
import { useAvatar, AVATAR_KEYS, AVATAR_IMAGES } from '../../hooks/useAvatar';
import { showToast } from '../../utils/toast';
import { triggerSoftTap } from '../../utils/haptics';
import { useSecurity } from '../../context/SecurityContext';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user } = useAuth();
  const db = useDatabase();
  const { avatar, saveAvatar } = useAvatar();
  const { isBiometricEnabled, toggleBiometric } = useSecurity();
  
  // Extraemos el username actual
  const currentUsername = user?.user_metadata?.username || '';
  
  const [username, setUsername] = useState(currentUsername);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const displayAvatar = avatar || currentUsername.charAt(0)?.toUpperCase() || 'U';

  const handleImportCSV = async () => {
    setLoading(true);
    try {
      const result = await pickAndImportCSV(db);
      if (result.success) {
        showToast(result.message);
      } else {
        showToast(`Aviso: ${result.message}`);
      }
    } catch (e) {
      console.error(e);
      showToast('Error inesperado al importar CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      '⚠️ Resetear Datos',
      '¿Qué información deseas eliminar de este dispositivo?',
      [
        {
          text: 'Borrar mes actual',
          onPress: () => resetData('mes'),
        },
        {
          text: 'Borrar TODO',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar borrado total',
              'Esta acción eliminará todos tus registros locales. ¿Estás absolutamente seguro?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sí, borrar todo', style: 'destructive', onPress: () => resetData('todo') }
              ]
            );
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        }
      ]
    );
  };

  const resetData = async (tipo: 'mes' | 'todo') => {
    setLoading(true);
    try {
      if (tipo === 'todo') {
        // Borrar en la nube primero
        const { error: err1 } = await supabase.from('transacciones').delete().eq('espacio_id', DEFAULT_ESPACIO_ID);
        const { error: err2 } = await supabase.from('presupuesto_categoria').delete().eq('espacio_id', DEFAULT_ESPACIO_ID);
        const { error: err3 } = await supabase.from('activos_inversion').delete().eq('espacio_id', DEFAULT_ESPACIO_ID);
        
        if (err1 || err2 || err3) {
           showToast('Error: Necesitas conexión a internet para borrar tus datos de la nube.');
           setLoading(false);
           return;
        }

        await db.runAsync('DELETE FROM transacciones WHERE espacio_id = ?', [DEFAULT_ESPACIO_ID]);
        await db.runAsync('DELETE FROM presupuesto_categoria WHERE espacio_id = ?', [DEFAULT_ESPACIO_ID]);
        await db.runAsync('DELETE FROM activos_inversion WHERE espacio_id = ?', [DEFAULT_ESPACIO_ID]);
      } else {
        const mesActual = new Date().toISOString().substring(0, 7); // YYYY-MM
        
        // Borrar en la nube
        const { error: err1 } = await supabase.from('transacciones').delete().eq('espacio_id', DEFAULT_ESPACIO_ID).like('fecha', `${mesActual}%`);
        const { error: err2 } = await supabase.from('presupuesto_categoria').delete().eq('espacio_id', DEFAULT_ESPACIO_ID).like('mes', `${mesActual}%`);

        if (err1 || err2) {
           showToast('Error: Necesitas conexión a internet para borrar tus datos de la nube.');
           setLoading(false);
           return;
        }

        await db.runAsync(`DELETE FROM transacciones WHERE espacio_id = ? AND fecha LIKE '${mesActual}%'`, [DEFAULT_ESPACIO_ID]);
        await db.runAsync(`DELETE FROM presupuesto_categoria WHERE espacio_id = ? AND mes LIKE '${mesActual}%'`, [DEFAULT_ESPACIO_ID]);
      }
      showToast('Los datos han sido borrados de la nube y del dispositivo correctamente.');
    } catch (err) {
      console.error(err);
      showToast('Error: No se pudieron borrar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let hasChanges = false;

    // Actualizar Username
    if (username.trim() && username.trim() !== currentUsername) {
      const { error } = await supabase.auth.updateUser({
        data: { username: username.trim() }
      });
      if (error) {
        showToast('Error actualizando perfil: ' + error.message);
        setLoading(false);
        return;
      }
      hasChanges = true;
    }

    // Actualizar Contraseña
    const newPassword = password.trim();
    if (newPassword.length > 0) {
      if (newPassword.length < 6) {
        showToast('Error: La contraseña debe tener al menos 6 caracteres.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        showToast('Error actualizando contraseña: ' + error.message);
        setLoading(false);
        return;
      }
      hasChanges = true;
      setPassword(''); // Limpiar contraseña después del cambio
    }

    setLoading(false);

    if (hasChanges) {
      showToast('Tus datos se actualizaron correctamente en la nube.');
      navigation.goBack();
    } else {
      showToast('No se detectaron cambios para guardar.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { triggerSoftTap(); navigation.goBack(); }} style={{ padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Image source={require('../../../assets/flechas/izquierda.png')} style={{ width: 12, height: 12, tintColor: colors.primary }} resizeMode="contain" /><Text style={{ color: colors.primary, fontSize: FontSize.md }}>Volver</Text></View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {/* Avatar Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Elige tu Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.avatarOption,
                  avatar === key && styles.avatarOptionSelected
                ]}
                onPress={() => { triggerSoftTap(); saveAvatar(key); }}
                activeOpacity={0.7}
              >
                <Image source={AVATAR_IMAGES[key]} style={styles.avatarImage} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          
          <Text style={styles.label}>Correo Electrónico (Solo Lectura)</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={user?.email}
            editable={false}
          />

          <Text style={styles.label}>Nombre de Usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="¿Cómo te llamas?"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Nueva Contraseña (Opcional)</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Dejar en blanco para no cambiar"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeBtn} 
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* SECCIÓN SEGURIDAD */}
          <Text style={[styles.label, { marginTop: Spacing.xl }]}>Seguridad</Text>
          <View style={styles.securityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Bloqueo Biométrico</Text>
              <Text style={styles.securitySub}>Pedir huella 1 vez al día para entrar</Text>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={async (val) => {
                const success = await toggleBiometric(val);
                if (success) triggerSoftTap();
                else showToast(val ? 'No se pudo activar la seguridad' : 'Cancelado');
              }}
              trackColor={{ false: colors.bgInput, true: colors.primary }}
              thumbColor={isBiometricEnabled ? '#fff' : '#ccc'}
            />
          </View>

        </View>

        <TouchableOpacity
          onPress={() => { triggerSoftTap(); handleSave(); }}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.saveWrapper}
        >
          <LinearGradient
            colors={['#00C896', '#00a87a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar cambios en la Nube ☁️</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { triggerSoftTap(); handleImportCSV(); }}
          disabled={loading}
          activeOpacity={0.85}
          style={[styles.saveWrapper, { marginTop: 10, shadowColor: '#4f46e5' }]}
        >
          <LinearGradient
            colors={['#4f46e5', '#3730a3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>📥 Importar Excel / CSV</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Botón para resetear datos */}
        <TouchableOpacity
          onPress={() => { triggerSoftTap(); handleResetData(); }}
          disabled={loading}
          activeOpacity={0.85}
          style={[styles.saveWrapper, { marginTop: 10, shadowColor: colors.expense }]}
        >
          <LinearGradient
            colors={[colors.expense, '#d94040']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>Resetear Datos (Borrar)</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerTitle: { color: colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg },
  
  card: { backgroundColor: colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: colors.border, gap: Spacing.sm },
  cardTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  label: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.xs },
  
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center', marginTop: Spacing.xs },
  avatarOption: { width: 50, height: 50, borderRadius: Radius.full, backgroundColor: colors.bgInput, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  avatarOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  avatarImage: { width: 34, height: 34 },

  input: { backgroundColor: colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  inputDisabled: { color: colors.textMuted, opacity: 0.7 },

  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: Radius.md },
  passwordInput: { flex: 1, color: colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  eyeBtn: { padding: Spacing.md },
  eyeIcon: { fontSize: FontSize.md },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgInput, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.xs },
  securityTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  securitySub: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  saveWrapper: { marginTop: Spacing.xl, borderRadius: Radius.full, shadowColor: '#00C896', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  saveBtn: { paddingVertical: Spacing.md + 2, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
});
