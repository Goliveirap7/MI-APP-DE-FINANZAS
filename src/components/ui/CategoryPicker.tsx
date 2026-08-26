/**
 * CategoryPicker — grilla horizontal de categorías con emoji.
 * Un toque selecciona; la categoría activa se resalta con el color de acento.
 */
import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export interface CategoryOption {
  id: string;
  nombre: string;
  emoji: string;
}

interface Props {
  options: CategoryOption[];
  selected: string | null;   // id
  onSelect: (id: string) => void;
  accentColor?: string;
}

export default function CategoryPicker({
  options,
  selected,
  onSelect,
  accentColor,
}: Props) {
  const { colors } = useTheme();
  const actualAccentColor = accentColor ?? colors.primary;
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((cat) => {
        const isSelected = cat.id === selected;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.75}
            style={[
              styles.chip,
              isSelected && {
                backgroundColor: actualAccentColor + '20',
                borderColor: actualAccentColor,
              },
            ]}
          >
            <Text style={styles.emoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.label,
                isSelected && { color: actualAccentColor, fontWeight: FontWeight.semibold },
              ]}
            >
              {cat.nombre}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.bgCardAlt,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: 4,
    minWidth: 80,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    color: colors.textSecondary,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
