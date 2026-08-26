/**
 * MonthSelector — navegador de mes con flechas y nombre del mes.
 * Usado en Home, Budget y AnnualSummary.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontSize, FontWeight, Spacing, Radius, type ThemeColors } from '../../constants/theme';
import { formatMesLabel, desplazarMes } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';

interface MonthSelectorProps {
  mes: string;              // 'YYYY-MM-01'
  onChange: (mes: string) => void;
  disableFuture?: boolean;
}

export default function MonthSelector({
  mes,
  onChange,
  disableFuture = true,
}: MonthSelectorProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const hoy = new Date();
  const currentStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
  const mesFuturo = new Date(mes) >= new Date(currentStr);

  const prev = () => onChange(desplazarMes(mes, -1));
  const next = () => {
    if (disableFuture && mes === currentStr) return;
    onChange(desplazarMes(mes, +1));
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={prev} style={styles.arrow} activeOpacity={0.7}>
        <Text style={styles.arrowText}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{formatMesLabel(mes)}</Text>

      <TouchableOpacity
        onPress={next}
        style={[styles.arrow, disableFuture && mesFuturo && styles.disabled]}
        activeOpacity={0.7}
        disabled={disableFuture && mesFuturo}
      >
        <Text style={[styles.arrowText, disableFuture && mesFuturo && styles.disabledText]}>
          ›
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrowText: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    color: colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textTransform: 'capitalize',
    minWidth: 160,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  disabledText: {
    color: colors.textMuted,
  },
});
