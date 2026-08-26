/**
 * Card — contenedor base reutilizable con fondo oscuro y borde sutil.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'alt';
}

export default function Card({ children, style, variant = 'default' }: CardProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.card,
        variant === 'alt' && styles.cardAlt,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardAlt: {
    backgroundColor: colors.bgCardAlt,
  },
});
