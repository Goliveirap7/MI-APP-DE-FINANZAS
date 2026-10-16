import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { triggerSoftTap } from '../utils/haptics';

interface LocalLockScreenProps {
  onAuthenticate: () => Promise<boolean>;
}

export default function LocalLockScreen({ onAuthenticate }: LocalLockScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    // Intentar desbloquear automáticamente al cargar la pantalla
    onAuthenticate();
  }, []);

  const handleManualUnlock = () => {
    triggerSoftTap();
    onAuthenticate();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🔒</Text>
          <Text style={styles.title}>Aphelios</Text>
          <Text style={styles.subtitle}>Bloqueo de Seguridad</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={handleManualUnlock}>
          <LinearGradient
            colors={[colors.primary, '#6366f1']}
            style={styles.unlockBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.unlockIcon}>👆</Text>
            <Text style={styles.unlockText}>Desbloquear</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: 40,
    borderRadius: Radius.full,
    gap: Spacing.sm,
  },
  unlockIcon: {
    fontSize: FontSize.xl,
  },
  unlockText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
