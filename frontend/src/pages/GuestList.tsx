import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Users, ArrowUpDown, Download, Upload, Layers, List } from 'lucide-react';
import { GuestCard } from '../components/GuestCard';
import { ImportGuestsModal } from '../components/ImportGuestsModal';
import { FilterSheet, FilterButton } from '../components/FilterSheet';
import { Guest, RsvpStatus, Category, Side, Event } from '../types';

interface GuestListProps {
  guests:Guest[];loading:boolean;onAddGuest:()=>void;
  onEditGuest:(g:Guest)=>void;onDeleteGuest:(g:Guest)=>void;onViewGuest:(g:Guest)=>void;
  onGuestsImported?:()=>void;
  userId:string;
  initialStatusFilter?: RsvpStatus | 'ALL';
  event?: Event | null;
}

type SortType = 'newest' | 'oldest' | 'az' | 'status';

const sortLabels: Record<SortType, string> = {
  newest: 'חדש→ישן',
  oldest: 'ישן→חדש',
  az:     'א→ב',
  status: 'סטטוס',
};
const sortCycle: SortType[] = ['newest', 'oldest', 'az', 'status'];

const statusFilters:{label:string;value:RsvpStatus|'ALL'}[]=[
  {label:'הכל',value:'ALL'},{label:'אישרו',value:'CONFIRMED'},
  {label:'ממתינים',value:'PENDING'},{label:'לא מגיעים',value:'DECLINED'},
];

const rsvpStatusLabel: Record<RsvpStatus, string> = {
  CONFIRMED: 'אישר הגעה',
  PENDING:   'ממתין',
  DECLINED:  'לא מגיע',
};

const catLabelFull: Record<string, string> = {
  FAMILY:'משפחה', FRIENDS:'חברים', WORK:'עבודה', OTHER:'אחר',
};

const sideLabelFull: Record<string, string> = {
  GROOM:'צד החתן', BRIDE:'צד הכלה', SHARED:'משותף',
};

// Grouped mode — group by side
const SIDE_ORDER: (Side | null)[] = ['GROOM', 'BRIDE', 'SHARED', null];

const sideGroupConfig: Record<string, { label: string; color: string; emoji: string }> = {
  GROOM:  { label: 'צד החתן', color: '#C9A84C', emoji: '🤵' },
  BRIDE:  { label: 'צד הכלה', color: '#F9A8D4', emoji: '👰' },
  SHARED: { label: 'משותף',   color: '#A5B4FC', emoji: '💑' },
  null:   { label: 'ללא שיוך', color: '#D1D5DB', emoji: '✦' },
};

