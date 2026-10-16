import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

export interface WalletItem {
  id: string;
  label: string;
  color: string;
  icon: string;
  isVirtual: boolean;
}

export const DEFAULT_WALLETS: WalletItem[] = [
  { id: 'Alfin', label: 'Alfin', color: '#FF7A00', icon: '💳', isVirtual: true },
  { id: 'Interbank', label: 'Interbank', color: '#00A443', icon: '💳', isVirtual: true },
  { id: 'Yape', label: 'Yape', color: '#7E30E1', icon: '📱', isVirtual: true },
  { id: 'Agora', label: 'Agora', color: '#00B4D8', icon: '📱', isVirtual: true },
  { id: 'Efectivo', label: 'Efectivo', color: '#888888', icon: '💵', isVirtual: false },
];

const STORAGE_KEY = '@wallet_custom_labels';
const EVENT_WALLETS_UPDATED = 'EVENT_WALLETS_UPDATED';

export function useWalletConfig() {
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const loadLabels = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomLabels(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('[useWalletConfig] Error cargando nombres personalizados:', e);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadLabels();
    const subscription = DeviceEventEmitter.addListener(EVENT_WALLETS_UPDATED, (newLabels) => {
      setCustomLabels(newLabels);
    });
    return () => {
      subscription.remove();
    };
  }, [loadLabels]);

  const updateWalletLabel = useCallback(async (walletId: string, newLabel: string) => {
    try {
      const trimmed = newLabel.trim();
      const updated = {
        ...customLabels,
        [walletId]: trimmed || (DEFAULT_WALLETS.find(w => w.id === walletId)?.label ?? walletId),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCustomLabels(updated);
      DeviceEventEmitter.emit(EVENT_WALLETS_UPDATED, updated);
    } catch (e) {
      console.warn('[useWalletConfig] Error guardando nombre personalizado:', e);
      throw e;
    }
  }, [customLabels]);

  const getWalletLabel = useCallback((id: string): string => {
    if (customLabels[id]) return customLabels[id];
    const def = DEFAULT_WALLETS.find(w => w.id === id);
    return def ? def.label : id;
  }, [customLabels]);

  const wallets = DEFAULT_WALLETS.map(w => ({
    ...w,
    label: customLabels[w.id] || w.label,
  }));

  return {
    wallets,
    getWalletLabel,
    updateWalletLabel,
    customLabels,
    loaded,
  };
}
