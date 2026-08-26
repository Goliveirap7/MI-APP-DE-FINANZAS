import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDatabase } from '../../db/database';

import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { importShioData } from '../../utils/importShio';
import { DEFAULT_ESPACIO_ID } from '../../db/seed';
import { useAvatar, AVATARS } from '../../hooks/useAvatar';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user } = useAuth();
  const db = useDatabase();
  const { avatar, saveAvatar } = useAvatar();
  
  // Extraemos el username actual
  const currentUsername = user?.user_metadata?.username || '';
  
  const [username, setUsername] = useState(currentUsername);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const displayAvatar = avatar || currentUsername.charAt(0)?.toUpperCase() || 'U';

  const handleImportShio = async () => {
    setLoading(true);
    try {
      await importShioData(db);
      Alert.alert('Éxito', 'Datos de prueba importados correctamente. Ve al inicio para verlos.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron importar los datos');
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
        await db.runAsync('DELETE FROM transacciones WHERE espacio_id = ?', [DEFAULT_ESPACIO_ID]);
        await db.runAsync('DELETE FROM presupuesto_categoria WHERE espacio_id = ?', [DEFAULT_ESPACIO_ID]);
      } else {
        const mesActual = new Date().toISOString().substring(0, 7); // YYYY-MM
        await db.runAsync(`DELETE FROM transacciones WHERE espacio_id = ? AND fecha LIKE '${mesActual}%'`, [DEFAULT_ESPACIO_ID]);
        await db.runAsync(`DELETE FROM presupuesto_categoria WHERE espacio_id = ? AND mes LIKE '${mesActual}%'`, [DEFAULT_ESPACIO_ID]);
      }
      Alert.alert('Éxito', 'Los datos han sido borrados correctamente.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron borrar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let successCount = 0;

    // Actualizar Username
    if (username.trim() && username.trim() !== currentUsername) {
      const { error } = await supabase.auth.updateUser({
        data: { username: username.trim() }
      });
      if (error) {
        Alert.alert('Error actualizando perfil', error.message);
      } else {
        successCount++;
      }
    }

    // Actualizar Contraseña
    if (password.trim().length > 0) {
      if (password.length < 6) {
        Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      if (error) {
        Alert.alert('Error actualizando contraseña', error.message);
      } else {
        successCount++;
        setPassword(''); // Limpiar contraseña después del cambio
      }
    }

    setLoading(false);

    if (successCount > 0) {
      Alert.alert('✅ Éxito', 'Tus datos se actualizaron correctamente en la nube.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Sin cambios', 'No se detectaron cambios para guardar.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Text style={{ color: colors.primary, fontSize: FontSize.md }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {/* Avatar Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Elige tu Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.avatarOption,
                  avatar === emoji && styles.avatarOptionSelected
                ]}
                onPress={() => saveAvatar(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.avatarEmoji}>{emoji}</Text>
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

        </View>

        <TouchableOpacity
          onPress={handleSave}
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

        {user?.email === 'shio.gd20@gmail.com' && (
          <TouchableOpacity
            onPress={handleImportShio}
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
              <Text style={styles.saveBtnText}>Importar Datos (Shio) 🚀</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Botón para resetear datos */}
        <TouchableOpacity
          onPress={handleResetData}
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
  avatarEmoji: { fontSize: 24 },

  input: { backgroundColor: colors.bgInput, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  inputDisabled: { color: colors.textMuted, opacity: 0.7 },

  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: Radius.md },
  passwordInput: { flex: 1, color: colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  eyeBtn: { padding: Spacing.md, justifyContent: 'center', alignItems: 'center' },
  eyeIcon: { fontSize: 18 },

  saveWrapper: { borderRadius: Radius.full, overflow: 'hidden', shadowColor: colors.income, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  saveBtn: { paddingVertical: Spacing.md + 2, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
});
