import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, CheckCircle, Clock, XCircle, ChevronLeft, Sparkles } from 'lucide-react';
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
  CONFIRMED: '#10B981',
  PENDING:   '#F59E0B',
  DECLINED:  '#F87171',
};
const rsvpLabel: Record<RsvpStatus, string> = {
  CONFIRMED: 'אישר',
  PENDING:   'ממתין',
  DECLINED:  'לא מגיע',
};

const palette = [
  ['#FDE68A','#92400E'],['#BFDBFE','#1E40AF'],
  ['#DDD6FE','#5B21B6'],['#A7F3D0','#065F46'],
  ['#FBCFE8','#9D174D'],['#FED7AA','#9A3412'],
];
function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase();
}
function palettePick(name: string) {
  let h=0; for(const c of name) h=c.charCodeAt(0)+((h<<5)-h);
  return palette[Math.abs(h)%palette.length];
}

/* SVG ring */
function Ring({ pct, total }: { pct: number; total: number }) {
  const r=52, circ=2*Math.PI*r;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{width:140,height:140}}>
      <svg width="140" height="140" className="-rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9"/>
        <motion.circle
          cx="70" cy="70" r={r} fill="none"
          stroke="#C9A84C" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{strokeDashoffset:circ}}
          animate={{strokeDashoffset:circ-(pct/100)*circ}}
          transition={{duration:1.3,ease:'easeOut',delay:0.5}}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[36px] font-bold text-white leading-none">{total}</span>
        <span className="text-[10px] text-white/50 font-medium mt-0.5">מוזמנים</span>
      </div>
    </div>
  );
}

const fade = {hidden:{opacity:0,y:8},show:{opacity:1,y:0,transition:{duration:0.22}}};
const stagger = {hidden:{},show:{transition:{staggerChildren:0.07}}};

export const Dashboard = ({ guests, loading, onAddGuest, onViewGuests, onViewGuest }: DashboardProps) => {
  const auth = useSupabaseAuth();

  const s = useMemo(() => {
    const confirmed = guests.filter(g=>(g.rsvpStatus||g.rsvp_status)==='CONFIRMED').length;
    const pending   = guests.filter(g=>(g.rsvpStatus||g.rsvp_status)==='PENDING').length;
    const declined  = guests.filter(g=>(g.rsvpStatus||g.rsvp_status)==='DECLINED').length;
    const total     = guests.length;
    const people    = guests.reduce((s,g)=>s+1+(g.companions||0),0);
    const pct       = total>0?Math.round((confirmed/total)*100):0;
    return {confirmed,pending,declined,total,people,pct};
  },[guests]);

  const recent = useMemo(()=>
    [...guests].sort((a,b)=>
      new Date(b.createdAt||b.created_at||0).getTime()-new Date(a.createdAt||a.created_at||0).getTime()
    ).slice(0,3),[guests]);

  const firstName = auth.user?.email?.split('@')[0] || '';

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">

      {/* ── DARK HERO ─────────────────────────────── */}
      <div
        className="relative overflow-hidden px-5 pt-8 pb-6 -mx-5 -mt-6 mb-5"
        style={{background:'linear-gradient(160deg,#1A1916 0%,#2D2A26 100%)'}}
      >
        {/* Subtle texture dots */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)',backgroundSize:'24px 24px'}} />

        <motion.div variants={fade} className="relative z-10">
          {/* Top row */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span className="text-[11px] font-semibold text-gold-400 uppercase tracking-widest">האירוע שלך</span>
              </div>
              <h1 className="text-[28px] font-bold text-white leading-tight">
                {firstName ? `שלום, ${firstName}` : 'שלום 👋'}
              </h1>
            </div>
            <button
              onClick={onAddGuest}
              className="flex items-center gap-1.5 bg-gold-500 text-charcoal-900 text-[13px] font-bold px-4 py-2.5 rounded-2xl active:scale-95 transition-transform"
              style={{boxShadow:'0 4px 16px rgba(201,168,76,0.4)'}}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.8}/>
              הוסף
            </button>
          </div>

          {/* Ring + stats */}
          {loading ? (
            <div className="flex items-center gap-5 animate-pulse">
              <div className="w-[140px] h-[140px] rounded-full bg-white/10 flex-shrink-0"/>
              <div className="flex-1 space-y-3">
                {[1,2,3,4].map(i=><div key={i} className="h-4 bg-white/10 rounded-full"/>)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <Ring pct={s.pct} total={s.total}/>
              <div className="flex-1 space-y-3">
                {[
                  {icon:CheckCircle,label:'אישרו',value:s.confirmed,color:'#10B981'},
                  {icon:Clock,      label:'ממתינים',value:s.pending,  color:'#F59E0B'},
                  {icon:XCircle,   label:'לא מגיעים',value:s.declined,color:'#F87171'},
                  {icon:Users,     label:'סך אנשים', value:s.people,  color:'#60A5FA'},
                ].map(({icon:Icon,label,value,color})=>(
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon style={{color}} className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.2}/>
                      <span className="text-[12px] text-white/60 font-medium">{label}</span>
                    </div>
                    <span className="text-[15px] font-bold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {!loading && (
            <div className="mt-5">
              <div className="flex justify-between mb-1.5">
                <span className="text-[10px] text-white/40 font-medium">אחוז אישורים</span>
                <span className="text-[10px] font-bold text-gold-400">{s.pct}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gold-500"
                  initial={{width:0}}
                  animate={{width:`${s.pct}%`}}
                  transition={{duration:1.1,ease:'easeOut',delay:0.6}}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── RECENT GUESTS ─────────────────────────── */}
      {!loading && recent.length > 0 && (
        <motion.div variants={fade} className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest">אחרונים</span>
            <button onClick={onViewGuests} className="flex items-center gap-0.5 text-[12px] text-gold-600 font-bold">
              כולם <ChevronLeft className="w-3.5 h-3.5"/>
            </button>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden" style={{boxShadow:'0 2px 16px rgba(0,0,0,0.07)'}}>
            {recent.map((g,i)=>{
              const name  = g.fullName||g.full_name;
              const rsvp  = g.rsvpStatus||g.rsvp_status;
              const [bg,fg] = palettePick(name);
              return (
                <button
                  key={g.id}
                  onClick={()=>onViewGuest(g)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-charcoal-50/50 transition-colors text-right ${i<recent.length-1?'border-b border-charcoal-100/50':''}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{background:bg,color:fg}}>
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-charcoal-900 truncate">{name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{background:rsvpDot[rsvp]}}/>
                      <span className="text-[11px] text-charcoal-400">{rsvpLabel[rsvp]}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-charcoal-300 font-medium" dir="ltr">{g.phone}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── EMPTY STATE ───────────────────────────── */}
      {!loading && guests.length === 0 && (
        <motion.div variants={fade} className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-charcoal-100 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-charcoal-300" strokeWidth={1.5}/>
          </div>
          <p className="text-[16px] font-bold text-charcoal-800 mb-1">אין מוזמנים עדיין</p>
          <p className="text-[13px] text-charcoal-400 mb-6">הוסף את המוזמן הראשון שלך</p>
          <button
            onClick={onAddGuest}
            className="px-6 py-3 rounded-2xl bg-charcoal-900 text-white text-[14px] font-bold active:scale-95 transition-transform"
          >הוסף מוזמן</button>
        </motion.div>
      )}

    </motion.div>
  );
};
