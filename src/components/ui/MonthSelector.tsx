/**
 * MonthSelector — navegador de mes con flechas y nombre del mes.
 * Usado en Home, Budget y AnnualSummary.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TouchableWithoutFeedback, Image } from 'react-native';
import { FontSize, FontWeight, Spacing, Radius, type ThemeColors } from '../../constants/theme';
import { formatMesLabel, desplazarMes } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';

interface MonthSelectorProps {
  mes: string;              // 'YYYY-MM-01'
  onChange: (mes: string) => void;
  disableFuture?: boolean;
  textColor?: string;
}

export default function MonthSelector({
  mes,
  onChange,
  disableFuture = true,
  textColor,
}: MonthSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [year, month] = mes.split('-').map(Number);
  const [selectedYear, setSelectedYear] = useState(year);

  const hoy = new Date();
  const currentYear = hoy.getFullYear();
  const currentMonth = hoy.getMonth();

  React.useEffect(() => {
    setSelectedYear(year);
  }, [modalVisible, year]);

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleSelect = (mIndex: number) => {
    const newMes = `${selectedYear}-${String(mIndex + 1).padStart(2, '0')}-01`;
    onChange(newMes);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.row} 
        activeOpacity={0.7} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.label, textColor ? { color: textColor } : {}]}>{formatMesLabel(mes)}</Text>
        <Image 
          source={require('../../../assets/flechas/abajo.png')} 
          style={[styles.triangleIcon, { tintColor: textColor || colors.textPrimary }]} 
          resizeMode="contain" 
        />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                
                {/* Selector de Año */}
                <View style={styles.yearHeader}>
                  <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={styles.yearArrow}>
                    <Image 
                      source={require('../../../assets/flechas/izquierda.png')} 
                      style={[styles.yearArrowIcon, { tintColor: colors.textPrimary }]} 
                      resizeMode="contain" 
                    />
                  </TouchableOpacity>
                  <Text style={styles.yearText}>{selectedYear}</Text>
                  <TouchableOpacity 
                    onPress={() => setSelectedYear(y => y + 1)} 
                    style={styles.yearArrow}
                    disabled={disableFuture && selectedYear >= currentYear}
                  >
                    <Image 
                      source={require('../../../assets/flechas/derecha.png')} 
                      style={[styles.yearArrowIcon, { tintColor: colors.textPrimary }, disableFuture && selectedYear >= currentYear && styles.disabledText]} 
                      resizeMode="contain" 
                    />
                  </TouchableOpacity>
                </View>

                {/* Grid de Meses */}
                <View style={styles.monthsGrid}>
                  {monthsList.map((monthName, index) => {
                    const isFuture = disableFuture && selectedYear === currentYear && index > currentMonth;
                    const isSelected = selectedYear === year && index === month - 1;
                    return (
                      <TouchableOpacity 
                        key={monthName} 
                        style={[styles.monthItem, isSelected && { backgroundColor: colors.primary + '20' }]} 
                        onPress={() => handleSelect(index)}
                        disabled={isFuture}
                      >
                        <Text style={[
                          styles.monthItemText, 
                          isSelected && { color: colors.primary, fontWeight: 'bold' },
                          isFuture && styles.disabledText
                        ]}>
                          {monthName.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  label: {
    color: colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textTransform: 'capitalize',
  },
  triangleIcon: {
    width: 14,
    height: 14,
    marginLeft: 8,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderRadius: Radius.lg,
    width: '85%',
    maxWidth: 340,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  yearArrow: {
    padding: Spacing.sm,
  },
  yearArrowIcon: {
    width: 16,
    height: 16,
  },
  yearText: {
    color: colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  monthItem: {
    width: '31%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  monthItemText: {
    color: colors.textPrimary,
    fontSize: FontSize.md,
    textTransform: 'capitalize',
  },
  disabledText: {
    opacity: 0.3,
  }
});
