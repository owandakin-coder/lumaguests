import { Building2, Cake, Heart, Sparkles, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface RsvpTheme {
  id: string;
  name: string;

  // Layout variant
  layout: 'card' | 'minimal' | 'bold';
  isDark: boolean;

  // Page background
  pageBg: string;
  glowHex: string;

  // Accent palette
  accentHex: string;
  accentShadow: string;
  accentBorder: string;
  accentText: string;
  accentIcon: string;
  accentVia: string;

  // Adaptive text (white for dark themes)
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Card styling
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  cardRadius: string;
  innerCardBg: string;

  // Button radius token
  buttonRadius: string;

  // Localised copy
  headerLabel: string;
  footerText: string;
  Icon: LucideIcon;

  // 3-dot colour swatches for the template picker
  swatch: [string, string, string];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const LIGHT_TEXT = {
  textPrimary: '#1A1614',
  textSecondary: '#4A3D30',
  textMuted: '#7A6A58',
};

const DARK_TEXT = {
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.75)',
  textMuted: 'rgba(255,255,255,0.50)',
};

// ─── 24 Templates ────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, RsvpTheme> = {

  // ── WEDDING ──────────────────────────────────────────────
  wedding_classic: {
    id: 'wedding_classic', name: 'קלאסי זהב',
    layout: 'card', isDark: false,
    pageBg: '#F7F2E8', glowHex: '#F3DFA9',
    accentHex: '#D2AB54', accentShadow: 'rgba(210,171,84,0.24)',
    accentBorder: '#D5B671', accentText: '#A8872B',
    accentIcon: '#C9A84C', accentVia: '#D9BC77',
    ...LIGHT_TEXT,
    cardBg: 'rgba(255,250,236,0.92)', cardBorder: 'rgba(210,175,100,0.38)',
    cardShadow: '0 24px 60px rgba(102,84,50,0.14)',
    cardRadius: '34px', innerCardBg: '#F0E9D5',
    buttonRadius: '24px',
    headerLabel: 'הזמנה אישית', footerText: 'מחכים לכם באהבה', Icon: Heart,
    swatch: ['#F7F2E8', '#D2AB54', '#FFFFFF'],
  },

  wedding_modern: {
    id: 'wedding_modern', name: 'אלגנטי כהה',
    layout: 'bold', isDark: true,
    pageBg: '#1A1614', glowHex: '#D4AF3720',
    accentHex: '#D4AF37', accentShadow: 'rgba(212,175,55,0.30)',
    accentBorder: '#B8960C', accentText: '#F0D060',
    accentIcon: '#D4AF37', accentVia: '#D4AF37',
    ...DARK_TEXT,
    cardBg: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(255,255,255,0.10)',
    cardShadow: '0 24px 60px rgba(0,0,0,0.40)',
    cardRadius: '34px', innerCardBg: 'rgba(255,255,255,0.04)',
    buttonRadius: '24px',
    headerLabel: 'הזמנה אישית', footerText: 'מחכים לכם', Icon: Heart,
    swatch: ['#1A1614', '#D4AF37', '#FFFFFF'],
  },

  wedding_floral: {
    id: 'wedding_floral', name: 'פרחוני רך',
    layout: 'minimal', isDark: false,
    pageBg: '#FEF5F5', glowHex: '#F8D0DC',
    accentHex: '#C06080', accentShadow: 'rgba(192,96,128,0.20)',
    accentBorder: '#E8A0B8', accentText: '#8B3A54',
    accentIcon: '#C06080', accentVia: '#E8A0B8',
    textPrimary: '#2D1A22', textSecondary: '#6B4455', textMuted: '#A07888',
    cardBg: 'rgba(255,255,255,0.70)', cardBorder: 'rgba(224,160,184,0.30)',
    cardShadow: '0 12px 40px rgba(192,96,128,0.10)',
    cardRadius: '24px', innerCardBg: 'rgba(255,245,248,0.80)',
    buttonRadius: '16px',
    headerLabel: 'הזמנה אישית', footerText: 'מחכים לכם בשמחה', Icon: Heart,
    swatch: ['#FEF5F5', '#C06080', '#E8A0B8'],
  },

  // ── BIRTHDAY ─────────────────────────────────────────────
  birthday_warm: {
    id: 'birthday_warm', name: 'חם ועליז',
    layout: 'card', isDark: false,
    pageBg: '#FEF9F0', glowHex: '#FADCB0',
    accentHex: '#E07B2A', accentShadow: 'rgba(224,123,42,0.24)',
    accentBorder: '#E8A05E', accentText: '#A85218',
    accentIcon: '#D4701E', accentVia: '#E8A05E',
    textPrimary: '#1A1208', textSecondary: '#5C3D18', textMuted: '#8C6040',
    cardBg: 'rgba(255,255,255,0.88)', cardBorder: 'rgba(255,255,255,0.70)',
    cardShadow: '0 20px 50px rgba(180,100,30,0.12)',
    cardRadius: '30px', innerCardBg: '#FFFBF4',
    buttonRadius: '22px',
    headerLabel: 'הזמנה לחגוג', footerText: 'מחכים לחגוג איתך', Icon: Cake,
    swatch: ['#FEF9F0', '#E07B2A', '#FADCB0'],
  },

  birthday_pop: {
    id: 'birthday_pop', name: 'פסטיבל צבעים',
    layout: 'bold', isDark: true,
    pageBg: '#4C1D95', glowHex: '#FCD34D20',
    accentHex: '#FCD34D', accentShadow: 'rgba(252,211,77,0.30)',
    accentBorder: '#F59E0B', accentText: '#FCD34D',
    accentIcon: '#FCD34D', accentVia: '#FCD34D',
    ...DARK_TEXT,
    cardBg: 'rgba(255,255,255,0.08)', cardBorder: 'rgba(255,255,255,0.12)',
    cardShadow: '0 20px 50px rgba(0,0,0,0.35)',
    cardRadius: '28px', innerCardBg: 'rgba(255,255,255,0.06)',
    buttonRadius: '14px',
    headerLabel: 'הזמנה לחגוג!', footerText: 'יהיה כיף!', Icon: Cake,
    swatch: ['#4C1D95', '#FCD34D', '#FFFFFF'],
  },

  birthday_elegant: {
    id: 'birthday_elegant', name: 'לילה אלגנטי',
    layout: 'card', isDark: true,
    pageBg: '#0F172A', glowHex: '#F0C04018',
    accentHex: '#F0C040', accentShadow: 'rgba(240,192,64,0.28)',
    accentBorder: '#C89820', accentText: '#F0C040',
    accentIcon: '#F0C040', accentVia: '#C89820',
    ...DARK_TEXT,
    cardBg: 'rgba(255,255,255,0.07)', cardBorder: 'rgba(255,255,255,0.10)',
    cardShadow: '0 24px 60px rgba(0,0,0,0.40)',
    cardRadius: '30px', innerCardBg: 'rgba(255,255,255,0.04)',
    buttonRadius: '22px',
    headerLabel: 'הזמנה לחגוג', footerText: 'מחכים לכם', Icon: Cake,
    swatch: ['#0F172A', '#F0C040', '#FFFFFF'],
  },

  // ── BAR MITZVAH ──────────────────────────────────────────
  bar_mitzvah_royal: {
    id: 'bar_mitzvah_royal', name: 'כחול מלכותי',
    layout: 'card', isDark: false,
    pageBg: '#F0F5FF', glowHex: '#B8D0F5',
    accentHex: '#3B72C5', accentShadow: 'rgba(59,114,197,0.24)',
    accentBorder: '#7AAAE0', accentText: '#1E4A8A',
    accentIcon: '#2D61B0', accentVia: '#7AAAE0',
    textPrimary: '#0A1A3A', textSecondary: '#2A4A7A', textMuted: '#5A7AAA',
    cardBg: 'rgba(255,255,255,0.86)', cardBorder: 'rgba(255,255,255,0.70)',
    cardShadow: '0 20px 50px rgba(59,114,197,0.14)',
    cardRadius: '32px', innerCardBg: '#F5F8FF',
    buttonRadius: '24px',
    headerLabel: 'הזמנה לשמחה', footerText: 'מחכים לראותכם', Icon: Star,
    swatch: ['#F0F5FF', '#3B72C5', '#7AAAE0'],
  },

  bar_mitzvah_silver: {
    id: 'bar_mitzvah_silver', name: 'מודרני נקי',
    layout: 'minimal', isDark: false,
    pageBg: '#F8FAFC', glowHex: '#E2E8F0',
    accentHex: '#64748B', accentShadow: 'rgba(100,116,139,0.20)',
    accentBorder: '#94A3B8', accentText: '#334155',
    accentIcon: '#64748B', accentVia: '#94A3B8',
    textPrimary: '#0F172A', textSecondary: '#334155', textMuted: '#64748B',
    cardBg: 'rgba(255,255,255,0.80)', cardBorder: 'rgba(148,163,184,0.25)',
    cardShadow: '0 8px 24px rgba(0,0,0,0.06)',
    cardRadius: '20px', innerCardBg: '#FFFFFF',
    buttonRadius: '12px',
    headerLabel: 'הזמנה לשמחה', footerText: 'מחכים לכם', Icon: Star,
    swatch: ['#F8FAFC', '#64748B', '#E2E8F0'],
  },

  bar_mitzvah_gold: {
    id: 'bar_mitzvah_gold', name: 'זהב ירושלמי',
    layout: 'bold', isDark: true,
    pageBg: '#78350F', glowHex: '#FCD34D15',
    accentHex: '#FCD34D', accentShadow: 'rgba(252,211,77,0.28)',
    accentBorder: '#F59E0B', accentText: '#FCD34D',
    accentIcon: '#FCD34D', accentVia: '#F59E0B',
    ...DARK_TEXT,
    cardBg: 'rgba(255,255,255,0.08)', cardBorder: 'rgba(255,255,255,0.12)',
    cardShadow: '0 20px 50px rgba(0,0,0,0.35)',
    cardRadius: '30px', innerCardBg: 'rgba(255,255,255,0.06)',
    buttonRadius: '22px',
    headerLabel: 'הזמנה לשמחה', footerText: 'מחכים לראותכם', Icon: Star,
    swatch: ['#78350F', '#FCD34D', '#FFFFFF'],
  },

  // ── BAT MITZVAH ──────────────────────────────────────────
  bat_mitzvah_lavender: {
    id: 'bat_mitzvah_lavender', name: 'לבנדר רומנטי',
    layout: 'card', isDark: false,
    pageBg: '#FDF0FF', glowHex: '#E8C0F8',
    accentHex: '#9B5CC8', accentShadow: 'rgba(155,92,200,0.24)',
    accentBorder: '#C08DE0', accentText: '#6A3492',
    accentIcon: '#8548B5', accentVia: '#C08DE0',
    textPrimary: '#1A0A2A', textSecondary: '#4A2070', textMuted: '#8060A0',
    cardBg: 'rgba(255,255,255,0.86)', cardBorder: 'rgba(255,255,255,0.70)',
    cardShadow: '0 20px 50px rgba(155,92,200,0.14)',
    cardRadius: '32px', innerCardBg: '#FDF8FF',
    buttonRadius: '24px',
    headerLabel: 'הזמנה לשמחה', footerText: 'מחכים לראותכם', Icon: Star,
    swatch: ['#FDF0FF', '#9B5CC8', '#C08DE0'],
  },

  bat_mitzvah_rose_gold: {
    id: 'bat_mitzvah_rose_gold', name: 'רוז גולד',
    layout: 'minimal', isDark: false,
    pageBg: '#FFF5F5', glowHex: '#F8D8D0',
    accentHex: '#C4806A', accentShadow: 'rgba(196,128,106,0.20)',
    accentBorder: '#E0A890', accentText: '#8A4A38',
    accentIcon: '#C4806A', accentVia: '#E0A890',
    textPrimary: '#2A1010', textSecondary: '#6A3020', textMuted: '#A06050',
    cardBg: 'rgba(255,255,255,0.75)', cardBorder: 'rgba(224,168,144,0.30)',
    cardShadow: '0 8px 28px rgba(196,128,106,0.10)',
    cardRadius: '20px', innerCardBg: '#FFF8F6',
    buttonRadius: '16px',
    headerLabel: 'הזמנה לשמחה', footerText: 'מחכים לראותכם', Icon: Star,
    swatch: ['#FFF5F5', '#C4806A', '#E0A890'],
  },

  bat_mitzvah_teal: {
    id: 'bat_mitzvah_teal', name: 'טיל ולבן',
    layout: 'bold', isDark: true,
    pageBg: '#0F766E', glowHex: '#FFFFFF10',
    accentHex: '#A7F3D0', accentShadow: 'rgba(167,243,208,0.25)',
    accentBorder: 'rgba(255,255,255,0.40)', accentText: '#FFFFFF',
    accentIcon: '#A7F3D0', accentVia: 'rgba(255,255,255,0.60)',
    ...DARK_TEXT,
    cardBg: 'rgba(255,255,255,0.10)', cardBorder: 'rgba(255,255,255,0.15)',
    cardShadow: '0 20px 50px rgba(0,0,0,0.30)',
    cardRadius: '28px', innerCardBg: 'rgba(255,255,255,0.07)',
    buttonRadius: '20px',
    headerLabel: 'הזמנה לשמחה', footerText: 'מחכים לראותכם', Icon: Star,
    swatch: ['#0F766E', '#A7F3D0', '#FFFFFF'],
  },

  // ── BRIT ─────────────────────────────────────────────────
  brit_sky: {
    id: 'brit_sky', name: 'תכלת רך',
    layout: 'card', isDark: false,
    pageBg: '#F0F8FF', glowHex: '#B0DDF5',
    accentHex: '#2A8DC5', accentShadow: 'rgba(42,141,197,0.24)',
    accentBorder: '#6BBCE0', accentText: '#1460A0',
    accentIcon: '#1E7EBA', accentVia: '#6BBCE0',
    textPrimary: '#0A1E36', textSecondary: '#1A4060', textMuted: '#4A7090',
    cardBg: 'rgba(255,255,255,0.86)', cardBorder: 'rgba(255,255,255,0.70)',
    cardShadow: '0 20px 50px rgba(42,141,197,0.12)',
    cardRadius: '32px', innerCardBg: '#F5FBFF',
    buttonRadius: '24px',
    headerLabel: 'הזמנה לשמחה', footerText: 'מחכים לראותכם', Icon: Star,
    swatch: ['#F0F8FF', '#2A8DC5', '#B0DDF5'],
  },

  brit_cream: {
    id: 'brit_cream', name: 'קרם וזהב',
    layout: 'minimal', isDark: false,
    pageBg: '#FEFCE8', glowHex: '#FEF08A',
    accentHex: '#CA8A04', accentShadow: 'rgba(202,138,4,0.22)',
    accentBorder: '#EAB308', accentText: '#854D0E',
    accentIcon: '#CA8A04', accentVia: '#EAB308',
    textPrimary: '#1C1408', textSecondary: '#4A3010', textMuted: '#8A6030',
    cardBg: 'rgba(255,255,255,0.75)', cardBorder: 'rgba(234,179,8,0.25)',
    cardShadow: '0 8px 24px rgba(202,138,4,0.10)',
    cardRadius: '18px', innerCardBg: '#FFFFF5',
    buttonRadius: '14px',
    headerLabel: 'הזמנה לשמחה', footerText: 'מחכים לראותכם', Icon: Star,
    swatch: ['#FEFCE8', '#CA8A04', '#FEF08A'],
  },

  brit_white: {
    id: 'brit_white', name: 'מינימל לבן',
    layout: 'minimal', isDark: false,
    pageBg: '#FFFFFF', glowHex: '#DBEAFE',
    accentHex: '#3B82F6', accentShadow: 'rgba(59,130,246,0.20)',
    accentBorder: '#93C5FD', accentText: '#1D4ED8',
    accentIcon: '#3B82F6', accentVia: '#93C5FD',
    textPrimary: '#0F172A', textSecondary: '#334155', textMuted: '#64748B',
    cardBg: 'rgba(255,255,255,0.90)', cardBorder: 'rgba(147,197,253,0.35)',
    cardShadow: '0 4px 20px rgba(59,130,246,0.08)',
    cardRadius: '16px', innerCardBg: '#F0F9FF',
    buttonRadius: '12px',
    headerLabel: 'הזמנה לשמחה', footerText: 'מחכים לראותכם', Icon: Star,
    swatch: ['#FFFFFF', '#3B82F6', '#DBEAFE'],
  },

  // ── ENGAGEMENT ───────────────────────────────────────────
  engagement_rose: {
    id: 'engagement_rose', name: 'ורדרד רומנטי',
    layout: 'card', isDark: false,
    pageBg: '#FFF5F8', glowHex: '#F8C0CC',
    accentHex: '#D4536A', accentShadow: 'rgba(212,83,106,0.24)',
    accentBorder: '#E8909E', accentText: '#A02E4A',
    accentIcon: '#C04060', accentVia: '#E8909E',
    textPrimary: '#2A0A12', textSecondary: '#6A2030', textMuted: '#A06070',
    cardBg: 'rgba(255,255,255,0.86)', cardBorder: 'rgba(255,255,255,0.70)',
    cardShadow: '0 20px 50px rgba(212,83,106,0.12)',
    cardRadius: '34px', innerCardBg: '#FFF8FA',
    buttonRadius: '24px',
    headerLabel: 'הזמנה לאירוסין', footerText: 'מחכים לכם בשמחה', Icon: Heart,
    swatch: ['#FFF5F8', '#D4536A', '#F8C0CC'],
  },

  engagement_crimson: {
    id: 'engagement_crimson', name: 'אדום וזהב',
    layout: 'bold', isDark: true,
    pageBg: '#881337', glowHex: '#FCD34D12',
    accentHex: '#FCD34D', accentShadow: 'rgba(252,211,77,0.28)',
    accentBorder: '#F59E0B', accentText: '#FCD34D',
    accentIcon: '#FCD34D', accentVia: '#F59E0B',
    ...DARK_TEXT,
    cardBg: 'rgba(255,255,255,0.08)', cardBorder: 'rgba(255,255,255,0.12)',
    cardShadow: '0 24px 60px rgba(0,0,0,0.40)',
    cardRadius: '32px', innerCardBg: 'rgba(255,255,255,0.05)',
    buttonRadius: '24px',
    headerLabel: 'הזמנה לאירוסין', footerText: 'מחכים לכם בשמחה', Icon: Heart,
    swatch: ['#881337', '#FCD34D', '#FFFFFF'],
  },

  engagement_blush: {
    id: 'engagement_blush', name: 'בלאש מודרני',
    layout: 'minimal', isDark: false,
    pageBg: '#FFF9FB', glowHex: '#FDDCEC',
    accentHex: '#E879A0', accentShadow: 'rgba(232,121,160,0.20)',
    accentBorder: '#F0A8C0', accentText: '#B03A68',
    accentIcon: '#E879A0', accentVia: '#F0A8C0',
    textPrimary: '#1A0810', textSecondary: '#5A1A30', textMuted: '#9A5070',
    cardBg: 'rgba(255,255,255,0.72)', cardBorder: 'rgba(240,168,192,0.28)',
    cardShadow: '0 8px 24px rgba(232,121,160,0.10)',
    cardRadius: '22px', innerCardBg: '#FFF0F5',
    buttonRadius: '18px',
    headerLabel: 'הזמנה לאירוסין', footerText: 'מחכים לכם', Icon: Heart,
    swatch: ['#FFF9FB', '#E879A0', '#F0A8C0'],
  },

  // ── CONFERENCE ───────────────────────────────────────────
  conference_slate: {
    id: 'conference_slate', name: 'עסקי מקצועי',
    layout: 'card', isDark: false,
    pageBg: '#F5F6F8', glowHex: '#C8D0DE',
    accentHex: '#4A5568', accentShadow: 'rgba(74,85,104,0.24)',
    accentBorder: '#8A9AB0', accentText: '#2D3748',
    accentIcon: '#3D4A5C', accentVia: '#8A9AB0',
    textPrimary: '#1A2030', textSecondary: '#3D4A5C', textMuted: '#64748B',
    cardBg: 'rgba(255,255,255,0.88)', cardBorder: 'rgba(255,255,255,0.70)',
    cardShadow: '0 16px 40px rgba(74,85,104,0.12)',
    cardRadius: '24px', innerCardBg: '#F8F9FA',
    buttonRadius: '16px',
    headerLabel: 'הזמנה לאירוע', footerText: 'מחכים לראותכם', Icon: Building2,
    swatch: ['#F5F6F8', '#4A5568', '#C8D0DE'],
  },

  conference_navy: {
    id: 'conference_navy', name: 'נייבי קורפורייט',
    layout: 'bold', isDark: true,
    pageBg: '#1E3A5F', glowHex: '#60A5FA12',
    accentHex: '#60A5FA', accentShadow: 'rgba(96,165,250,0.28)',
    accentBorder: '#3B82F6', accentText: '#93C5FD',
    accentIcon: '#60A5FA', accentVia: '#3B82F6',
    ...DARK_TEXT,
    cardBg: 'rgba(255,255,255,0.07)', cardBorder: 'rgba(255,255,255,0.10)',
    cardShadow: '0 20px 50px rgba(0,0,0,0.38)',
    cardRadius: '20px', innerCardBg: 'rgba(255,255,255,0.04)',
    buttonRadius: '12px',
    headerLabel: 'הזמנה לאירוע', footerText: 'מחכים לראותכם', Icon: Building2,
    swatch: ['#1E3A5F', '#60A5FA', '#FFFFFF'],
  },

  conference_minimal: {
    id: 'conference_minimal', name: 'מינימל לבן',
    layout: 'minimal', isDark: false,
    pageBg: '#FFFFFF', glowHex: '#F3F4F6',
    accentHex: '#111827', accentShadow: 'rgba(17,24,39,0.18)',
    accentBorder: '#D1D5DB', accentText: '#111827',
    accentIcon: '#374151', accentVia: '#9CA3AF',
    textPrimary: '#111827', textSecondary: '#374151', textMuted: '#6B7280',
    cardBg: 'rgba(255,255,255,0.90)', cardBorder: 'rgba(209,213,219,0.50)',
    cardShadow: '0 2px 12px rgba(0,0,0,0.06)',
    cardRadius: '12px', innerCardBg: '#F9FAFB',
    buttonRadius: '8px',
    headerLabel: 'הזמנה לאירוע', footerText: 'מחכים לראותכם', Icon: Building2,
    swatch: ['#FFFFFF', '#111827', '#D1D5DB'],
  },

  // ── OTHER ────────────────────────────────────────────────
  other_neutral: {
    id: 'other_neutral', name: 'ניטראלי',
    layout: 'card', isDark: false,
    pageBg: '#F6F6F6', glowHex: '#C8CCD8',
    accentHex: '#5A6478', accentShadow: 'rgba(90,100,120,0.24)',
    accentBorder: '#8A96A8', accentText: '#3A4258',
    accentIcon: '#4A5468', accentVia: '#8A96A8',
    textPrimary: '#1A1C22', textSecondary: '#3A4258', textMuted: '#6A7288',
    cardBg: 'rgba(255,255,255,0.88)', cardBorder: 'rgba(255,255,255,0.70)',
    cardShadow: '0 16px 40px rgba(90,100,120,0.12)',
    cardRadius: '28px', innerCardBg: '#F8F8FA',
    buttonRadius: '20px',
    headerLabel: 'הזמנה לאירוע', footerText: 'מחכים לכם', Icon: Sparkles,
    swatch: ['#F6F6F6', '#5A6478', '#C8CCD8'],
  },

  other_ocean: {
    id: 'other_ocean', name: 'עמוק אוקיינוס',
    layout: 'bold', isDark: true,
    pageBg: '#0C4A6E', glowHex: '#38BDF812',
    accentHex: '#38BDF8', accentShadow: 'rgba(56,189,248,0.28)',
    accentBorder: '#0EA5E9', accentText: '#7DD3FC',
    accentIcon: '#38BDF8', accentVia: '#0EA5E9',
    ...DARK_TEXT,
    cardBg: 'rgba(255,255,255,0.08)', cardBorder: 'rgba(255,255,255,0.12)',
    cardShadow: '0 20px 50px rgba(0,0,0,0.36)',
    cardRadius: '28px', innerCardBg: 'rgba(255,255,255,0.05)',
    buttonRadius: '20px',
    headerLabel: 'הזמנה לאירוע', footerText: 'מחכים לכם', Icon: Sparkles,
    swatch: ['#0C4A6E', '#38BDF8', '#FFFFFF'],
  },

  other_forest: {
    id: 'other_forest', name: 'ירוק יער',
    layout: 'card', isDark: false,
    pageBg: '#F0F7F0', glowHex: '#BBF7D0',
    accentHex: '#166534', accentShadow: 'rgba(22,101,52,0.22)',
    accentBorder: '#4ADE80', accentText: '#14532D',
    accentIcon: '#166534', accentVia: '#4ADE80',
    textPrimary: '#0A1E0A', textSecondary: '#14532D', textMuted: '#3D7A50',
    cardBg: 'rgba(255,255,255,0.86)', cardBorder: 'rgba(255,255,255,0.70)',
    cardShadow: '0 16px 40px rgba(22,101,52,0.10)',
    cardRadius: '28px', innerCardBg: '#F5FFF5',
    buttonRadius: '20px',
    headerLabel: 'הזמנה לאירוע', footerText: 'מחכים לכם', Icon: Sparkles,
    swatch: ['#F0F7F0', '#166534', '#BBF7D0'],
  },
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const EVENT_TYPE_TEMPLATES: Record<string, string[]> = {
  wedding:      ['wedding_classic',       'wedding_modern',         'wedding_floral'],
  birthday:     ['birthday_warm',         'birthday_pop',           'birthday_elegant'],
  bar_mitzvah:  ['bar_mitzvah_royal',     'bar_mitzvah_silver',     'bar_mitzvah_gold'],
  bat_mitzvah:  ['bat_mitzvah_lavender',  'bat_mitzvah_rose_gold',  'bat_mitzvah_teal'],
  brit:         ['brit_sky',              'brit_cream',             'brit_white'],
  engagement:   ['engagement_rose',       'engagement_crimson',     'engagement_blush'],
  conference:   ['conference_slate',      'conference_navy',        'conference_minimal'],
  other:        ['other_neutral',         'other_ocean',            'other_forest'],
};

export function getDefaultTemplate(eventType?: string | null): string {
  return EVENT_TYPE_TEMPLATES[eventType ?? '']?.[0] ?? 'wedding_classic';
}

/** Look up a template by its id. Falls back to wedding_classic. */
export function getRsvpTheme(templateId?: string | null): RsvpTheme {
  return TEMPLATES[templateId ?? ''] ?? TEMPLATES.wedding_classic;
}
