import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  CheckSquare,
  Square,
  Users,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  Search,
} from 'lucide-react';
import { Guest, RsvpStatus } from '../types';
import { rsvpService, guestService, toWaPhone, openWhatsAppUrl } from '../services/supabase';
import { useEvent } from '../hooks/useEvent';
import { buildGuestRsvpMessage, buildGuestRsvpWhatsAppUrl } from '../utils/rsvpShare';

interface MessagesProps {
  guests: Guest[];
  userId: string;
  initialFilter?: FilterType;
}

type FilterType = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'ALL';

type Template = {
  id: string;
  label: string;
  emoji: string;
  build: (name: string, link: string | null, side?: string) => string;
};

const sideLabel: Partial<Record<string, string>> = {
  GROOM: 'מצד החתן',
  BRIDE: 'מצד הכלה',
  FAMILY: 'משפחה',
  FRIENDS: 'חברים',
  WORK: 'עבודה',
};

const TEMPLATES: Template[] = [
  {
    id: 'rsvp',
    label: 'בקשת אישור',
    emoji: '💌',
    build: (name, link, side) => {
      const sideTxt = side ? ` ${side}` : '';
      return link
        ? `היי ${name} 👋\nהוזמנת${sideTxt} לאירוע שלנו.\nנשמח לאישור הגעה:\n${link}`
        : `היי ${name} 👋\nהוזמנת${sideTxt} לאירוע שלנו. נשמח לאישור הגעה.`;
    },
  },
  {
    id: 'reminder',
    label: 'תזכורת',
    emoji: '⏰',
    build: (name, link, side) => {
      const sideTxt = side ? ` (${side})` : '';
      return link
        ? `היי ${name}! 👋\nתזכורת, האירוע${sideTxt} מתקרב.\nמאשר/ת הגעה?\n${link}`
        : `היי ${name}! 👋\nהאירוע${sideTxt} מתקרב, נשמח לראות אותך!`;
    },
  },
  {
    id: 'thanks',
    label: 'תודה',
    emoji: '🙏',
    build: (name) => `היי ${name}! 🙏\nתודה על אישורך, מחכים לך באירוע!`,
  },
];

const rsvpDot: Record<RsvpStatus, string> = {
  CONFIRMED: '#10B981',
  PENDING: '#F59E0B',
  DECLINED: '#F87171',
};

const rsvpLabel: Record<RsvpStatus, string> = {
  CONFIRMED: 'אישר',
  PENDING: 'ממתין',
  DECLINED: 'לא מגיע',
};

