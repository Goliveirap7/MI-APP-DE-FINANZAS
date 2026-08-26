import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const AVATAR_STORAGE_KEY = '@user_avatar';
export const AVATAR_CHANGED_EVENT = 'onAvatarChanged';

export const AVATARS = [
  '🐼', // Oso panda
  '🐱', // Gato
  '🦫', // Marmota / Capibara
  '🐹', // Hamster
  '🐶', // Perro
  '🐦', // Gorrión
  '🦦', // Comadreja / Nutria
  '🦆', // Ornitorrinco / Pato
  '🐧', // Pingüino
  '🦊', // Zorro extra para llegar a 10
];

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
