import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, CheckCircle, Clock, XCircle, ChevronLeft } from 'lucide-react';
import { Guest, RsvpStatus } from '../types';

interface DashboardProps {
  guests: Guest[];
  loading: boolean;
  onAddGuest: () => void;
  onViewGuests: () => void;
  onViewGuest: (guest: Guest) => void;
}

const rsvpBadge: Record<RsvpStatus, { label: string; dot: string }> = {
  CONFIRMED: { label: 'אישר',     dot: 'bg-emerald-500' },
  PENDING:   { label: 'ממתין',    dot: 'bg-amber-400'   },
  DECLINED:  { label: 'לא מגיע', dot: 'bg-red-400'     },
};

const avatarPalette = [
  ['#FDE68A','#92400E'], ['#BFDBFE','#1E40AF'],
  ['#DDD6FE','#5B21B6'], ['#A7F3D0','#065F46'],
  ['#FBCFE8','#9D174D'], ['#FED7AA','#9A3412'],
];

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
}
function palette(name: string) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}

/* Circular SVG ring */
function Ring({ pct, total }: { pct: number; total: number }) {
  const r = 54, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 148, height: 148 }}>
      <svg width="148" height="148" className="-rotate-90" viewBox="0 0 148 148">
        <circle cx="74" cy="74" r={r} fill="none" stroke="#F0EDE8" strokeWidth="10" />
        <motion.circle
          cx="74" cy="74" r={r} fill="none"
          stroke="#1A1916" strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[38px] font-bold text-charcoal-900 leading-none">{total}</span>
        <span className="text-[11px] text-charcoal-400 font-medium mt-0.5">מוזמנים</span>
      </div>
    </div>
  );
}

const fade = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export const Dashboard = ({ guests, loading, onAddGuest, onViewGuests, onViewGuest }: DashboardProps) => {
  const s = useMemo(() => {
    const confirmed  = guests.filter(g => (g.rsvpStatus||g.rsvp_status) === 'CONFIRMED').length;
    const pending    = guests.filter(g => (g.rsvpStatus||g.rsvp_status) === 'PENDING').length;
    const declined   = guests.filter(g => (g.rsvpStatus||g.rsvp_status) === 'DECLINED').length;
    const total      = guests.length;
    const people     = guests.reduce((s,g) => s + 1 + (g.companions||0), 0);
    const pct        = total > 0 ? Math.round((confirmed/total)*100) : 0;
    return { confirmed, pending, declined, total, people, pct };
  }, [guests]);

  const recent = useMemo(() =>
    [...guests].sort((a,b) =>
      new Date(b.createdAt||b.created_at||0).getTime() - new Date(a.createdAt||a.created_at||0).getTime()
    ).slice(0,3), [guests]);

  const dow = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) return (
    <div className="space-y-4 pt-2 animate-pulse">
      <div className="h-5 w-40 bg-charcoal-100 rounded-full" />
      <div className="h-64 bg-white rounded-3xl" />
      <div className="grid grid-cols-3 gap-2.5">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 pt-1">

      {/* Header */}
      <motion.div variants={fade} className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-charcoal-400 font-medium">{dow}</p>
          <h1 className="text-[26px] font-bold text-charcoal-900 leading-tight mt-0.5">האירוע שלך</h1>
        </div>
        <button
          onClick={onAddGuest}
          className="flex items-center gap-1.5 bg-charcoal-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-2xl active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          הוסף
        </button>
      </motion.div>

      {/* Hero — ring + stats side by side */}
      <motion.div
        variants={fade}
        className="bg-white rounded-3xl p-5"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-5">
          <Ring pct={s.pct} total={s.total} />

          <div className="flex-1 space-y-3">
            {[
              { icon: CheckCircle, label: 'אישרו', value: s.confirmed, color: '#10B981' },
              { icon: Clock,       label: 'ממתינים', value: s.pending,  color: '#F59E0B' },
              { icon: XCircle,     label: 'לא מגיעים', value: s.declined, color: '#F87171' },
              { icon: Users,       label: 'סך אנשים', value: s.people,  color: '#60A5FA' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon style={{ color }} className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.2} />
                  <span className="text-[12px] text-charcoal-500 font-medium">{label}</span>
                </div>
                <span className="text-[15px] font-bold text-charcoal-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar with label */}
        <div className="mt-4 pt-4 border-t border-charcoal-100/60">
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] text-charcoal-400">אחוז אישורים</span>
            <span className="text-[11px] font-bold text-charcoal-700">{s.pct}%</span>
          </div>
          <div className="h-1.5 bg-charcoal-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-charcoal-900 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${s.pct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Recent guests */}
      {recent.length > 0 && (
        <motion.div variants={fade}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-charcoal-400 uppercase tracking-widest">אחרונים</span>
            <button onClick={onViewGuests} className="flex items-center gap-0.5 text-[12px] text-gold-600 font-semibold">
              כולם <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {recent.map((g, i) => {
              const name  = g.fullName || g.full_name;
              const rsvp  = g.rsvpStatus || g.rsvp_status;
              const badge = rsvpBadge[rsvp];
              const [bg, fg] = palette(name);
              return (
                <button
                  key={g.id}
                  onClick={() => onViewGuest(g)}
                  className={`w-full flex items-center gap-3 px-4 py-3 active:bg-charcoal-50/40 transition-colors text-right ${
                    i < recent.length-1 ? 'border-b border-charcoal-100/50' : ''
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{ background: bg, color: fg }}
                  >
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-charcoal-900 truncate">{name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span className="text-[11px] text-charcoal-400">{badge.label}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-charcoal-400" dir="ltr">{g.phone}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty state CTA */}
      {!loading && guests.length === 0 && (
        <motion.div variants={fade} className="flex flex-col items-center py-10 text-center">
          <div className="w-16 h-16 rounded-3xl bg-charcoal-100 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-charcoal-300" strokeWidth={1.5} />
          </div>
          <p className="text-[16px] font-semibold text-charcoal-700 mb-1">אין מוזמנים עדיין</p>
          <p className="text-[13px] text-charcoal-400 mb-5">הוסף את המוזמן הראשון שלך</p>
          <button
            onClick={onAddGuest}
            className="px-6 py-3 rounded-2xl bg-charcoal-900 text-white text-[14px] font-semibold active:scale-95 transition-transform"
          >
            הוסף מוזמן
          </button>
        </motion.div>
      )}

    </motion.div>
  );
};
