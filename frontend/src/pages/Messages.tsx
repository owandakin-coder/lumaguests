import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, CheckSquare, Square, Users,
  X, ChevronDown, ChevronUp, Send, Search,
} from 'lucide-react';
import { Guest, RsvpStatus } from '../types';
import { rsvpService, guestService } from '../services/supabase';
import { useEvent } from '../hooks/useEvent';
import {
  buildGuestRsvpMessage,
  buildGuestRsvpWhatsAppUrl,
} from '../utils/rsvpShare';

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
  GROOM:   'מצד החתן',
  BRIDE:   'מצד הכלה',
  FAMILY:  'מצד המשפחה',
  FRIENDS: 'מצד החברים',
  WORK:    'מצד העבודה',
};

const TEMPLATES: Template[] = [
  {
    id: 'rsvp',
    label: 'בקשת אישור',
    emoji: '📩',
    build: (name, link, side) => {
      const sideTxt = side ? ` ${side}` : '';
      return link
        ? `שלום ${name}! 🎉\nהוזמנת${sideTxt} לאירוע שלנו.\nנשמח לאישורך:\n👉 ${link}`
        : `שלום ${name}! 🎉\nהוזמנת${sideTxt} לאירוע שלנו. נשמח לאישורך.`;
    },
  },
  {
    id: 'reminder',
    label: 'תזכורת',
    emoji: '⏰',
    build: (name, link, side) => {
      const sideTxt = side ? ` (${side})` : '';
      return link
        ? `שלום ${name}! 👋\nתזכורת — האירוע${sideTxt} מתקרב!\nמאשר/ת הגעה?\n👉 ${link}`
        : `שלום ${name}! 👋\nהאירוע${sideTxt} מתקרב, נשמח לראותך!`;
    },
  },
  {
    id: 'thanks',
    label: 'תודה',
    emoji: '🙏',
    build: (name, _) =>
      `שלום ${name}! 🙏\nתודה על אישורך — מחכים לך באירוע!`,
  },
];

const rsvpDot: Record<RsvpStatus, string> = {
  CONFIRMED: '#10B981',
  PENDING:   '#F59E0B',
  DECLINED:  '#F87171',
};
const rsvpLabel: Record<RsvpStatus, string> = {
  CONFIRMED: 'אישר',
  PENDING:   'ממתין',
  DECLINED:  'לא מגיע',
};

const avBgs = [
  ['#FDE68A','#92400E'],['#BFDBFE','#1E40AF'],
  ['#DDD6FE','#5B21B6'],['#A7F3D0','#065F46'],
  ['#FBCFE8','#9D174D'],['#FED7AA','#9A3412'],
];
function initials(n: string) {
  const p = n.trim().split(/\s+/).filter(Boolean);
  return !p.length ? '?' : p.length === 1 ? p[0][0].toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase();
}
function avBg(n: string) {
  let h = 0; for (const c of n) h = c.charCodeAt(0) + ((h << 5) - h);
  return avBgs[Math.abs(h) % avBgs.length];
}

const filterTabs: { id: FilterType; label: string }[] = [
  { id: 'PENDING',   label: 'ממתינים'    },
  { id: 'CONFIRMED', label: 'אישרו'      },
  { id: 'DECLINED',  label: 'לא מגיעים' },
  { id: 'ALL',       label: 'הכל'        },
];

