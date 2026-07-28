// theme/colors.ts
// Central color palette. Full Tailwind-style ramps (50-900) for every hue
// in use, plus semantic overlay tokens for modal/backdrop scrims.
// Adjust hex values to match your brand if needed — the *names* are what
// the component tree depends on, not these exact hexes.

export const colors = {
    white: '#FFFFFF',
    black: '#000000',

    // Gray
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',

    // Blue
    blue50: '#EFF6FF',
    blue100: '#DBEAFE',
    blue200: '#BFDBFE',
    blue300: '#93C5FD',
    blue400: '#60A5FA',
    blue500: '#3B82F6',
    blue600: '#2563EB',
    blue700: '#1D4ED8',
    blue800: '#1E40AF',
    blue900: '#1E3A8A',

    // Green
    green50: '#ECFDF5',
    green100: '#D1FAE5',
    green200: '#A7F3D0',
    green300: '#6EE7B7',
    green400: '#34D399',
    green500: '#10B981',
    green600: '#059669',
    green700: '#047857',
    green800: '#065F46',
    green900: '#064E3B',

    // Orange
    orange50: '#FFF7ED',
    orange100: '#FFEDD5',
    orange200: '#FED7AA',
    orange300: '#FDBA74',
    orange400: '#FB923C',
    orange500: '#F97316',
    orange600: '#EA580C',
    orange700: '#C2410C',
    orange800: '#9A3412',
    orange900: '#7C2D12',

    // Purple
    purple50: '#F5F3FF',
    purple100: '#EDE9FE',
    purple200: '#DDD6FE',
    purple300: '#C4B5FD',
    purple400: '#A78BFA',
    purple500: '#8B5CF6',
    purple600: '#7C3AED',
    purple700: '#6D28D9',
    purple800: '#5B21B6',
    purple900: '#4C1D95',

    // Red
    red50: '#FEF2F2',
    red100: '#FEE2E2',
    red200: '#FECACA',
    red300: '#FCA5A5',
    red400: '#F87171',
    red500: '#EF4444',
    red600: '#DC2626',
    red700: '#B91C1C',
    red800: '#991B1B',
    red900: '#7F1D1D',

    // Pink
    pink50: '#FDF2F8',
    pink100: '#FCE7F3',
    pink200: '#FBCFE8',
    pink300: '#F9A8D4',
    pink400: '#F472B6',
    pink500: '#EC4899',
    pink600: '#DB2777',
    pink700: '#BE185D',
    pink800: '#9D174D',
    pink900: '#831843',

    // Overlay — semi-transparent black scrims for modal backdrops.
    // Number = opacity percentage (overlay40 = 40% black).
    overlay10: 'rgba(0,0,0,0.1)',
    overlay20: 'rgba(0,0,0,0.2)',
    overlay30: 'rgba(0,0,0,0.2)',
    overlay40: 'rgba(0,0,0,0.4)',
    overlay60: 'rgba(0,0,0,0.6)',
    overlay70: 'rgba(0,0,0,0.7)',
    overlay80: 'rgba(0,0,0,0.8)',
} as const

export type ColorName = keyof typeof colors