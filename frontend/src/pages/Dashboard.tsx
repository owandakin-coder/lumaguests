import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, CheckCircle, Clock, XCircle, MessageCircle, Upload } from 'lucide-react';
import { Guest, RsvpStatus } from '../types';

interface DashboardProps {
  guests: Guest[];
  loading: boolean;
  onAddGuest: () => void;
  onViewGuests: () => void;
  onViewGuest: (guest: Guest) => void;
}

const rsvpBadge: Record<RsvpStatus, { label: string; cls: string }> = {
  CONFIRMED: { label: 'אישר',     cls: 'bg-emerald-100 text-emerald-700' },
  PENDING:   { label: 'ממתין',    cls: 'bg-amber-100 text-amber-700'     },
  DECLINED:  { label: 'לא מגיע', cls: 'bg-red-50 text-red-500'          },
};

const avatarColors = [
  'bg-gold-200 text-gold-800', 'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700',
  'bg-pink-100 text-pink-700', 'bg-orange-100 text-orange-700',
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item    = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

export const Dashboard = ({ guests, loading, onAddGuest, onViewGuests, onViewGuest }: DashboardProps) => {
  const stats = useMemo(() => {
    const confirmed  = guests.filter((g) => (g.rsvpStatus || g.rsvp_status) === 'CONFIRMED').length;
    const pending    = guests.filter((g) => (g.rsvpStatus || g.rsvp_status) === 'PENDING').length;
    const declined   = guests.filter((g) => (g.rsvpStatus || g.rsvp_status) === 'DECLINED').length;
    const total      = guests.length;
    const totalPeople = guests.reduce((s, g) => s + 1 + (g.companions || 0), 0);
    const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    return { confirmed, pending, declined, total, totalPeople, pct };
  }, [guests]);

  const recentGuests = useMemo(() =>
    [...guests]
      .sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime())
      .slice(0, 3),
    [guests]
  );

  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

      {/* Greeting */}
      <motion.div variants={item} className="pt-1">
        <p className="text-xs text-charcoal-400 font-medium mb-1">{today}</p>
        <h1 className="text-3xl font-bold text-charcoal-900 leading-tight">שלום 👋</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">האירוע שלך מתקדם יפה</p>
      </motion.div>

      {/* Hero card */}
      <motion.div variants={item} className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-28 bg-charcoal-100 rounded-full" />
            <div className="h-10 w-14 bg-charcoal-100 rounded-full" />
            <div className="h-2 bg-charcoal-100 rounded-full" />
            <div className="h-12 bg-charcoal-100 rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs text-charcoal-400 font-medium mb-0.5">סך הכל מוזמנים</p>
                <p className="text-4xl font-bold text-charcoal-900 leading-none">{stats.total}</p>
              </div>
              <div className="text-left pb-1">
                <p className="text-xs text-charcoal-400 font-medium mb-0.5 text-left">אישרו הגעה</p>
                <p className="text-2xl font-bold text-emerald-600 leading-none">{stats.pct}%</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-charcoal-100 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${stats.pct}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
              />
            </div>

            <button
              onClick={onAddGuest}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-charcoal-900 text-white text-[15px] font-semibold active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              הוסף מוזמן
            </button>
          </>
        )}
      </motion.div>

      {/* Stats grid — 2×2 compact */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        {[
          { label: 'אישרו הגעה', value: stats.confirmed,   icon: CheckCircle, iconCls: 'text-emerald-600', bgCls: 'bg-emerald-50' },
          { label: 'ממתינים',    value: stats.pending,     icon: Clock,       iconCls: 'text-amber-600',   bgCls: 'bg-amber-50'   },
          { label: 'לא מגיעים', value: stats.declined,    icon: XCircle,     iconCls: 'text-red-500',     bgCls: 'bg-red-50'     },
          { label: 'סך אנשים',  value: stats.totalPeople, icon: Users,       iconCls: 'text-blue-600',    bgCls: 'bg-blue-50'    },
        ].map(({ label, value, icon: Icon, iconCls, bgCls }) => (
          <div key={label} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-7 w-7 bg-charcoal-100 rounded-xl" />
                <div className="h-6 w-8 bg-charcoal-100 rounded-full" />
                <div className="h-3 w-14 bg-charcoal-100 rounded-full" />
              </div>
            ) : (
              <>
                <div className={`w-7 h-7 rounded-xl ${bgCls} flex items-center justify-center mb-2.5`}>
                  <Icon className={`w-3.5 h-3.5 ${iconCls}`} strokeWidth={2.2} />
                </div>
                <p className="text-[22px] font-bold text-charcoal-900 leading-none mb-1">{value}</p>
                <p className="text-[11px] text-charcoal-400 font-medium">{label}</p>
              </>
            )}
          </div>
        ))}
      </motion.div>

      {/* Recent guests */}
      {!loading && recentGuests.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[13px] font-semibold text-charcoal-500 uppercase tracking-wide">מוזמנים אחרונים</h2>
            <button onClick={onViewGuests} className="text-[13px] text-gold-600 font-medium">הכל ›</button>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            {recentGuests.map((guest, idx) => {
              const name   = guest.fullName || guest.full_name;
              const rsvp   = guest.rsvpStatus || guest.rsvp_status;
              const badge  = rsvpBadge[rsvp];
              const ac     = avatarColor(name);
              return (
                <button
                  key={guest.id}
                  onClick={() => onViewGuest(guest)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-right active:bg-charcoal-50/50 transition-colors ${
                    idx < recentGuests.length - 1 ? 'border-b border-charcoal-100/60' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl ${ac} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                    {getInitials(name)}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-[14px] font-semibold text-charcoal-900 truncate">{name}</p>
                    <p className="text-[11px] text-charcoal-400" dir="ltr">{guest.phone}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
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
        <h2 className="text-[13px] font-semibold text-charcoal-500 uppercase tracking-wide mb-2.5">פעולות מהירות</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'הוסף מוזמן',   icon: Plus,           action: onAddGuest },
            { label: 'שלח הודעה',    icon: MessageCircle,  action: () => {} },
            { label: 'ייבא רשימה',   icon: Upload,         action: () => {} },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="bg-white rounded-2xl p-3.5 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}
            >
              <div className="w-9 h-9 rounded-2xl bg-charcoal-50 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-charcoal-600" strokeWidth={1.8} />
              </div>
              <span className="text-[11px] font-semibold text-charcoal-600 text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
};
