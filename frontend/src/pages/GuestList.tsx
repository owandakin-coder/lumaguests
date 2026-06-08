import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Users } from 'lucide-react';
import { GuestCard } from '../components/GuestCard';
import { Guest, RsvpStatus } from '../types';

interface GuestListProps {
  guests:Guest[];loading:boolean;onAddGuest:()=>void;
  onEditGuest:(g:Guest)=>void;onDeleteGuest:(g:Guest)=>void;onViewGuest:(g:Guest)=>void;
}

const filters:{label:string;value:RsvpStatus|'ALL'}[]=[
  {label:'הכל',value:'ALL'},{label:'אישרו',value:'CONFIRMED'},
  {label:'ממתינים',value:'PENDING'},{label:'לא מגיעים',value:'DECLINED'},
];

export const GuestList=({guests,loading,onAddGuest,onEditGuest,onDeleteGuest,onViewGuest}:GuestListProps)=>{
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState<RsvpStatus|'ALL'>('ALL');

  const filtered=useMemo(()=>guests.filter(g=>{
    const name=g.fullName||g.full_name;
    const rsvp=g.rsvpStatus||g.rsvp_status;
    return (name.toLowerCase().includes(search.toLowerCase())||g.phone.includes(search))
      &&(status==='ALL'||rsvp===status);
  }),[guests,search,status]);

  return (
    <div className="space-y-4 pt-1">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[30px] font-bold text-charcoal-900 leading-tight">מוזמנים</h1>
          <p className="text-[12px] text-charcoal-400 mt-0.5">
            {filtered.length} מתוך {guests.length} · {guests.reduce((a,g)=>a+1+(g.companions||0),0)} אנשים
          </p>
        </div>
        <button onClick={onAddGuest}
          className="w-10 h-10 rounded-2xl bg-charcoal-900 flex items-center justify-center active:scale-90 transition-transform flex-shrink-0">
          <Plus className="w-5 h-5 text-white" strokeWidth={2.5}/>
        </button>
      </div>

      {/* Search — 52px pill */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-charcoal-400 pointer-events-none"/>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון..."
          className="w-full h-[52px] pr-11 pl-4 rounded-[26px] bg-white text-[14px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 transition"
          style={{boxShadow:'0 2px 12px rgba(0,0,0,0.07)'}}
        />
      </div>

      {/* iOS Segmented control */}
      <div className="flex rounded-2xl p-1" style={{background:'rgba(0,0,0,0.06)'}}>
        {filters.map(f=>(
          <button key={f.value} onClick={()=>setStatus(f.value)}
            className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
              status===f.value ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_,i)=><div key={i} className="h-[76px] bg-white rounded-2xl animate-pulse"/>)}
        </div>
      ) : filtered.length===0 ? (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          className="flex flex-col items-center py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-charcoal-100 flex items-center justify-center mb-4">
            <Users className="w-9 h-9 text-charcoal-300" strokeWidth={1.3}/>
          </div>
          <p className="text-[15px] font-bold text-charcoal-800 mb-1">
            {search||status!=='ALL' ? 'לא נמצאו תוצאות' : 'אין מוזמנים עדיין'}
          </p>
          <p className="text-[13px] text-charcoal-400 mb-6">
            {search||status!=='ALL' ? 'נסה לשנות את הסינון' : 'הוסף את המוזמן הראשון שלך'}
          </p>
          {!search&&status==='ALL'&&(
            <button onClick={onAddGuest}
              className="px-5 py-2.5 rounded-2xl bg-charcoal-900 text-white text-[13px] font-bold active:scale-95 transition-transform">
              הוסף מוזמן
            </button>
          )}
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((g,i)=>(
              <motion.div key={g.id}
                initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                transition={{delay:Math.min(i*0.03,0.15)}}>
                <GuestCard guest={g} onEdit={onEditGuest} onDelete={onDeleteGuest} onView={onViewGuest}/>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};
