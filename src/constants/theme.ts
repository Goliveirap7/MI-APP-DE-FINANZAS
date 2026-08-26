/**
 * Design tokens — paleta oscura con acento verde esmeralda.
 * Todos los colores y espaciados del proyecto vienen de aquí.
 */
export const DarkColors = {
  // Fondos
  bg:          '#0F1117',
  bgCard:      '#1A1D27',
  bgCardAlt:   '#21253A',
  bgInput:     '#1E2235',

  // Acento principal (verde esmeralda)
  primary:     '#00C896',
  primaryDim:  '#00C89620',

  // Acento secundario (azul índigo)
  secondary:   '#6366F1',
  secondaryDim:'#6366F120',

  // Semánticos
  income:      '#00C896',   // verde  → ingresos
  expense:     '#FF5C5C',   // rojo   → egresos
  warning:     '#FFB020',   // ámbar  → alerta sobregasto
  debt:        '#FF8C42',   // naranja→ deudas

  // Texto
  textPrimary: '#F0F4FF',
  textSecondary:'#8892AA',
  textMuted:   '#4D5568',

  // Bordes
  border:      '#252A3D',
  borderLight: '#303650',
} as const;

export const LightColors = {
  // Fondos
  bg:          '#F2F4F7', // Gris muy claro
  bgCard:      '#FFFFFF', // Blanco puro
  bgCardAlt:   '#F8F9FA', // Gris claro
  bgInput:     '#F0F2F5', // Gris para inputs

  // Acento principal (verde esmeralda)
  primary:     '#00C896',
  primaryDim:  '#00C89620',

  // Acento secundario (azul índigo)
  secondary:   '#6366F1',
  secondaryDim:'#6366F120',

  // Semánticos
  income:      '#00C896',
  expense:     '#E53935', // Rojo más plano
  warning:     '#FFB020',
  debt:        '#FF8C42',

  // Texto
  textPrimary: '#1E293B', // Slate 800
  textSecondary:'#64748B', // Slate 500
  textMuted:   '#94A3B8', // Slate 400

  // Bordes
  border:      '#E2E8F0', // Slate 200
  borderLight: '#CBD5E1', // Slate 300
} as const;

export type ThemeColors = Record<keyof typeof DarkColors, string>;

// Backward compatibility until refactored
export const Colors = DarkColors;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  full: 999,
} as const;

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   18,
  xl:   22,
  xxl:  28,
  hero: 36,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
};
