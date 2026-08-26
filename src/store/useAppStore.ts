/**
 * Store global con Zustand.
 * Por ahora solo gestiona el Espacio activo y el usuario autenticado.
 * Cada módulo (transacciones, deudas, etc.) tendrá su propio slice cuando se implemente.
 */
import { create } from 'zustand';
import type { Espacio } from '../constants/types';

interface AppState {
  // ─── Auth ───────────────────────────────────────────────────────────────
  userId: string | null;
  setUserId: (id: string | null) => void;

  // ─── Espacio activo ──────────────────────────────────────────────────────
  espacioActivo: Espacio | null;
  setEspacioActivo: (espacio: Espacio | null) => void;

  // ─── Mes seleccionado ────────────────────────────────────────────────────
  /** 'YYYY-MM-01' — primer día del mes que se está visualizando */
  mesActivo: string;
  setMesActivo: (mes: string) => void;
}

const primerDiaMesActual = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

export const useAppStore = create<AppState>((set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),

  espacioActivo: null,
  setEspacioActivo: (espacio) => set({ espacioActivo: espacio }),

  mesActivo: primerDiaMesActual(),
  setMesActivo: (mes) => set({ mesActivo: mes }),
}));