export const GuestList=({guests,loading,onAddGuest,onEditGuest,onDeleteGuest,onViewGuest,onGuestsImported,userId,initialStatusFilter,event}:GuestListProps)=>{
  const [search,      setSearch]      = useState('');
  const [status,      setStatus]      = useState<RsvpStatus|'ALL'>(initialStatusFilter || 'ALL');
  const [side,        setSide]        = useState<Side|'ALL'>('ALL');
  const [category,    setCategory]    = useState<Category|'ALL'>('ALL');
  const [sort,        setSort]        = useState<SortType>('newest');
  const [importOpen,  setImportOpen]  = useState(false);
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [grouped,     setGrouped]     = useState(false);

  const activeFilterCount = (side !== 'ALL' ? 1 : 0) + (category !== 'ALL' ? 1 : 0);

  const filtered = useMemo(() => {
    let list = guests.filter(g => {
      const name = g.fullName||g.full_name;
      const rsvp = g.rsvpStatus||g.rsvp_status;
      return (name.toLowerCase().includes(search.toLowerCase())||g.phone.includes(search))
        &&(status==='ALL'||rsvp===status)
        &&(side==='ALL'||g.side===side)
        &&(category==='ALL'||g.category===category);
    });

    const statusOrder: Record<RsvpStatus, number> = { CONFIRMED: 0, PENDING: 1, DECLINED: 2 };

    switch (sort) {
      case 'oldest':
        list = [...list].sort((a,b) =>
          new Date(a.createdAt||a.created_at||0).getTime() - new Date(b.createdAt||b.created_at||0).getTime());
        break;
      case 'az':
        list = [...list].sort((a,b) =>
          (a.fullName||a.full_name).localeCompare(b.fullName||b.full_name, 'he'));
        break;
      case 'status':
        list = [...list].sort((a,b) =>
          statusOrder[(a.rsvpStatus||a.rsvp_status) as RsvpStatus] -
          statusOrder[(b.rsvpStatus||b.rsvp_status) as RsvpStatus]);
        break;
      default:
        list = [...list].sort((a,b) =>
          new Date(b.createdAt||b.created_at||0).getTime() - new Date(a.createdAt||a.created_at||0).getTime());
    }

    return list;
  }, [guests, search, status, side, category, sort]);

  const cycleSort = () => {
    const idx = sortCycle.indexOf(sort);
    setSort(sortCycle[(idx + 1) % sortCycle.length]);
  };

  const groupedList = useMemo(() => {
    if (!grouped) return null;
    const map = new Map<Side | null, Guest[]>();
    SIDE_ORDER.forEach(s => map.set(s, []));
    filtered.forEach(g => { map.get((g.side as Side | null) ?? null)?.push(g); });
    return SIDE_ORDER.map(s => ({ side: s, guests: map.get(s) ?? [] })).filter(g => g.guests.length > 0);
  }, [grouped, filtered]);

  const exportCSV = () => {
    const eventName = localStorage.getItem('luma_event_name') || 'מוזמנים';
    const headers = ['שם', 'טלפון', 'סטטוס', 'צד', 'קטגוריה', 'מלווים', 'סך אנשים', 'הערות'];
    const rows = filtered.map(g => [
      g.fullName||g.full_name,
      g.phone,
      rsvpStatusLabel[(g.rsvpStatus||g.rsvp_status) as RsvpStatus],
      g.side ? sideLabelFull[g.side] : '',
      catLabelFull[g.category] || 'אחר',
      g.companions,
      1 + g.companions,
      g.notes || '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${eventName}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        <div className="flex items-center gap-2">
          <button onClick={() => setImportOpen(true)}
            className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }} title="ייבוא CSV / Excel">
            <Upload className="w-4 h-4 text-charcoal-500" strokeWidth={2}/>
          </button>
          <button onClick={() => setGrouped(p => !p)}
            className="w-9 h-9 rounded-2xl flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
            style={{ background: grouped ? '#1A1916' : 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}
            title="תצוגה לפי צד">
            {grouped
              ? <Layers className="w-4 h-4 text-white" strokeWidth={2}/>
              : <List className="w-4 h-4 text-charcoal-500" strokeWidth={2}/>}
          </button>
          {guests.length > 0 && (
            <button onClick={exportCSV}
              className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }} title="ייצוא CSV">
              <Download className="w-4 h-4 text-charcoal-500" strokeWidth={2}/>
            </button>
          )}
          <button onClick={onAddGuest}
            className="w-10 h-10 rounded-2xl bg-charcoal-900 flex items-center justify-center active:scale-90 transition-transform flex-shrink-0">
            <Plus className="w-5 h-5 text-white" strokeWidth={2.5}/>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none"/>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון..."
          className="w-full h-[52px] pr-11 pl-4 rounded-[26px] bg-white text-[14px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 transition"
          style={{boxShadow:'0 2px 12px rgba(0,0,0,0.07)'}}
        />
      </div>

      {/* Status bar + filter + sort */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex rounded-2xl p-1" style={{background:'rgba(0,0,0,0.06)'}}>
          {statusFilters.map(f=>(
            <button key={f.value} onClick={()=>setStatus(f.value)}
              className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
                status===f.value ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        {/* Filter button */}
        <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />
        {/* Sort toggle */}
        <button
          onClick={cycleSort}
          className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-white text-[11px] font-bold text-charcoal-700 active:scale-95 transition-transform flex-shrink-0"
          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
        >
          <ArrowUpDown className="w-3 h-3" strokeWidth={2.5}/>
          {sortLabels[sort]}
        </button>
      </div>

      {/* Active filter summary pill */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-charcoal-400">{filtered.length} תוצאות</span>
          <button
            onClick={() => { setSide('ALL'); setCategory('ALL'); }}
            className="text-[11px] text-gold-600 font-bold underline">
            נקה פילטרים
          </button>
        </div>
      )}

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
            {search||status!=='ALL'||side!=='ALL'||category!=='ALL' ? 'לא נמצאו תוצאות' : 'אין מוזמנים עדיין'}
          </p>
          <p className="text-[13px] text-charcoal-400 mb-6">
            {search||status!=='ALL'||side!=='ALL'||category!=='ALL' ? 'נסה לשנות את הסינון' : 'הוסף את המוזמן הראשון שלך'}
          </p>
          {!search&&status==='ALL'&&side==='ALL'&&category==='ALL'&&(
            <button onClick={onAddGuest}
              className="px-5 py-2.5 rounded-2xl bg-charcoal-900 text-white text-[13px] font-bold active:scale-95 transition-transform">
              הוסף מוזמן
            </button>
          )}
        </motion.div>
      ) : groupedList ? (
        <div className="space-y-5">
          {groupedList.map(({ side: s, guests: grp }) => {
            const key = s ?? 'null';
            const cfg = sideGroupConfig[key];
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base leading-none">{cfg.emoji}</span>
                  <span className="text-[12px] font-bold text-charcoal-500 uppercase tracking-widest">{cfg.label}</span>
                  <span className="text-[11px] text-charcoal-400 mr-1">
                    {grp.length} · {grp.reduce((a,g)=>a+1+(g.companions||0),0)} אנשים
                  </span>
                </div>
                <div className="space-y-2">
                  {grp.map((g,i) => (
                    <motion.div key={g.id} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:i*0.02}}>
                      <GuestCard guest={g} onEdit={onEditGuest} onDelete={onDeleteGuest} onView={onViewGuest} userId={userId} event={event}/>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((g,i)=>(
              <motion.div key={g.id}
                initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                transition={{delay:Math.min(i*0.03,0.15)}}>
                <GuestCard guest={g} onEdit={onEditGuest} onDelete={onDeleteGuest} onView={onViewGuest} userId={userId} event={event}/>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <ImportGuestsModal
        open={importOpen}
        userId={userId}
        eventId={event?.id || ''}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); onGuestsImported?.(); }}
      />

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        side={side}
        category={category}
        onSideChange={setSide}
        onCategoryChange={setCategory}
        resultCount={filtered.length}
      />

    </div>
  );
};
