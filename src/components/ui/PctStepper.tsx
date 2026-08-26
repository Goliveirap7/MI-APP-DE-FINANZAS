/**
 * PctStepper — control +/- para ajustar un porcentaje entero.
 * Pasos configurables: toque corto = ±1%, toque largo = ±5%.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  value:      number;   // entero 0–100
  onChange:   (v: number) => void;
  accentColor?: string;
  min?: number;
  max?: number;
  step?: number;
  bigStep?: number;
}

export default function PctStepper({
  value,
  onChange,
  accentColor,
  min = 0,
  max = 100,
  step = 1,
  bigStep = 5,
}: Props) {
  const { colors } = useTheme();
  const actualAccentColor = accentColor ?? colors.primary;
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  return (
    <View style={styles.row}>
      {/* Botón − (long press = -5) */}
      <TouchableOpacity
        style={[styles.btn, { borderColor: actualAccentColor + '60' }]}
        onPress={() => onChange(clamp(value - step))}
        onLongPress={() => onChange(clamp(value - bigStep))}
        activeOpacity={0.7}
        delayLongPress={400}
      >
        <Text style={[styles.btnText, { color: actualAccentColor }]}>−</Text>
      </TouchableOpacity>

      {/* Valor */}
      <View style={[styles.valueBox, { borderColor: actualAccentColor + '40' }]}>
        <Text style={[styles.valueText, { color: actualAccentColor }]}>
          {value}
          <Text style={styles.pctSymbol}>%</Text>
        </Text>
      </View>

      {/* Botón + (long press = +5) */}
      <TouchableOpacity
        style={[styles.btn, { borderColor: actualAccentColor + '60' }]}
        onPress={() => onChange(clamp(value + step))}
        onLongPress={() => onChange(clamp(value + bigStep))}
        activeOpacity={0.7}
        delayLongPress={400}
      >
        <Text style={[styles.btnText, { color: accentColor }]}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    lineHeight: 22,
  },
  valueBox: {
    width: 64,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  pctSymbol: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
  },
});
