/**
 * YearSelector — selector de año con botones < y >
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  year: string; // 'YYYY'
  onChange: (year: string) => void;
}

export default function YearSelector({ year, onChange }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const handlePrev = () => {
    const y = parseInt(year);
    onChange((y - 1).toString());
  };

  const handleNext = () => {
    const y = parseInt(year);
    onChange((y + 1).toString());
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePrev} style={styles.btn} activeOpacity={0.7}>
        <Text style={styles.arrow}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{year}</Text>

      <TouchableOpacity onPress={handleNext} style={styles.btn} activeOpacity={0.7}>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.sm,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    color: colors.textSecondary,
    fontSize: 22,
    lineHeight: 24,
    marginTop: -2,
  },
  label: {
    color: colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    minWidth: 80,
    textAlign: 'center',
  },
});
