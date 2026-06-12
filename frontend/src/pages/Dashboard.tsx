import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, CheckCircle, Clock, XCircle, ChevronLeft, CalendarDays } from 'lucide-react';
import { Guest, RsvpStatus, Category } from '../types';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface DashboardProps {
  guests: Guest[];
  loading: boolean;
  onAddGuest: () => void;
  onViewGuests: () => void;
  onViewGuest: (guest: Guest) => void;
}

const EVENT_KEY      = 'luma_event_name';
const EVENT_DATE_KEY = 'luma_event_date';

const rsvpDot: Record<RsvpStatus, string>   = { CONFIRMED:'#10B981', PENDING:'#F59E0B', DECLINED:'#F87171' };
const rsvpLabel: Record<RsvpStatus, string> = { CONFIRMED:'אישר', PENDING:'ממתין', DECLINED:'לא מגיע' };

const catConfig: { id: Category; label: string; color: string }[] = [
  { id: 'GROOM',   label: 'חתן',   color: '#C9A84C' },
  { id: 'BRIDE',   label: 'כלה',   color: '#F9A8D4' },
  { id: 'FAMILY',  label: 'משפחה', color: '#93C5FD' },
  { id: 'FRIENDS', label: 'חברים', color: '#C4B5FD' },
  { id: 'WORK',    label: 'עבודה', color: '#94A3B8' },
  { id: 'OTHER',   label: 'אחר',   color: '#D1D5DB' },
];

const avPalette = [
  ['#FDE68A','#92400E'],['#BFDBFE','#1E40AF'],
  ['#DDD6FE','#5B21B6'],['#A7F3D0','#065F46'],
  ['#FBCFE8','#9D174D'],['#FED7AA','#9A3412'],
];
function initials(n:string){ const p=n.trim().split(/\s+/).filter(Boolean); return !p.length?'?':p.length===1?p[0][0].toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase(); }
function pal(n:string){ let h=0;for(const c of n)h=c.charCodeAt(0)+((h<<5)-h);return avPalette[Math.abs(h)%avPalette.length]; }

function Ring({pct,total,loading}:{pct:number;total:number;loading:boolean}){
  const r=54,circ=2*Math.PI*r;
  if(loading) return <div className="w-[136px] h-[136px] rounded-full bg-charcoal-100 animate-pulse mx-auto"/>;
  return(
    <div className="relative flex items-center justify-center mx-auto" style={{width:136,height:136}}>
      <svg width="136" height="136" className="-rotate-90" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={r} fill="none" stroke="#F0EDE8" strokeWidth="9"/>
        <motion.circle cx="68" cy="68" r={r} fill="none" stroke="#1A1916" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{strokeDashoffset:circ}}
          animate={{strokeDashoffset:total===0?circ:circ-(pct/100)*circ}}
          transition={{duration:1.2,ease:'easeOut',delay:0.3}}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[34px] font-bold text-charcoal-900 leading-none">{total}</span>
        <span className="text-[11px] text-charcoal-400 font-medium mt-0.5">מוזמנים</span>
      </div>
    </div>
  );
}

const fade={hidden:{opacity:0,y:6},show:{opacity:1,y:0,transition:{duration:0.2}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.055}}};

