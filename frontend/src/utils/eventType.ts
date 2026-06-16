export type EventType =
  | 'wedding'
  | 'bar_mitzvah'
  | 'bat_mitzvah'
  | 'brit'
  | 'birthday'
  | 'engagement'
  | 'conference'
  | 'other';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding:     'חתונה',
  bar_mitzvah: 'בר מצווה',
  bat_mitzvah: 'בת מצווה',
  brit:        'ברית',
  birthday:    'יום הולדת',
  engagement:  'אירוסין',
  conference:  'כנס / אירוע',
  other:       'אחר',
};

export const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  wedding:     '💍',
  bar_mitzvah: '✡️',
  bat_mitzvah: '✡️',
  brit:        '👶',
  birthday:    '🎂',
  engagement:  '💑',
  conference:  '🎤',
  other:       '🎉',
};

export interface SideLabels {
  side1: string;
  side2: string;
  shared: string;
  side1Short: string;
  side2Short: string;
  side1Emoji: string;
  side2Emoji: string;
}

const SIDE_LABELS: Record<EventType, SideLabels> = {
  wedding:     { side1: 'צד החתן', side2: 'צד הכלה', shared: 'משותף', side1Short: 'חתן',    side2Short: 'כלה',    side1Emoji: '🤵', side2Emoji: '👰' },
  engagement:  { side1: 'צד החתן', side2: 'צד הכלה', shared: 'משותף', side1Short: 'חתן',    side2Short: 'כלה',    side1Emoji: '🤵', side2Emoji: '👰' },
  bar_mitzvah: { side1: 'צד האבא', side2: 'צד האמא', shared: 'משותף', side1Short: 'אבא',    side2Short: 'אמא',    side1Emoji: '👨', side2Emoji: '👩' },
  bat_mitzvah: { side1: 'צד האבא', side2: 'צד האמא', shared: 'משותף', side1Short: 'אבא',    side2Short: 'אמא',    side1Emoji: '👨', side2Emoji: '👩' },
  brit:        { side1: 'צד האבא', side2: 'צד האמא', shared: 'משותף', side1Short: 'אבא',    side2Short: 'אמא',    side1Emoji: '👨', side2Emoji: '👩' },
  birthday:    { side1: 'משפחה',   side2: 'חברים',   shared: 'אחרים', side1Short: 'משפחה',  side2Short: 'חברים',  side1Emoji: '👨‍👩‍👧', side2Emoji: '🎉' },
  conference:  { side1: 'קבוצה א', side2: 'קבוצה ב', shared: 'כללי',  side1Short: 'קב׳ א', side2Short: 'קב׳ ב', side1Emoji: '🔵', side2Emoji: '🟣' },
  other:       { side1: 'קבוצה א', side2: 'קבוצה ב', shared: 'כללי',  side1Short: 'קב׳ א', side2Short: 'קב׳ ב', side1Emoji: '🔵', side2Emoji: '🟣' },
};

export function getSideLabels(eventType?: string | null): SideLabels {
  return SIDE_LABELS[(eventType as EventType) ?? 'wedding'] ?? SIDE_LABELS.wedding;
}

export const ALL_EVENT_TYPES: { type: EventType; label: string; emoji: string }[] = [
  { type: 'wedding',     label: 'חתונה',       emoji: '💍' },
  { type: 'bar_mitzvah', label: 'בר מצווה',    emoji: '✡️' },
  { type: 'bat_mitzvah', label: 'בת מצווה',    emoji: '✡️' },
  { type: 'brit',        label: 'ברית',         emoji: '👶' },
  { type: 'birthday',    label: 'יום הולדת',   emoji: '🎂' },
  { type: 'engagement',  label: 'אירוסין',      emoji: '💑' },
  { type: 'conference',  label: 'כנס / אירוע', emoji: '🎤' },
  { type: 'other',       label: 'אחר',          emoji: '🎉' },
];
