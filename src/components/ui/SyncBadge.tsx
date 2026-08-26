/**
 * SyncBadge — indicador visual de estado de sincronización (§RF-22).
 * Muestra un punto de color según el estado del registro.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSize, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import type { EstadoSync } from '../../constants/types';
import { useTheme } from '../../context/ThemeContext';

interface SyncBadgeProps {
  estado: EstadoSync;
  showLabel?: boolean;
}

export default function SyncBadge({ estado, showLabel = false }: SyncBadgeProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const CONFIG: Record<EstadoSync, { color: string; label: string }> = {
    pendiente:      { color: colors.warning,   label: '🕒 Pendiente' },
    sincronizado:   { color: colors.primary,   label: '✓ Sincronizado' },
    con_error:      { color: colors.expense,   label: '❌ Error' },
    con_conflicto:  { color: colors.debt,      label: '⚠️ Conflicto' },
  };

  const { color, label } = CONFIG[estado];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      {showLabel && <Text style={[styles.label, { color }]}>{label}</Text>}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
  },
  label: {
    fontSize: FontSize.xs,
  },
});