const avatarColors = [
  ['#FDE68A', '#92400E'],
  ['#BFDBFE', '#1E40AF'],
  ['#DDD6FE', '#5B21B6'],
  ['#A7F3D0', '#065F46'],
  ['#FBCFE8', '#9D174D'],
  ['#FED7AA', '#9A3412'],
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function avatarBg(name: string) {
  let hash = 0;
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const filterTabs: { id: FilterType; label: string }[] = [
  { id: 'PENDING', label: 'ממתינים' },
  { id: 'CONFIRMED', label: 'אישרו' },
  { id: 'DECLINED', label: 'לא מגיעים' },
  { id: 'ALL', label: 'הכל' },
];

export const Messages = ({ guests, userId, initialFilter = 'PENDING' }: MessagesProps) => {
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState('rsvp');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const { event } = useEvent();

  const filtered = useMemo(
    () =>
      guests.filter((guest) => {
        const status = guest.rsvpStatus || guest.rsvp_status;
        const name = (guest.fullName || guest.full_name).toLowerCase();
        const query = search.toLowerCase();
        return (filter === 'ALL' || status === filter) && (query === '' || name.includes(query) || guest.phone.includes(query));
      }),
    [filter, guests, search]
  );

  const counts = useMemo(
    () => ({
      PENDING: guests.filter((guest) => (guest.rsvpStatus || guest.rsvp_status) === 'PENDING').length,
      CONFIRMED: guests.filter((guest) => (guest.rsvpStatus || guest.rsvp_status) === 'CONFIRMED').length,
      DECLINED: guests.filter((guest) => (guest.rsvpStatus || guest.rsvp_status) === 'DECLINED').length,
      ALL: guests.length,
    }),
    [guests]
  );

  const activeTemplate = TEMPLATES.find((template) => template.id === templateId) ?? TEMPLATES[0];
  const selectedGuests = guests.filter((guest) => selected.has(guest.id));
  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const allSent = selectedGuests.length > 0 && selectedGuests.every((guest) => sentIds.has(guest.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((guest) => guest.id)));
  };

  const ensureGuestToken = async (guest: Guest) => {
    let token = guest.rsvp_token;

    if (!token) {
      token = rsvpService.generateToken();
      await guestService.update(guest.id, { rsvp_token: token }, userId, guest.event_id);
      guest.rsvp_token = token;
    }

    return token;
  };

  const openWhatsApp = async (guest: Guest) => {
    const name = guest.fullName || guest.full_name;

    if (templateId === 'rsvp') {
      try {
        const token = await ensureGuestToken(guest);
        const isReady = await rsvpService.verifyToken(token);

        if (!isReady) {
          window.alert('קישור ה-RSVP האישי לא זמין כרגע. צריך להריץ את RSVP_MIGRATION.sql ב-Supabase.');
          return;
        }

        const personalLink = rsvpService.buildPersonalRsvpLink({ rsvp_token: token });
        if (!personalLink) {
          window.alert('לא הצלחנו ליצור קישור RSVP אישי למוזמן הזה. נסה שוב.');
          return;
        }

        const message = buildGuestRsvpMessage(name, event, personalLink);
        openWhatsAppUrl(buildGuestRsvpWhatsAppUrl(guest.phone, message));
        setSentIds((prev) => new Set(prev).add(guest.id));
      } catch {
        window.alert('לא הצלחנו ליצור קישור RSVP אישי למוזמן הזה. נסה שוב.');
      }
      return;
    }

    let link: string | null = null;
    try {
      const token = await ensureGuestToken(guest);
      link = rsvpService.buildPersonalRsvpLink({ rsvp_token: token });
    } catch {
      link = null;
    }

    const side = sideLabel[guest.category] ?? undefined;
    const message = activeTemplate.build(name, link, side);
    openWhatsAppUrl(`https://wa.me/${toWaPhone(guest.phone)}?text=${encodeURIComponent(message)}`);
    setSentIds((prev) => new Set(prev).add(guest.id));
  };

  const handleSendAll = () => {
    setSentIds(new Set());
    setShowQueue(true);
  };

  return (
    <div className="space-y-4 pt-1 pb-2">
      <div>
        <h1 className="text-[28px] font-bold text-charcoal-900">הודעות</h1>
        <p className="text-[12px] text-charcoal-400 mt-0.5">שליחת הודעות WhatsApp למוזמנים</p>
      </div>

      <div className="flex rounded-2xl p-1" style={{ background: 'rgba(0,0,0,0.06)' }}>
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilter(tab.id);
              setSelected(new Set());
            }}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 flex flex-col items-center gap-0.5 ${
              filter === tab.id ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500'
            }`}
          >
            {tab.label}
            <span className="text-[10px] font-semibold text-charcoal-400">{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(new Set());
          }}
          placeholder="חיפוש לפי שם או טלפון..."
          className="w-full h-[48px] pr-11 pl-4 rounded-[24px] bg-white text-[14px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 transition"
          style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
        />
        {search ? (
          <button
            onClick={() => {
              setSearch('');
              setSelected(new Set());
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-charcoal-200 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-charcoal-600" />
          </button>
        ) : null}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <button
          onClick={() => setShowTemplatePicker((prev) => !prev)}
          className="w-full flex items-center gap-3 px-4 py-3.5"
        >
          <div className="w-9 h-9 rounded-xl bg-charcoal-50 flex items-center justify-center text-lg flex-shrink-0">
            {activeTemplate.emoji}
          </div>
          <div className="flex-1 text-right">
            <p className="text-[11px] text-charcoal-400 font-medium">תבנית הודעה</p>
            <p className="text-[14px] font-bold text-charcoal-900">{activeTemplate.label}</p>
          </div>
          {showTemplatePicker ? (
            <ChevronUp className="w-4 h-4 text-charcoal-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-charcoal-400" />
          )}
        </button>

        <AnimatePresence>
          {showTemplatePicker ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-charcoal-100"
            >
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setTemplateId(template.id);
                    setShowTemplatePicker(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    template.id === templateId ? 'bg-charcoal-50' : 'active:bg-charcoal-50/60'
                  }`}
                >
                  <span className="text-lg">{template.emoji}</span>
                  <span className="text-[13px] font-semibold text-charcoal-900">{template.label}</span>
                  {template.id === templateId ? <div className="mr-auto w-1.5 h-1.5 rounded-full bg-charcoal-900" /> : null}
                </button>
              ))}

              <div className="mx-4 mb-4 mt-1 p-3 rounded-xl bg-charcoal-50">
                <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wide mb-1">תצוגה מקדימה</p>
                <p className="text-[12px] text-charcoal-700 leading-relaxed whitespace-pre-line">
                  {activeTemplate.build('שם המוזמן', 'https://...')}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {filtered.length > 0 ? (
        <div className="flex items-center justify-between px-1">
          <button onClick={toggleAll} className="flex items-center gap-2 active:opacity-70 transition-opacity">
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-charcoal-900" />
            ) : (
              <Square className="w-4 h-4 text-charcoal-400" />
            )}
            <span className="text-[13px] font-semibold text-charcoal-700">
              {allSelected ? 'בטל בחירה' : 'בחר הכל'}
            </span>
          </button>
          {selected.size > 0 ? (
            <span className="text-[12px] font-bold text-charcoal-900">{selected.size} נבחרו</span>
          ) : null}
        </div>
      ) : null}

      {filter === 'PENDING' && filtered.length > 0 && selected.size === 0 ? (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            setSelected(new Set(filtered.map((guest) => guest.id)));
            setSentIds(new Set());
            setShowQueue(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold active:scale-[0.98] transition-transform"
          style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', color: '#92400E' }}
        >
          <Send className="w-4 h-4" />
          שלח תזכורת לכל {filtered.length} הממתינים
        </motion.button>
      ) : null}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-charcoal-100 flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-charcoal-300" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] font-bold text-charcoal-700">אין מוזמנים בקטגוריה הזו</p>
          <p className="text-[12px] text-charcoal-400 mt-1">נסה סינון אחר</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          {filtered.map((guest, index) => {
            const name = guest.fullName || guest.full_name;
            const status = (guest.rsvpStatus || guest.rsvp_status) as RsvpStatus;
            const [bg, fg] = avatarBg(name);
            const isSelected = selected.has(guest.id);

            return (
              <div
                key={guest.id}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                  index < filtered.length - 1 ? 'border-b border-charcoal-100/60' : ''
                } ${isSelected ? 'bg-charcoal-50/50' : ''}`}
              >
                <button onClick={() => toggleSelect(guest.id)} className="flex-shrink-0">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-charcoal-900" />
                  ) : (
                    <Square className="w-5 h-5 text-charcoal-300" />
                  )}
                </button>

                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: bg, color: fg }}
                >
                  {initials(name)}
                </div>

                <div className="flex-1 min-w-0" onClick={() => toggleSelect(guest.id)}>
                  <p className="text-[14px] font-semibold text-charcoal-900 truncate">{name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: rsvpDot[status] }} />
                    <span className="text-[11px] text-charcoal-400">{rsvpLabel[status]}</span>
                  </div>
                </div>

                <button
                  onClick={() => void openWhatsApp(guest)}
                  aria-label={`שלח הודעת WhatsApp ל${name}`}
                  className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
                  style={{ background: sentIds.has(guest.id) ? 'rgba(16,185,129,0.15)' : '#F0FDF4' }}
                >
                  <MessageCircle
                    className="w-4 h-4"
                    style={{ color: sentIds.has(guest.id) ? '#10B981' : '#059669' }}
                    strokeWidth={2.2}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selected.size > 0
        ? createPortal(
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed bottom-0 left-0 right-0 z-40 flex justify-center"
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 88px)',
                paddingInline: '20px',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, rgba(245,243,239,0.92) 40%, transparent 100%)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  maskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
                }}
              />
              <div className="relative w-full max-w-[390px] flex gap-2">
                <button
                  onClick={() => setSelected(new Set())}
                  className="py-4 px-5 rounded-2xl text-charcoal-700 text-[14px] font-bold active:scale-[0.98] transition-transform flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                >
                  בטל
                </button>
                <button
                  onClick={handleSendAll}
                  className="flex-1 py-4 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform"
                  style={{ background: '#1A1916', boxShadow: '0 4px 24px rgba(26,25,22,0.35)' }}
                >
                  <Send className="w-4 h-4" />
                  שלח ל-{selected.size} נבחרים
                </button>
              </div>
            </motion.div>,
            document.body
          )
        : null}

      {createPortal(
        <AnimatePresence>
          {showQueue ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
              style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => setShowQueue(false)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[430px] rounded-t-3xl flex flex-col"
                style={{
                  maxHeight: '90dvh',
                  paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
                }}
              >
                <div className="px-6 pt-5 pb-4 border-b border-charcoal-100 flex-shrink-0 sticky top-0 bg-white rounded-t-3xl z-10">
                  <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-5" />
                  <div className="flex items-center justify-between">
                    <h3 className="text-[18px] font-bold text-charcoal-900">שליחת הודעות</h3>
                    <button
                      onClick={() => setShowQueue(false)}
                      className="w-8 h-8 rounded-xl bg-charcoal-100 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <X className="w-4 h-4 text-charcoal-600" />
                    </button>
                  </div>
                  <p className="text-[13px] text-charcoal-500 mt-1">
                    לחץ על כפתור WA ליד כל מוזמן לפתיחת שיחה
                  </p>

                  <div className="mt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-charcoal-400">נשלח</span>
                      <span className="text-[11px] font-bold text-charcoal-700">
                        {sentIds.size} / {selectedGuests.length}
                      </span>
                    </div>
                    <div className="h-1.5 bg-charcoal-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{
                          width: selectedGuests.length > 0 ? `${(sentIds.size / selectedGuests.length) * 100}%` : '0%',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="overflow-y-auto flex-1 min-h-[260px]"
                  style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
                >
                  {selectedGuests.map((guest, index) => {
                    const name = guest.fullName || guest.full_name;
                    const [bg, fg] = avatarBg(name);
                    const sent = sentIds.has(guest.id);

                    return (
                      <div
                        key={guest.id}
                        className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                          index < selectedGuests.length - 1 ? 'border-b border-charcoal-100/60' : ''
                        } ${sent ? 'bg-green-50/50' : ''}`}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: bg, color: fg }}
                        >
                          {initials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-charcoal-900 truncate">{name}</p>
                          <p className="text-[11px] text-charcoal-400" dir="ltr">
                            {guest.phone}
                          </p>
                        </div>
                        {sent ? (
                          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-100">
                            <span className="text-[11px] font-bold text-green-700">נשלח ✓</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => void openWhatsApp(guest)}
                            aria-label={`שלח הודעת WhatsApp ל${name}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
                            style={{ background: '#1A1916' }}
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-white" />
                            <span className="text-[11px] font-bold text-white">שלח</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {allSent ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-5 my-4 p-4 rounded-2xl bg-green-50 text-center flex-shrink-0"
                  >
                    <p className="text-[15px] font-bold text-green-700">כל ההודעות נשלחו!</p>
                    <p className="text-[12px] text-green-600 mt-0.5">{selectedGuests.length} הודעות</p>
                  </motion.div>
                ) : null}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
