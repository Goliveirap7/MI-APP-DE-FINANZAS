import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const AVATAR_STORAGE_KEY = '@user_avatar';
export const AVATAR_CHANGED_EVENT = 'onAvatarChanged';

export const AVATAR_IMAGES: Record<string, any> = {
  BUHO: require('../../assets/avatars/BUHO.png'),
  CAPIBARA: require('../../assets/avatars/CAPIBARA.png'),
  CASTOR: require('../../assets/avatars/CASTOR.png'),
  GATO: require('../../assets/avatars/GATO.png'),
  HAMSTER: require('../../assets/avatars/HAMSTER.png'),
  PANDA: require('../../assets/avatars/PANDA.png'),
  PATO: require('../../assets/avatars/PATO.png'),
  PERRO: require('../../assets/avatars/PERRO.png'),
  PINGUINO: require('../../assets/avatars/PINGUINO.png'),
  ZORRO: require('../../assets/avatars/ZORRO.png'),
};

export const AVATAR_KEYS = Object.keys(AVATAR_IMAGES);

export function useAvatar() {
  // Inicializa con null o un valor por defecto
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    loadAvatar();
    
    // Escuchar cambios desde otras pantallas
    const subscription = DeviceEventEmitter.addListener(AVATAR_CHANGED_EVENT, (newAvatar) => {
      setAvatar(newAvatar);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadAvatar = async () => {
    try {
      const stored = await AsyncStorage.getItem(AVATAR_STORAGE_KEY);
      if (stored) {
        setAvatar(stored);
      }
    } catch (e) {
      console.error('Error loading avatar:', e);
    }
  };

  const saveAvatar = async (newAvatar: string) => {
    try {
      await AsyncStorage.setItem(AVATAR_STORAGE_KEY, newAvatar);
      setAvatar(newAvatar);
      DeviceEventEmitter.emit(AVATAR_CHANGED_EVENT, newAvatar);
    } catch (e) {
      console.error('Error saving avatar:', e);
    }
  };

  return { avatar, saveAvatar };
}
