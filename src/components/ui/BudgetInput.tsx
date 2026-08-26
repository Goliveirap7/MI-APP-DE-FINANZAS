import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { FontSize, FontWeight, Radius, Spacing, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  porcentaje: number;
  monto: number;
  onUpdatePct: (val: number) => void;
  onUpdateMonto: (val: number) => void;
  accentColor?: string;
  disponible: number;
}

export default function BudgetInput({
  porcentaje,
  monto,
  onUpdatePct,
  onUpdateMonto,
  accentColor,
  disponible,
}: Props) {
  const { colors } = useTheme();
  const actualAccentColor = accentColor ?? colors.primary;
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [mode, setMode] = useState<'monto' | 'pct'>('pct');
  const [editing, setEditing] = useState(false);
  const [textVal, setTextVal] = useState('');

  const handlePress = () => {
    setEditing(true);
    setTextVal(mode === 'monto' ? monto.toString() : porcentaje.toString());
  };

  const handleToggleMode = () => {
    setMode((prev) => (prev === 'monto' ? 'pct' : 'monto'));
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseFloat(textVal.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      if (mode === 'monto') {
        onUpdateMonto(parsed);
      } else {
        onUpdatePct(parsed);
      }
    }
  };

  const handleMinus = () => {
    if (mode === 'monto') onUpdateMonto(Math.max(0, monto - 10));
    else onUpdatePct(Math.max(0, porcentaje - 1));
  };
  const handlePlus = () => {
    if (mode === 'monto') onUpdateMonto(monto + 10);
    else onUpdatePct(porcentaje + 1);
  };
  const handleLongMinus = () => {
    if (mode === 'monto') onUpdateMonto(Math.max(0, monto - 50));
    else onUpdatePct(Math.max(0, porcentaje - 5));
  };
  const handleLongPlus = () => {
    if (mode === 'monto') onUpdateMonto(monto + 50);
    else onUpdatePct(porcentaje + 5);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.modeBtn, { backgroundColor: actualAccentColor + '20' }]}
        onPress={handleToggleMode}
        activeOpacity={0.7}
      >
        <Text style={[styles.modeText, { color: actualAccentColor }]}>
          {mode === 'monto' ? 'S/' : '%'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.stepBtn, { borderColor: actualAccentColor + '60' }]}
        onPress={handleMinus}
        onLongPress={handleLongMinus}
        activeOpacity={0.7}
        delayLongPress={400}
      >
        <Text style={[styles.stepBtnText, { color: actualAccentColor }]}>−</Text>
      </TouchableOpacity>

      <View style={[styles.inputBox, { borderColor: actualAccentColor + '40' }]}>
        {editing ? (
          <TextInput
            style={[styles.input, { color: actualAccentColor }]}
            value={textVal}
            onChangeText={setTextVal}
            onBlur={handleBlur}
            autoFocus
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity onPress={handlePress} style={styles.touchableArea} activeOpacity={0.7}>
            <Text style={[styles.valueText, { color: actualAccentColor }]}>
              {mode === 'monto' ? monto.toFixed(2) : porcentaje}
              <Text style={styles.symbolText}>{mode === 'pct' ? '%' : ''}</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.stepBtn, { borderColor: actualAccentColor + '60' }]}
        onPress={handlePlus}
        onLongPress={handleLongPlus}
        activeOpacity={0.7}
        delayLongPress={400}
      >
        <Text style={[styles.stepBtnText, { color: actualAccentColor }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modeBtn: {
    width: 34,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  modeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  stepBtn: {
    width: 32,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    lineHeight: 22,
  },
  inputBox: {
    minWidth: 70,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  touchableArea: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  valueText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  symbolText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
  },
});
