import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, CheckCircle, Clock, XCircle, ChevronLeft } from 'lucide-react';
import { Guest, RsvpStatus } from '../types';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface DashboardProps {
  guests: Guest[];
  loading: boolean;
  onAddGuest: () => void;
  onViewGuests: () => void;
  onViewGuest: (guest: Guest) => void;
}

const rsvpDot: Record<RsvpStatus, string> = {
  CONFIRMED: '#10B981', PENDING: '#F59E0B', DECLINED: '#F87171',
};
const rsvpLabel: Record<RsvpStatus, string> = {
  CONFIRMED: 'אישר', PENDING: 'ממתין', DECLINED: 'לא מגיע',
};
const avatarPalette = [
  ['#FDE68A','#92400E'],['#BFDBFE','#1E40AF'],
  ['#DDD6FE','#5B21B6'],['#A7F3D0','#065F46'],
  ['#FBCFE8','#9D174D'],['#FED7AA','#9A3412'],
];
function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return p.length===1 ? p[0][0].toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase();
}
function pal(name: string) {
  let h=0; for(const c of name) h=c.charCodeAt(0)+((h<<5)-h);
  return avatarPalette[Math.abs(h)%avatarPalette.length];
}

/* Large centered ring */
function HeroRing({ pct, total, loading }: { pct: number; total: number; loading: boolean }) {
  const r=72, circ=2*Math.PI*r;
  if (loading) return (
    <div className="flex justify-center py-4">
      <div className="w-[180px] h-[180px] rounded-full bg-charcoal-100 animate-pulse"/>
    </div>
  );
  return (
    <div className="flex justify-center py-2">
      <div className="relative flex items-center justify-center" style={{width:180,height:180}}>
        <svg width="180" height="180" className="-rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={r} fill="none" stroke="#F0EDE8" strokeWidth="10"/>
          <motion.circle
            cx="90" cy="90" r={r} fill="none"
            stroke="#1A1916" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circ}
            initial={{strokeDashoffset:circ}}
            animate={{strokeDashoffset: total===0 ? circ : circ-(pct/100)*circ}}
            transition={{duration:1.4,ease:'easeOut',delay:0.3}}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-[44px] font-bold text-charcoal-900 leading-none">{total}</span>
          <span className="text-[12px] text-charcoal-400 font-medium mt-1">מוזמנים</span>
        </div>
      </div>
    </div>
  );
}

const fade = {hidden:{opacity:0,y:8},show:{opacity:1,y:0,transition:{duration:0.22}}};
const stagger = {hidden:{},show:{transition:{staggerChildren:0.06}}};

