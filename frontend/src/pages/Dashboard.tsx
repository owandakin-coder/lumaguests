import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, CheckCircle, Clock, XCircle, MessageCircle, Upload, ChevronLeft } from 'lucide-react';
import { Guest, RsvpStatus } from '../types';

interface DashboardProps {
  guests: Guest[];
  loading: boolean;
  onAddGuest: () => void;
  onViewGuests: () => void;
  onViewGuest: (guest: Guest) => void;
}

const rsvpBadge: Record<RsvpStatus, { label: string; cls: string }> = {
  CONFIRMED: { label: 'אישר', cls: 'bg-emerald-100 text-emerald-700' },
  PENDING:   { label: 'ממתין', cls: 'bg-amber-100 text-amber-700' },
  DECLINED:  { label: 'לא מגיע', cls: 'bg-red-50 text-red-500' },
};

function getInitials(name: string) {
  return name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const avatarColors = [
  'bg-gold-200 text-gold-800',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-pink-100 text-pink-700',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export const Dashboard = ({ guests, loading, onAddGuest, onViewGuests, onViewGuest }: DashboardProps) => {
  const stats = useMemo(() => {
    const confirmed = guests.filter((g) => (g.rsvpStatus || g.rsvp_status) === 'CONFIRMED').length;
    const pending   = guests.filter((g) => (g.rsvpStatus || g.rsvp_status) === 'PENDING').length;
    const declined  = guests.filter((g) => (g.rsvpStatus || g.rsvp_status) === 'DECLINED').length;
    const total     = guests.length;
    const totalPeople = guests.reduce((sum, g) => sum + 1 + (g.companions || 0), 0);
    const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    return { confirmed, pending, declined, total, totalPeople, pct };
  }, [guests]);

  const recentGuests = useMemo(() =>
    [...guests]
      .sort((a, b) => {
        const da = new Date(a.createdAt || a.created_at || 0).getTime();
        const db = new Date(b.createdAt || b.created_at || 0).getTime();
        return db - da;
      })
      .slice(0, 3),
    [guests]
  );

  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

      {/* Greeting */}
      <motion.div variants={item}>
        <p className="text-xs text-charcoal-400 font-medium mb-0.5">{today}</p>
        <h1 className="text-[28px] font-bold text-charcoal-900 leading-tight">שלום 👋</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">האירוע שלך מתקדם יפה</p>
      </motion.div>

      {/* Hero card */}
      <motion.div
        variants={item}
        className="bg-white rounded-3xl p-5 shadow-sm"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
      >
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 w-32 bg-charcoal-100 rounded-full" />
            <div className="h-8 w-16 bg-charcoal-100 rounded-full" />
            <div className="h-2.5 bg-charcoal-100 rounded-full" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-charcoal-400 font-medium mb-1">סך הכל מוזמנים</p>
                <p className="text-5xl font-bold text-charcoal-900 leading-none">{stats.total}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-charcoal-400 font-medium mb-1">אישרו</p>
                <p className="text-2xl font-bold text-emerald-600 leading-none">{stats.pct}%</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-charcoal-100 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gradient-to-l from-gold-500 to-gold-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stats.pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              />
            </div>

            <button
              onClick={onAddGuest}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-charcoal-900 text-white text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              הוסף מוזמן
            </button>
          </>
        )}
      </motion.div>

      {/* Stat grid */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        {[
          { label: 'אישרו הגעה', value: stats.confirmed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'ממתינים',    value: stats.pending,   icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'לא מגיעים', value: stats.declined,  icon: XCircle,      color: 'text-red-500',     bg: 'bg-red-50'     },
          { label: 'סך אנשים',  value: stats.totalPeople, icon: Users,      color: 'text-blue-600',    bg: 'bg-blue-50'    },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-4"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
          >
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-4 bg-charcoal-100 rounded" />
                <div className="h-7 w-10 bg-charcoal-100 rounded-full" />
                <div className="h-3 w-16 bg-charcoal-100 rounded-full" />
              </div>
            ) : (
              <>
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${color}`} strokeWidth={2} />
                </div>
                <p className="text-2xl font-bold text-charcoal-900 leading-none mb-1">{value}</p>
                <p className="text-xs text-charcoal-400 font-medium">{label}</p>
              </>
            )}
          </div>
        ))}
      </motion.div>

      {/* Recent guests */}
      {!loading && recentGuests.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-charcoal-700">מוזמנים אחרונים</h2>
            <button
              onClick={onViewGuests}
              className="text-xs text-gold-600 font-medium flex items-center gap-0.5"
            >
              הכל
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            {recentGuests.map((guest, idx) => {
              const name = guest.fullName || guest.full_name;
              const rsvp = guest.rsvpStatus || guest.rsvp_status;
              const badge = rsvpBadge[rsvp];
              const initials = getInitials(name);
              const ac = avatarColor(name);
              return (
                <button
                  key={guest.id}
                  onClick={() => onViewGuest(guest)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-right active:bg-charcoal-50 transition-colors ${
                    idx < recentGuests.length - 1 ? 'border-b border-charcoal-100/60' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl ${ac} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-charcoal-900 truncate">{name}</p>
                    <p className="text-xs text-charcoal-400 ltr-text" dir="ltr">{guest.phone}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div variants={item}>
        <h2 className="text-sm font-semibold text-charcoal-700 mb-3">פעולות מהירות</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'הוסף מוזמן', icon: Plus, action: onAddGuest },
            { label: 'שליחת הודעה', icon: MessageCircle, action: () => {} },
            { label: 'ייבוא רשימה', icon: Upload, action: () => {} },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="bg-white rounded-2xl p-3 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <div className="w-10 h-10 rounded-2xl bg-charcoal-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-charcoal-600" strokeWidth={1.8} />
              </div>
              <span className="text-[11px] font-medium text-charcoal-600 text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
};
