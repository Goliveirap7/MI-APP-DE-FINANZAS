/**
 * CategoryProgressRow — fila de presupuesto por categoría (RF-06).
 *
 * Muestra:
 *  - Nombre de la categoría
 *  - Barra de progreso animada (real vs presupuesto)
 *  - Montos real y presupuestado
 *  - Diferencia (verde = margen, rojo = sobregasto)
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { formatCurrency, clamp } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';

export interface CategoryProgressData {
  nombre: string;
  emoji?: string;
  presupuesto: number;
  real: number;
}

interface Props {
  data: CategoryProgressData;
  style?: ViewStyle;
}

export default function CategoryProgressRow({ data, style }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { nombre, emoji, presupuesto, real } = data;
  const ratio = presupuesto > 0 ? clamp(real / presupuesto, 0, 1) : 0;
  const diferencia = presupuesto - real;
  const sobrePasado = real > presupuesto;

  // Animación de la barra al montar
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: ratio,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  const barColor = sobrePasado ? colors.expense : colors.primary;
  
  // Health Emoji
  const rawRatio = presupuesto > 0 ? real / presupuesto : 0;
  let healthEmoji = '';
  if (presupuesto > 0) {
    if (rawRatio < 0.5) healthEmoji = '😎';
    else if (rawRatio < 0.9) healthEmoji = '🙂';
    else if (rawRatio <= 1.0) healthEmoji = '😅';
    else healthEmoji = '🥵';
  }

  return (
    <View style={[styles.container, style]}>
      {/* Fila superior: nombre + diferencia */}
      <View style={styles.header}>
        <Text style={styles.nombre}>
          {emoji ? `${emoji} ` : ''}{nombre}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.diferencia, { color: sobrePasado ? colors.expense : colors.income }]}>
            {sobrePasado ? '-' : '+'}{formatCurrency(Math.abs(diferencia))}
          </Text>
          {!!healthEmoji && <Text style={{ fontSize: FontSize.sm }}>{healthEmoji}</Text>}
        </View>
      </View>

      {/* Barra de progreso */}
      <View style={styles.trackOuter}>
        <Animated.View
          style={[
            styles.trackInner,
            {
              backgroundColor: barColor,
              width: widthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Fila inferior: real vs presupuesto */}
      <View style={styles.footer}>
        <Text style={styles.realLabel}>
          <Text style={{ color: barColor, fontWeight: FontWeight.semibold }}>
            {formatCurrency(real)}
          </Text>
          {' '}gastado
        </Text>
        <Text style={styles.presupuestoLabel}>
          de {formatCurrency(presupuesto)}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombre: {
    color: colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  diferencia: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  trackOuter: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: colors.bgInput,
    overflow: 'hidden',
  },
  trackInner: {
    height: '100%',
    borderRadius: Radius.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  realLabel: {
    color: colors.textSecondary,
    fontSize: FontSize.xs,
  },
  presupuestoLabel: {
    color: colors.textMuted,
    fontSize: FontSize.xs,
  },
});
