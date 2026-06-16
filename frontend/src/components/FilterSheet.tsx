import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { Category, Side } from '../types';
import { getSideLabels } from '../utils/eventType';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  side: Side | 'ALL';
  category: Category | 'ALL';
  onSideChange: (v: Side | 'ALL') => void;
  onCategoryChange: (v: Category | 'ALL') => void;
  resultCount: number;
  eventType?: string | null;
}

const categories: { value: Category | 'ALL'; label: string; color: string }[] = [
  { value: 'ALL',     label: 'הכל',    color: '#1A1916' },
  { value: 'FAMILY',  label: 'משפחה', color: '#93C5FD' },
  { value: 'FRIENDS', label: 'חברים', color: '#C4B5FD' },
  { value: 'WORK',    label: 'עבודה', color: '#94A3B8' },
  { value: 'OTHER',   label: 'אחר',   color: '#D1D5DB' },
];

export const FilterSheet = ({
  open, onClose, side, category, onSideChange, onCategoryChange, resultCount, eventType,
}: FilterSheetProps) => {
  const sl = getSideLabels(eventType);
  const sides: { value: Side | 'ALL'; label: string; emoji?: string; color: string }[] = [
    { value: 'ALL',    label: 'הכל',       color: '#1A1916' },
    { value: 'GROOM',  label: sl.side1,   emoji: sl.side1Emoji, color: '#C9A84C' },
    { value: 'BRIDE',  label: sl.side2,   emoji: sl.side2Emoji, color: '#F9A8D4' },
    { value: 'SHARED', label: sl.shared,  emoji: '💑',          color: '#A5B4FC' },
  ];
  const hasFilters = side !== 'ALL' || category !== 'ALL';

  const clearAll = () => { onSideChange('ALL'); onCategoryChange('ALL'); };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[28px] pb-safe"
            style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.14)' }}
            dir="rtl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-charcoal-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-charcoal-600" strokeWidth={2} />
                <span className="text-[16px] font-bold text-charcoal-900">סינון</span>
              </div>
              <div className="flex items-center gap-3">
                {hasFilters && (
                  <button onClick={clearAll}
                    className="text-[13px] font-semibold text-charcoal-400 underline">
                    נקה הכל
                  </button>
                )}
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-charcoal-100 flex items-center justify-center active:scale-90 transition-transform">
                  <X className="w-4 h-4 text-charcoal-600" />
                </button>
              </div>
            </div>

            <div className="px-5 space-y-5 pb-4">

              {/* Side section */}
              <div>
                <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2.5">צד</p>
                <div className="flex gap-2 flex-wrap">
                  {sides.map(s => {
                    const active = side === s.value;
                    return (
                      <button key={s.value}
                        onClick={() => onSideChange(s.value as Side | 'ALL')}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95"
                        style={{
                          background: active ? (s.value === 'ALL' ? '#1A1916' : s.color + '28') : '#F4F2EF',
                          color: active
                            ? (s.value === 'ALL' ? 'white' : s.value === 'BRIDE' ? '#9D174D' : s.value === 'GROOM' ? '#92400E' : '#4338CA')
                            : '#6E6862',
                          border: active && s.value !== 'ALL' ? `1.5px solid ${s.color}` : '1.5px solid transparent',
                        }}
                      >
                        {s.emoji && <span className="text-base leading-none">{s.emoji}</span>}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category section */}
              <div>
                <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2.5">קטגוריה</p>
                <div className="flex gap-2 flex-wrap">
                  {categories.map(c => {
                    const active = category === c.value;
                    return (
                      <button key={c.value}
                        onClick={() => onCategoryChange(c.value as Category | 'ALL')}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95"
                        style={{
                          background: active ? (c.value === 'ALL' ? '#1A1916' : c.color + '28') : '#F4F2EF',
                          color: active ? (c.value === 'ALL' ? 'white' : '#1A1916') : '#6E6862',
                          border: active && c.value !== 'ALL' ? `1.5px solid ${c.color}` : '1.5px solid transparent',
                        }}
                      >
                        {c.value !== 'ALL' && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        )}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* CTA */}
            <div className="px-5 pb-8 pt-1">
              <button onClick={onClose}
                className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold active:scale-[0.98] transition-transform"
                style={{ boxShadow: '0 4px 16px rgba(26,25,22,0.18)' }}
              >
                הצג {resultCount} תוצאות
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

// ── Trigger button (used in GuestList toolbar) ────────────────
interface FilterButtonProps {
  onClick: () => void;
  activeCount: number;
}

export const FilterButton = ({ onClick, activeCount }: FilterButtonProps) => (
  <button
    onClick={onClick}
    className="relative w-9 h-9 rounded-2xl flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
    style={{
      background: activeCount > 0 ? '#1A1916' : 'white',
      boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    }}
  >
    <SlidersHorizontal
      className="w-4 h-4"
      style={{ color: activeCount > 0 ? 'white' : '#6E6862' }}
      strokeWidth={2}
    />
    {activeCount > 0 && (
      <span
        className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-gold-500 text-white text-[9px] font-black flex items-center justify-center"
      >
        {activeCount}
      </span>
    )}
  </button>
);
