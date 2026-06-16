import { Building2, Cake, Heart, Sparkles, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface RsvpTheme {
  pageBg: string;
  accentHex: string;
  accentShadow: string;
  accentBorder: string;
  accentText: string;
  accentIcon: string;
  accentVia: string;
  glowHex: string;
  headerLabel: string;
  footerText: string;
  Icon: LucideIcon;
}

const THEMES: Record<string, RsvpTheme> = {
  wedding: {
    pageBg: '#F7F2E8',
    accentHex: '#D2AB54',
    accentShadow: 'rgba(210,171,84,0.24)',
    accentBorder: '#D5B671',
    accentText: '#A8872B',
    accentIcon: '#C9A84C',
    accentVia: '#D9BC77',
    glowHex: '#F3DFA9',
    headerLabel: 'הזמנה אישית',
    footerText: 'מחכים לכם באהבה',
    Icon: Heart,
  },
  birthday: {
    pageBg: '#FEF9F0',
    accentHex: '#E07B2A',
    accentShadow: 'rgba(224,123,42,0.24)',
    accentBorder: '#E8A05E',
    accentText: '#A85218',
    accentIcon: '#D4701E',
    accentVia: '#E8A05E',
    glowHex: '#FADCB0',
    headerLabel: 'הזמנה לחגוג',
    footerText: 'מחכים לחגוג איתך',
    Icon: Cake,
  },
  bar_mitzvah: {
    pageBg: '#F0F5FF',
    accentHex: '#3B72C5',
    accentShadow: 'rgba(59,114,197,0.24)',
    accentBorder: '#7AAAE0',
    accentText: '#1E4A8A',
    accentIcon: '#2D61B0',
    accentVia: '#7AAAE0',
    glowHex: '#B8D0F5',
    headerLabel: 'הזמנה לשמחה',
    footerText: 'מחכים לראותכם',
    Icon: Star,
  },
  bat_mitzvah: {
    pageBg: '#FDF0FF',
    accentHex: '#9B5CC8',
    accentShadow: 'rgba(155,92,200,0.24)',
    accentBorder: '#C08DE0',
    accentText: '#6A3492',
    accentIcon: '#8548B5',
    accentVia: '#C08DE0',
    glowHex: '#E8C0F8',
    headerLabel: 'הזמנה לשמחה',
    footerText: 'מחכים לראותכם',
    Icon: Star,
  },
  brit: {
    pageBg: '#F0F8FF',
    accentHex: '#2A8DC5',
    accentShadow: 'rgba(42,141,197,0.24)',
    accentBorder: '#6BBCE0',
    accentText: '#1460A0',
    accentIcon: '#1E7EBA',
    accentVia: '#6BBCE0',
    glowHex: '#B0DDF5',
    headerLabel: 'הזמנה לשמחה',
    footerText: 'מחכים לראותכם',
    Icon: Star,
  },
  engagement: {
    pageBg: '#FFF5F8',
    accentHex: '#D4536A',
    accentShadow: 'rgba(212,83,106,0.24)',
    accentBorder: '#E8909E',
    accentText: '#A02E4A',
    accentIcon: '#C04060',
    accentVia: '#E8909E',
    glowHex: '#F8C0CC',
    headerLabel: 'הזמנה לאירוסין',
    footerText: 'מחכים לכם בשמחה',
    Icon: Heart,
  },
  conference: {
    pageBg: '#F5F6F8',
    accentHex: '#4A5568',
    accentShadow: 'rgba(74,85,104,0.24)',
    accentBorder: '#8A9AB0',
    accentText: '#2D3748',
    accentIcon: '#3D4A5C',
    accentVia: '#8A9AB0',
    glowHex: '#C8D0DE',
    headerLabel: 'הזמנה לאירוע',
    footerText: 'מחכים לראותכם',
    Icon: Building2,
  },
  other: {
    pageBg: '#F6F6F6',
    accentHex: '#5A6478',
    accentShadow: 'rgba(90,100,120,0.24)',
    accentBorder: '#8A96A8',
    accentText: '#3A4258',
    accentIcon: '#4A5468',
    accentVia: '#8A96A8',
    glowHex: '#C8CCD8',
    headerLabel: 'הזמנה לאירוע',
    footerText: 'מחכים לכם',
    Icon: Sparkles,
  },
};

export function getRsvpTheme(eventType?: string | null): RsvpTheme {
  return THEMES[eventType ?? ''] ?? THEMES.wedding;
}
