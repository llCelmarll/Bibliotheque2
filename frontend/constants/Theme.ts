/**
 * Système de thèmes de l'application Ma Bibliothèque.
 * Chaque thème expose exactement les mêmes clés — les composants utilisent
 * useTheme() et accèdent aux couleurs de manière sémantique (ex: theme.accent).
 *
 * Pour ajouter un nouveau thème :
 *  1. Copier/coller un thème existant
 *  2. L'ajouter dans `themes`
 *  3. Ajouter son nom dans `ThemeName`
 */

// ─── Warm & Cozy (défaut) ────────────────────────────────────────────────────
const warmCozy = {
  name: 'warmCozy' as const,
  label: 'Chaleureuse',

  // Fonds
  bgPrimary:   '#FAF7F2',  // crème parchemin
  bgSecondary: '#F2EDE4',  // crème plus sombre (fond de listes)
  bgCard:      '#FFFFFF',  // blanc pur (cartes)
  bgInput:     '#F5F0E8',  // crème (inputs)
  bgMuted:     '#EDE8DF',  // beige (séparateurs, boutons inactifs)

  // Textes
  textPrimary:   '#1C1008',  // brun très foncé
  textSecondary: '#6B5744',  // brun moyen
  textMuted:     '#9C8470',  // brun clair (metadata)
  textInverse:   '#FFFFFF',

  // Accent
  accent:       '#8B2020',  // bordeaux
  accentLight:  '#F5E6C8',  // ambre clair (bg tags)
  accentMedium: '#C9956C',  // caramel

  // États sémantiques
  success:   '#2D6A4F', successBg:  '#D8F3DC',
  warning:   '#B07D2B', warningBg:  '#FEF3C7',
  danger:    '#B91C1C', dangerBg:   '#FEE2E2',

  // Tab bar
  tabActive:   '#8B2020',
  tabInactive: '#9C8470',
  tabBg:       '#FAF7F2',

  // Bordures
  borderLight:  '#E8E0D5',
  borderMedium: '#D4C9BB',

  // Formes
  radiusCard:  16,
  radiusChip:  20,
  radiusInput: 10,
};

// ─── Dark & Premium ──────────────────────────────────────────────────────────
const darkPremium = {
  name: 'darkPremium' as const,
  label: 'Sombre & Élégante',

  bgPrimary:   '#121212',
  bgSecondary: '#1A1A1A',
  bgCard:      '#1E1E1E',
  bgInput:     '#252525',
  bgMuted:     '#2A2A2A',

  textPrimary:   '#E5E5E5',
  textSecondary: '#B0B0B0',
  textMuted:     '#757575',
  textInverse:   '#121212',

  accent:       '#D4A017',
  accentLight:  '#2A2208',
  accentMedium: '#A07010',

  success:   '#4CAF50', successBg:  '#1B3A1F',
  warning:   '#FFA726', warningBg:  '#3A2800',
  danger:    '#EF5350', dangerBg:   '#3A1010',

  tabActive:   '#D4A017',
  tabInactive: '#757575',
  tabBg:       '#1A1A1A',

  borderLight:  '#2A2A2A',
  borderMedium: '#333333',

  radiusCard:  16,
  radiusChip:  20,
  radiusInput: 10,
};

// ─── Clean Minimal ───────────────────────────────────────────────────────────
const cleanMinimal = {
  name: 'cleanMinimal' as const,
  label: 'Minimaliste',

  bgPrimary:   '#F9FAFB',
  bgSecondary: '#F3F4F6',
  bgCard:      '#FFFFFF',
  bgInput:     '#F9FAFB',
  bgMuted:     '#E5E7EB',

  textPrimary:   '#111827',
  textSecondary: '#374151',
  textMuted:     '#9CA3AF',
  textInverse:   '#FFFFFF',

  accent:       '#4F46E5',
  accentLight:  '#EEF2FF',
  accentMedium: '#818CF8',

  success:   '#059669', successBg:  '#D1FAE5',
  warning:   '#D97706', warningBg:  '#FEF3C7',
  danger:    '#DC2626', dangerBg:   '#FEE2E2',

  tabActive:   '#4F46E5',
  tabInactive: '#9CA3AF',
  tabBg:       '#FFFFFF',

  borderLight:  '#E5E7EB',
  borderMedium: '#D1D5DB',

  radiusCard:  12,
  radiusChip:  20,
  radiusInput: 8,
};

// ─── Nature & Doux ───────────────────────────────────────────────────────────
const nature = {
  name: 'nature' as const,
  label: 'Nature',

  bgPrimary:   '#F4F1EC',
  bgSecondary: '#EBE7DF',
  bgCard:      '#FDFCF9',
  bgInput:     '#F0EDE6',
  bgMuted:     '#E8E0D5',

  textPrimary:   '#1A1A2E',
  textSecondary: '#3D4A3A',
  textMuted:     '#7A8C77',
  textInverse:   '#FFFFFF',

  accent:       '#2D6A4F',
  accentLight:  '#D8F3DC',
  accentMedium: '#52B788',

  success:   '#1B4332', successBg:  '#D8F3DC',
  warning:   '#9A6700', warningBg:  '#FEF9C3',
  danger:    '#B91C1C', dangerBg:   '#FEE2E2',

  tabActive:   '#2D6A4F',
  tabInactive: '#7A8C77',
  tabBg:       '#F4F1EC',

  borderLight:  '#E8E0D5',
  borderMedium: '#D6CCBE',

  radiusCard:  14,
  radiusChip:  20,
  radiusInput: 10,
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export type AppTheme = typeof warmCozy;
export type ThemeName = 'warmCozy' | 'darkPremium' | 'cleanMinimal' | 'nature';

export const themes: Record<ThemeName, AppTheme> = {
  warmCozy,
  darkPremium,
  cleanMinimal,
  nature,
};

export const DEFAULT_THEME: ThemeName = 'warmCozy';
