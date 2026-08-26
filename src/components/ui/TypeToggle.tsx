/**
 * TypeToggle — selector Ingreso / Egreso tipo pill.
 * Anima el fondo deslizante entre las dos opciones.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import type { TipoTransaccion } from '../../constants/types';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  value: TipoTransaccion;
  onChange: (tipo: TipoTransaccion) => void;
}

export default function TypeToggle({ value, onChange }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(value === 'ingreso' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: value === 'ingreso' ? 0 : 1,
      useNativeDriver: true,
      tension: 200,
      friction: 20,
    }).start();
  }, [value]);

  const PILL_W = 140;

  return (
    <View style={styles.track}>
      {/* Fondo deslizante */}
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: value === 'ingreso' ? colors.income : colors.expense,
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, PILL_W],
                }),
              },
            ],
          },
        ]}
      />

      <TouchableOpacity
        style={[styles.option, { width: PILL_W }]}
        onPress={() => onChange('ingreso')}
        activeOpacity={0.8}
      >
        <Text style={[styles.optionText, value === 'ingreso' && styles.activeText]}>
          ⬆ Ingreso
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, { width: PILL_W }]}
        onPress={() => onChange('egreso')}
        activeOpacity={0.8}
      >
        <Text style={[styles.optionText, value === 'egreso' && styles.activeText]}>
          ⬇ Egreso
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bgInput,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  pill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 140,
    borderRadius: Radius.full,
  },
  option: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  activeText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
  },
});