export const Messages = ({ guests, userId, initialFilter = 'PENDING' }: MessagesProps) => {
  const [filter, setFilter]       = useState<FilterType>(initialFilter);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState('rsvp');
  const [showTpl, setShowTpl]     = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [sentIds, setSentIds]     = useState<Set<string>>(new Set());
  const { event } = useEvent();

  const filtered = useMemo(() => guests.filter(g => {
    const s    = g.rsvpStatus || g.rsvp_status;
    const name = (g.fullName || g.full_name).toLowerCase();
    const q    = search.toLowerCase();
    return (filter === 'ALL' || s === filter) && (q === '' || name.includes(q) || g.phone.includes(q));
  }), [guests, filter, search]);

  const counts = useMemo(() => ({
    PENDING:   guests.filter(g => (g.rsvpStatus || g.rsvp_status) === 'PENDING').length,
    CONFIRMED: guests.filter(g => (g.rsvpStatus || g.rsvp_status) === 'CONFIRMED').length,
    DECLINED:  guests.filter(g => (g.rsvpStatus || g.rsvp_status) === 'DECLINED').length,
    ALL:       guests.length,
  }), [guests]);

  const activeTpl = TEMPLATES.find(t => t.id === templateId) ?? TEMPLATES[0];
  // Use full guests list (not filtered) so the queue always shows selected guests
  // even if the active filter/search changes after selection
  const selectedList = guests.filter(g => selected.has(g.id));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(g => g.id)));
    }
  };

  const openWhatsApp = async (g: Guest) => {
    const name = g.fullName || g.full_name;
    let token  = g.rsvp_token;

    if (templateId === 'rsvp') {
      if (!token) {
        token = rsvpService.generateToken();
        try {
          await guestService.update(g.id, { rsvp_token: token }, userId);
          g.rsvp_token = token;
        } catch {
          window.alert('לא הצלחנו ליצור קישור RSVP אישי למוזמן הזה. נסה שוב.');
          return;
        }
      }

      try {
        const isReady = await rsvpService.verifyToken(token);
        if (!isReady) {
          window.alert('קישור ה-RSVP האישי לא זמין כרגע. צריך להריץ את RSVP_MIGRATION.sql ב-Supabase.');
          return;
        }
      } catch {
        window.alert('קישור ה-RSVP האישי לא זמין כרגע. צריך להריץ את RSVP_MIGRATION.sql ב-Supabase.');
        return;
      }

      const rsvpLink = rsvpService.buildLink(token);
      const msg = buildGuestRsvpMessage(name, event, rsvpLink);
      window.open(buildGuestRsvpWhatsAppUrl(g.phone, msg), '_blank');
      setSentIds(prev => new Set(prev).add(g.id));
      return;
    }

    // If guest has no token, generate and save one now
    if (!token) {
      token = rsvpService.generateToken();
      try {
        await guestService.update(g.id, { rsvp_token: token }, userId);
        // update local ref so queue doesn't re-generate
        g.rsvp_token = token;
      } catch {
        token = undefined; // send without link if update fails
      }
    }

    const link  = token ? rsvpService.buildLink(token) : null;
    const side  = sideLabel[g.category] ?? undefined;
    const msg   = activeTpl.build(name, link, side);
    const phone = g.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setSentIds(prev => new Set(prev).add(g.id));
  };

  const handleSendAll = () => {
    setSentIds(new Set());
    setShowQueue(true);
  };

  const allSent = selectedList.length > 0 && selectedList.every(g => sentIds.has(g.id));

  return (
    <div className="space-y-4 pt-1 pb-2">

      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold text-charcoal-900">הודעות</h1>
        <p className="text-[12px] text-charcoal-400 mt-0.5">שליחת הודעות WhatsApp למוזמנים</p>
      </div>

      {/* Filter tabs */}
      <div className="flex rounded-2xl p-1" style={{ background: 'rgba(0,0,0,0.06)' }}>
        {filterTabs.map(f => (
          <button key={f.id} onClick={() => { setFilter(f.id); setSelected(new Set()); }}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 flex flex-col items-center gap-0.5 ${
              filter === f.id ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500'
            }`}>
            {f.label}
            <span className={`text-[10px] font-semibold ${filter === f.id ? 'text-charcoal-400' : 'text-charcoal-400'}`}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(new Set()); }}
          placeholder="חיפוש לפי שם או טלפון..."
          className="w-full h-[48px] pr-11 pl-4 rounded-[24px] bg-white text-[14px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 transition"
          style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setSelected(new Set()); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-charcoal-200 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-charcoal-600" />
          </button>
        )}
      </div>

      {/* Template picker */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <button
          onClick={() => setShowTpl(!showTpl)}
          className="w-full flex items-center gap-3 px-4 py-3.5"
        >
          <div className="w-9 h-9 rounded-xl bg-charcoal-50 flex items-center justify-center text-lg flex-shrink-0">
            {activeTpl.emoji}
          </div>
          <div className="flex-1 text-right">
            <p className="text-[11px] text-charcoal-400 font-medium">תבנית הודעה</p>
            <p className="text-[14px] font-bold text-charcoal-900">{activeTpl.label}</p>
          </div>
          {showTpl ? <ChevronUp className="w-4 h-4 text-charcoal-400" /> : <ChevronDown className="w-4 h-4 text-charcoal-400" />}
        </button>

        <AnimatePresence>
          {showTpl && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-charcoal-100"
            >
              {TEMPLATES.map(t => (
                <button key={t.id}
                  onClick={() => { setTemplateId(t.id); setShowTpl(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    t.id === templateId ? 'bg-charcoal-50' : 'active:bg-charcoal-50/60'
                  }`}>
                  <span className="text-lg">{t.emoji}</span>
                  <span className="text-[13px] font-semibold text-charcoal-900">{t.label}</span>
                  {t.id === templateId && (
                    <div className="mr-auto w-1.5 h-1.5 rounded-full bg-charcoal-900" />
                  )}
                </button>
              ))}

              {/* Message preview */}
              <div className="mx-4 mb-4 mt-1 p-3 rounded-xl bg-charcoal-50">
                <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wide mb-1">תצוגה מקדימה</p>
                <p className="text-[12px] text-charcoal-700 leading-relaxed whitespace-pre-line">
                  {activeTpl.build('שם המוזמן', 'https://...')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Select all bar */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <button onClick={toggleAll} className="flex items-center gap-2 active:opacity-70 transition-opacity">
            {selected.size === filtered.length
              ? <CheckSquare className="w-4 h-4 text-charcoal-900" />
              : <Square className="w-4 h-4 text-charcoal-400" />
            }
            <span className="text-[13px] font-semibold text-charcoal-700">
              {selected.size === filtered.length ? 'בטל בחירה' : 'בחר הכל'}
            </span>
          </button>
          {selected.size > 0 && (
            <span className="text-[12px] font-bold text-charcoal-900">{selected.size} נבחרו</span>
          )}
        </div>
      )}

      {/* Quick "send to all pending" shortcut */}
      {filter === 'PENDING' && filtered.length > 0 && selected.size === 0 && (
        <motion.button
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            setSelected(new Set(filtered.map(g => g.id)));
            setSentIds(new Set());
            setShowQueue(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold active:scale-[0.98] transition-transform"
          style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', color: '#92400E' }}
        >
          <Send className="w-4 h-4" />
          שלח תזכורת לכל {filtered.length} הממתינים
        </motion.button>
      )}

      {/* Guest list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-charcoal-100 flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-charcoal-300" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] font-bold text-charcoal-700">אין מוזמנים בקטגוריה זו</p>
          <p className="text-[12px] text-charcoal-400 mt-1">נסה סינון אחר</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          {filtered.map((g, idx) => {
            const name   = g.fullName || g.full_name;
            const status = (g.rsvpStatus || g.rsvp_status) as RsvpStatus;
            const [bg, fg] = avBg(name);
            const isSelected = selected.has(g.id);
            return (
              <div key={g.id}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                  idx < filtered.length - 1 ? 'border-b border-charcoal-100/60' : ''
                } ${isSelected ? 'bg-charcoal-50/50' : ''}`}>
                <button onClick={() => toggleSelect(g.id)} className="flex-shrink-0">
                  {isSelected
                    ? <CheckSquare className="w-5 h-5 text-charcoal-900" />
                    : <Square className="w-5 h-5 text-charcoal-300" />}
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: bg, color: fg }}>
                  {initials(name)}
                </div>
                <div className="flex-1 min-w-0" onClick={() => toggleSelect(g.id)}>
                  <p className="text-[14px] font-semibold text-charcoal-900 truncate">{name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: rsvpDot[status] }} />
                    <span className="text-[11px] text-charcoal-400">{rsvpLabel[status]}</span>
                  </div>
                </div>
                <button
                  onClick={() => openWhatsApp(g)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
                  style={{ background: sentIds.has(g.id) ? 'rgba(16,185,129,0.15)' : '#F0FDF4' }}
                >
                  <MessageCircle
                    className="w-4 h-4"
                    style={{ color: sentIds.has(g.id) ? '#10B981' : '#059669' }}
                    strokeWidth={2.2}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky send button — bottom-24 clears the fixed bottom nav */}
      {selected.size > 0 && (
        <div className="sticky bottom-24 pt-2">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSendAll}
            className="w-full py-4 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform"
            style={{
              background: '#1A1916',
              boxShadow: '0 4px 20px rgba(26,25,22,0.25)',
            }}
          >
            <Send className="w-4 h-4" />
            שלח ל-{selected.size} נבחרים
          </motion.button>
        </div>
      )}

      {/* Send queue bottom sheet */}
      {createPortal(
        <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setShowQueue(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="bg-white w-full max-w-[430px] rounded-t-3xl flex flex-col"
              style={{
                maxHeight: '85dvh',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              }}
            >
              {/* Handle + header */}
              <div className="px-6 pt-5 pb-4 border-b border-charcoal-100 flex-shrink-0">
                <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-5" />
                <div className="flex items-center justify-between">
                  <h3 className="text-[18px] font-bold text-charcoal-900">שליחת הודעות</h3>
                  <button onClick={() => setShowQueue(false)}
                    className="w-8 h-8 rounded-xl bg-charcoal-100 flex items-center justify-center active:scale-90 transition-transform">
                    <X className="w-4 h-4 text-charcoal-600" />
                  </button>
                </div>
                <p className="text-[13px] text-charcoal-500 mt-1">
                  לחץ על כפתור WA ליד כל מוזמן לפתיחת שיחה
                </p>
                {/* Progress */}
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-charcoal-400">נשלח</span>
                    <span className="text-[11px] font-bold text-charcoal-700">{sentIds.size} / {selectedList.length}</span>
                  </div>
                  <div className="h-1.5 bg-charcoal-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: selectedList.length > 0 ? `${(sentIds.size / selectedList.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Guest list in queue — fills remaining space, scrollable */}
              <div className="overflow-y-auto flex-1 min-h-[180px]">
                {selectedList.map((g, idx) => {
                  const name  = g.fullName || g.full_name;
                  const sent  = sentIds.has(g.id);
                  const [bg, fg] = avBg(name);
                  return (
                    <div key={g.id}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                        idx < selectedList.length - 1 ? 'border-b border-charcoal-100/60' : ''
                      } ${sent ? 'bg-green-50/50' : ''}`}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: bg, color: fg }}>
                        {initials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-charcoal-900 truncate">{name}</p>
                        <p className="text-[11px] text-charcoal-400" dir="ltr">{g.phone}</p>
                      </div>
                      {sent ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-100">
                          <span className="text-[11px] font-bold text-green-700">נשלח ✓</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => openWhatsApp(g)}
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

              {allSent && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-5 my-4 p-4 rounded-2xl bg-green-50 text-center flex-shrink-0"
                >
                  <p className="text-[15px] font-bold text-green-700">✓ כל ההודעות נשלחו!</p>
                  <p className="text-[12px] text-green-600 mt-0.5">{selectedList.length} הודעות</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