export const Dashboard = ({ guests, loading, onAddGuest, onViewGuests, onViewGuest }: DashboardProps) => {
  const auth = useSupabaseAuth();

  const s = useMemo(()=>{
    const confirmed = guests.filter(g=>(g.rsvpStatus||g.rsvp_status)==='CONFIRMED').length;
    const pending   = guests.filter(g=>(g.rsvpStatus||g.rsvp_status)==='PENDING').length;
    const declined  = guests.filter(g=>(g.rsvpStatus||g.rsvp_status)==='DECLINED').length;
    const total     = guests.length;
    const people    = guests.reduce((a,g)=>a+1+(g.companions||0),0);
    const pct       = total>0 ? Math.round((confirmed/total)*100) : 0;
    return {confirmed,pending,declined,total,people,pct};
  },[guests]);

  const recent = useMemo(()=>
    [...guests].sort((a,b)=>
      new Date(b.createdAt||b.created_at||0).getTime()-new Date(a.createdAt||a.created_at||0).getTime()
    ).slice(0,3),[guests]);

  const firstName = auth.user?.email?.split('@')[0] || '';

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 pt-1">

      {/* ── GREETING ─────────────────────────── */}
      <motion.div variants={fade} className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-charcoal-400 font-medium">
            {new Date().toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <h1 className="text-[30px] font-bold text-charcoal-900 leading-tight mt-0.5">
            {firstName ? `שלום, ${firstName}` : 'שלום 👋'}
          </h1>
        </div>
        <button
          onClick={onAddGuest}
          className="w-10 h-10 rounded-2xl bg-charcoal-900 flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
        >
          <Plus className="w-5 h-5 text-white" strokeWidth={2.5}/>
        </button>
      </motion.div>

      {/* ── HERO CARD ─────────────────────────── */}
      <motion.div
        variants={fade}
        className="bg-white rounded-3xl px-5 pt-6 pb-5"
        style={{boxShadow:'0 2px 20px rgba(0,0,0,0.07)'}}
      >
        {/* Ring */}
        <HeroRing pct={s.pct} total={s.total} loading={loading}/>

        {/* Confirmation % bar */}
        {!loading && (
          <div className="mt-4 mb-5">
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-charcoal-400 font-medium">אחוז אישורים</span>
              <span className="text-[11px] font-bold text-charcoal-700">{s.pct}%</span>
            </div>
            <div className="h-1.5 bg-charcoal-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-charcoal-900 rounded-full"
                initial={{width:0}}
                animate={{width:`${s.pct}%`}}
                transition={{duration:1.1,ease:'easeOut',delay:0.5}}
              />
            </div>
          </div>
        )}

        {/* 2×2 compact stats */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            {icon:CheckCircle, label:'אישרו',      value:s.confirmed, color:'#10B981', bg:'#ECFDF5'},
            {icon:Clock,       label:'ממתינים',    value:s.pending,   color:'#F59E0B', bg:'#FFFBEB'},
            {icon:XCircle,     label:'לא מגיעים', value:s.declined,  color:'#F87171', bg:'#FFF1F2'},
            {icon:Users,       label:'סך אנשים',  value:s.people,    color:'#60A5FA', bg:'#EFF6FF'},
          ].map(({icon:Icon,label,value,color,bg})=>(
            <div key={label} className="rounded-2xl p-3.5" style={{background:bg}}>
              {loading ? (
                <div className="animate-pulse space-y-1.5">
                  <div className="h-4 w-4 rounded bg-charcoal-200"/>
                  <div className="h-6 w-8 rounded-full bg-charcoal-200"/>
                  <div className="h-2.5 w-14 rounded-full bg-charcoal-200"/>
                </div>
              ) : (
                <>
                  <Icon className="w-4 h-4 mb-2" style={{color}} strokeWidth={2.2}/>
                  <p className="text-[22px] font-bold text-charcoal-900 leading-none mb-0.5">{value}</p>
                  <p className="text-[11px] font-semibold text-charcoal-500">{label}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── RECENT GUESTS ────────────────────── */}
      {!loading && recent.length > 0 && (
        <motion.div variants={fade}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-bold text-charcoal-500">אחרונים</span>
            <button onClick={onViewGuests} className="flex items-center gap-0.5 text-[13px] text-gold-600 font-bold">
              כולם <ChevronLeft className="w-3.5 h-3.5"/>
            </button>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden" style={{boxShadow:'0 1px 12px rgba(0,0,0,0.06)'}}>
            {recent.map((g,i)=>{
              const name = g.fullName||g.full_name;
              const rsvp = (g.rsvpStatus||g.rsvp_status) as RsvpStatus;
              const [bg,fg] = pal(name);
              return (
                <button
                  key={g.id}
                  onClick={()=>onViewGuest(g)}
                  className={`w-full flex items-center gap-3 px-4 py-3 active:bg-charcoal-50/40 transition-colors text-right ${i<recent.length-1?'border-b border-charcoal-100/50':''}`}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{background:bg,color:fg}}>
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-charcoal-900 truncate">{name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{background:rsvpDot[rsvp]}}/>
                      <span className="text-[11px] text-charcoal-400">{rsvpLabel[rsvp]}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-charcoal-400" dir="ltr">{g.phone}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── EMPTY STATE ──────────────────────── */}
      {!loading && guests.length===0 && (
        <motion.div variants={fade} className="flex flex-col items-center py-10 text-center">
          <div className="w-16 h-16 rounded-3xl bg-charcoal-100 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-charcoal-300" strokeWidth={1.5}/>
          </div>
          <p className="text-[16px] font-bold text-charcoal-800 mb-1">אין מוזמנים עדיין</p>
          <p className="text-[13px] text-charcoal-400 mb-5">הוסף את המוזמן הראשון שלך</p>
          <button onClick={onAddGuest}
            className="px-6 py-3 rounded-2xl bg-charcoal-900 text-white text-[14px] font-bold active:scale-95 transition-transform">
            הוסף מוזמן
          </button>
        </motion.div>
      )}

    </motion.div>
  );
};