export const Dashboard=({guests,loading,onAddGuest,onViewGuests,onViewGuest}:DashboardProps)=>{
  const auth=useSupabaseAuth();
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');

  useEffect(() => {
    setEventName(localStorage.getItem(EVENT_KEY) || '');
    setEventDate(localStorage.getItem(EVENT_DATE_KEY) || '');
  }, []);

  const s=useMemo(()=>{
    const confirmedGuests=guests.filter(g=>(g.rsvpStatus||g.rsvp_status)==='CONFIRMED');
    const confirmed=confirmedGuests.length;
    const pending=guests.filter(g=>(g.rsvpStatus||g.rsvp_status)==='PENDING').length;
    const declined=guests.filter(g=>(g.rsvpStatus||g.rsvp_status)==='DECLINED').length;
    const total=guests.length;
    // Only count people who are actually coming: confirmed guests + their companions
    const peopleArriving=confirmedGuests.reduce((a,g)=>a+1+(g.companions||0),0);
    const pct=total>0?Math.round((confirmed/total)*100):0;
    return{confirmed,pending,declined,total,peopleArriving,pct};
  },[guests]);

  const countdownDays = useMemo(() => {
    if (!eventDate) return null;
    const now = new Date(); now.setHours(0,0,0,0);
    const target = new Date(eventDate);
    return Math.ceil((target.getTime() - now.getTime()) / 86400000);
  }, [eventDate]);

  const categoryBreakdown = useMemo(() => {
    const knownNonOther = catConfig.filter(c => c.id !== 'OTHER').map(c => c.id) as string[];
    return catConfig
      .map(c => ({
        ...c,
        count: c.id === 'OTHER'
          ? guests.filter(g => !g.category || !knownNonOther.includes(g.category)).length
          : guests.filter(g => g.category === c.id).length,
      }))
      .filter(c => c.count > 0);
  }, [guests]);

  const recent=useMemo(()=>
    [...guests].sort((a,b)=>new Date(b.createdAt||b.created_at||0).getTime()-new Date(a.createdAt||a.created_at||0).getTime()).slice(0,3)
  ,[guests]);

  const displayName = auth.user?.name?.split(' ')[0] || auth.user?.email?.split('@')[0] || '';

  const subtitleText = useMemo(() => {
    if (countdownDays !== null) {
      if (countdownDays > 0)  return `עוד ${countdownDays} ימים לאירוע ✦`;
      if (countdownDays === 0) return 'האירוע היום! 🎉';
      return eventName ? `✦ ${eventName}` : 'האירוע עבר';
    }
    if (eventName) return `✦ ${eventName}`;
    return new Date().toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long'});
  }, [countdownDays, eventName]);

  return(
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">

      {/* Greeting */}
      <motion.div variants={fade} className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-charcoal-900 leading-tight">
            {displayName ? `שלום, ${displayName}` : 'שלום 👋'}
          </h1>
          <p className="text-[12px] text-charcoal-400">{subtitleText}</p>
        </div>
        <button onClick={onAddGuest}
          className="w-9 h-9 rounded-2xl bg-charcoal-900 flex items-center justify-center active:scale-90 transition-transform flex-shrink-0">
          <Plus className="w-4 h-4 text-white" strokeWidth={2.5}/>
        </button>
      </motion.div>

      {/* Countdown banner — when event date set */}
      {countdownDays !== null && countdownDays > 0 && (
        <motion.div variants={fade}
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg,#1A1916 0%,#2D2A26 100%)' }}>
          <div className="w-9 h-9 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-4.5 h-4.5 text-gold-400" strokeWidth={2}/>
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-white/50 font-medium">{eventName || 'האירוע'}</p>
            <p className="text-[15px] font-bold text-white">עוד {countdownDays} ימים</p>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-black text-gold-400 leading-none">{countdownDays}</p>
            <p className="text-[10px] text-white/40">ימים</p>
          </div>
        </motion.div>
      )}

      {countdownDays === 0 && (
        <motion.div variants={fade}
          className="rounded-2xl px-4 py-3 flex items-center gap-3 bg-green-50 border border-green-200">
          <span className="text-2xl">🎉</span>
          <p className="text-[15px] font-bold text-green-800">האירוע היום! בהצלחה!</p>
        </motion.div>
      )}

      {/* Hero card */}
      <motion.div variants={fade} className="bg-white rounded-3xl p-4" style={{boxShadow:'0 2px 16px rgba(0,0,0,0.07)'}}>
        <div className="py-2">
          <Ring pct={s.pct} total={s.total} loading={loading}/>
        </div>

        {!loading&&(
          <div className="mt-3 mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-charcoal-400">אחוז אישורים</span>
              <span className="text-[11px] font-bold text-charcoal-700">{s.pct}%</span>
            </div>
            <div className="h-1.5 bg-charcoal-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-charcoal-900 rounded-full"
                initial={{width:0}} animate={{width:`${s.pct}%`}}
                transition={{duration:1,ease:'easeOut',delay:0.5}}/>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {[
            {icon:CheckCircle,label:'אישרו',     value:s.confirmed,color:'#10B981',bg:'#ECFDF5'},
            {icon:Clock,      label:'ממתינים',   value:s.pending,  color:'#F59E0B',bg:'#FFFBEB'},
            {icon:XCircle,    label:'לא מגיעים',value:s.declined, color:'#F87171',bg:'#FFF1F2'},
            {icon:Users,      label:'מגיעים',   value:s.peopleArriving, color:'#60A5FA',bg:'#EFF6FF'},
          ].map(({icon:Icon,label,value,color,bg})=>(
            <div key={label} className="rounded-2xl p-3" style={{background:bg}}>
              {loading?(
                <div className="animate-pulse space-y-1">
                  <div className="h-3.5 w-3.5 rounded bg-charcoal-200"/>
                  <div className="h-5 w-7 rounded bg-charcoal-200"/>
                  <div className="h-2.5 w-12 rounded bg-charcoal-200"/>
                </div>
              ):(
                <>
                  <Icon className="w-3.5 h-3.5 mb-1.5" style={{color}} strokeWidth={2.2}/>
                  <p className="text-[20px] font-bold text-charcoal-900 leading-none mb-0.5">{value}</p>
                  <p className="text-[11px] font-semibold text-charcoal-500">{label}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Category breakdown */}
      {!loading && categoryBreakdown.length > 0 && (
        <motion.div variants={fade} className="bg-white rounded-2xl p-4" style={{boxShadow:'0 1px 8px rgba(0,0,0,0.05)'}}>
          <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-3">לפי קטגוריה</p>
          <div className="space-y-2.5">
            {categoryBreakdown.map(cat => {
              const pct = s.total > 0 ? (cat.count / s.total) * 100 : 0;
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="text-[12px] font-semibold text-charcoal-600 w-14 flex-shrink-0">{cat.label}</span>
                  <div className="flex-1 h-2 bg-charcoal-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: cat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
                    />
                  </div>
                  <span className="text-[12px] font-bold text-charcoal-700 w-5 text-center flex-shrink-0">{cat.count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Recent guests */}
      {!loading&&recent.length>0&&(
        <motion.div variants={fade}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-charcoal-700">אחרונים</span>
            <button onClick={onViewGuests} className="flex items-center gap-0.5 text-[12px] text-gold-600 font-bold">
              כולם <ChevronLeft className="w-3 h-3"/>
            </button>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden" style={{boxShadow:'0 1px 10px rgba(0,0,0,0.06)'}}>
            {recent.map((g,i)=>{
              const name=g.fullName||g.full_name;
              const rsvp=(g.rsvpStatus||g.rsvp_status) as RsvpStatus;
              const [bg,fg]=pal(name);
              return(
                <button key={g.id} onClick={()=>onViewGuest(g)}
                  className={`w-full flex items-center gap-3 px-4 py-3 active:bg-charcoal-50/40 transition-colors text-right ${i<recent.length-1?'border-b border-charcoal-100/50':''}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{background:bg,color:fg}}>{initials(name)}</div>
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

      {/* Empty state */}
      {!loading&&guests.length===0&&(
        <motion.div variants={fade} className="flex flex-col items-center py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-charcoal-100 flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-charcoal-300" strokeWidth={1.5}/>
          </div>
          <p className="text-[15px] font-bold text-charcoal-800 mb-1">אין מוזמנים עדיין</p>
          <p className="text-[12px] text-charcoal-400 mb-4">הוסף את המוזמן הראשון שלך</p>
          <button onClick={onAddGuest}
            className="px-5 py-2.5 rounded-2xl bg-charcoal-900 text-white text-[13px] font-bold active:scale-95 transition-transform">
            הוסף מוזמן
          </button>
        </motion.div>
      )}

    </motion.div>
  );
};
