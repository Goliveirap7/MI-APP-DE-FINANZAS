import { Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
  // false: evita que dispare el motor genérico a potencia 1.0 si falla
  enableVibrateFallback: false,
  // true: OBLIGATORIO para que vibre aunque el sistema tenga la vibración táctil desactivada
  ignoreAndroidSystemSettings: true,
};

export function triggerSoftTap() {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    // 'effectClick' o 'longPress' con ignoreAndroidSystemSettings: true
    ReactNativeHapticFeedback.trigger('effectClick', options);
  } else {
    ReactNativeHapticFeedback.trigger('impactMedium', options);
  }
}