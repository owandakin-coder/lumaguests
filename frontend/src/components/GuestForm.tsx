import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Side, Category, RsvpStatus, Guest, CreateGuestInput } from '../types';
import { normalizePhone } from '../utils/phone';
import { getSideLabels } from '../utils/eventType';

interface GuestFormProps {
  initialData?: Guest;
  onSubmit: (data: CreateGuestInput) => Promise<void>;
  isLoading?: boolean;
  onCancel: () => void;
  title?: string;
  eventType?: string | null;
}

const categories: { value: Category; label: string; color: string }[] = [
  { value: 'FAMILY',  label: 'משפחה',  color: '#93C5FD' },
  { value: 'FRIENDS', label: 'חברים',  color: '#C4B5FD' },
  { value: 'WORK',    label: 'עבודה',  color: '#94A3B8' },
  { value: 'OTHER',   label: 'אחר',    color: '#D1D5DB' },
];

const rsvpOptions: { value: RsvpStatus; label: string; bg: string; active: string; text: string }[] = [
  { value: 'PENDING',   label: 'ממתין',    bg: '#FFFBEB', active: '#F59E0B', text: '#92400E' },
  { value: 'CONFIRMED', label: 'אישר',     bg: '#ECFDF5', active: '#10B981', text: '#065F46' },
  { value: 'DECLINED',  label: 'לא מגיע', bg: '#FFF1F2', active: '#F87171', text: '#9F1239' },
];

export const GuestForm = ({ initialData, onSubmit, isLoading=false, onCancel, title, eventType }: GuestFormProps) => {
  const sl = getSideLabels(eventType);
  const sides: { value: Side; label: string; color: string; emoji: string }[] = [
    { value: 'GROOM',  label: sl.side1,  color: '#C9A84C', emoji: sl.side1Emoji },
    { value: 'BRIDE',  label: sl.side2,  color: '#F9A8D4', emoji: sl.side2Emoji },
    { value: 'SHARED', label: sl.shared, color: '#A5B4FC', emoji: '💑' },
  ];
  const [form, setForm] = useState<CreateGuestInput>({
    fullName:   initialData?.fullName  || initialData?.full_name   || '',
    phone:      initialData?.phone     || '',
    companions: initialData?.companions || 0,
    side:       initialData?.side      ?? null,
    category:   (initialData?.category as Category) || 'FAMILY',
    rsvpStatus: initialData?.rsvpStatus || initialData?.rsvp_status || 'PENDING',
    notes:      initialData?.notes     || '',
  });
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setErrors({}); }, []);

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.fullName.trim())  e.fullName = 'שם מלא הוא שדה חובה';
    if (!form.phone.trim())     e.phone    = 'מספר טלפון הוא שדה חובה';
    else if (!/^[\d\s\-\+\(\)]+$/.test(form.phone)) e.phone = 'פורמט טלפון לא תקין';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    try {
      setSubmitting(true);
      await onSubmit({ ...form, phone: normalizePhone(form.phone) });
    } catch (err: any) {
      const msg = err?.message || (typeof err === 'string' ? err : 'שגיאה בשמירה, נסה שוב');
      setErrors(p=>({...p, submit: msg}));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls = (f: string) =>
    `w-full px-4 py-4 rounded-2xl text-[15px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none transition ${
      errors[f]
        ? 'bg-red-50 ring-2 ring-red-300'
        : 'bg-white focus:ring-2 focus:ring-charcoal-200'
    }`;

  const toggleSide = (val: Side) =>
    setForm(p => ({ ...p, side: p.side === val ? null : val }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center active:scale-90 transition-transform"
          style={{boxShadow:'0 1px 6px rgba(0,0,0,0.08)'}}>
          <ChevronRight className="w-5 h-5 text-charcoal-600"/>
        </button>
        <h1 className="text-[22px] font-bold text-charcoal-900">{title||'הוספת מוזמן'}</h1>
      </div>

      {/* Section: פרטים אישיים */}
      <div>
        <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2 mr-1">פרטים אישיים</p>
        <div className="space-y-2">
          <div>
            <input
              type="text" name="fullName" value={form.fullName}
              onChange={e=>{setForm(p=>({...p,fullName:e.target.value}));setErrors(p=>({...p,fullName:''}));}}
              placeholder="שם מלא"
              className={fieldCls('fullName')}
              style={{boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}
            />
            {errors.fullName && <p className="text-red-500 text-[11px] mt-1 mr-1">{errors.fullName}</p>}
          </div>
          <div>
            <input
              type="tel" name="phone" value={form.phone} dir="ltr"
              onChange={e=>{setForm(p=>({...p,phone:e.target.value}));setErrors(p=>({...p,phone:''}));}}
              placeholder="050-000-0000"
              className={`${fieldCls('phone')} text-right`}
              style={{boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}
            />
            {errors.phone && <p className="text-red-500 text-[11px] mt-1 mr-1">{errors.phone}</p>}
          </div>
        </div>
      </div>

      {/* Section: מלווים */}
      <div>
        <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2 mr-1">מלווים</p>
        <div className="bg-white rounded-2xl flex items-center justify-between px-4 py-3"
          style={{boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}>
          <span className="text-[14px] text-charcoal-600 font-medium">מספר מלווים</span>
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={()=>setForm(p=>({...p,companions:Math.max(0,p.companions-1)}))}
              className="w-9 h-9 rounded-xl bg-charcoal-100 flex items-center justify-center text-lg font-bold text-charcoal-700 active:scale-90 transition-transform">
              −
            </button>
            <span className="text-[18px] font-bold text-charcoal-900 w-6 text-center">{form.companions}</span>
            <button type="button"
              onClick={()=>setForm(p=>({...p,companions:Math.min(20,p.companions+1)}))}
              className="w-9 h-9 rounded-xl bg-charcoal-900 flex items-center justify-center text-lg font-bold text-white active:scale-90 transition-transform">
              +
            </button>
          </div>
        </div>
      </div>

      {/* Section: צד */}
      <div>
        <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2 mr-1">צד</p>
        <div className="grid grid-cols-3 gap-2">
          {sides.map(s => {
            const active = form.side === s.value;
            return (
              <button key={s.value} type="button"
                onClick={() => toggleSide(s.value)}
                className={`py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-95 flex flex-col items-center gap-1 ${
                  active ? 'bg-charcoal-900 text-white' : 'bg-white text-charcoal-700'
                }`}
                style={{boxShadow: active ? 'none' : '0 1px 4px rgba(0,0,0,0.05)'}}>
                <span className="text-base leading-none">{s.emoji}</span>
                <span style={{ color: active ? s.color : undefined }}>{s.label}</span>
              </button>
            );
          })}
        </div>
        {form.side && (
          <button type="button" onClick={() => setForm(p => ({ ...p, side: null }))}
            className="mt-2 text-[11px] text-charcoal-400 mr-1 underline">
            ניקוי בחירה
          </button>
        )}
      </div>

      {/* Section: קטגוריה */}
      <div>
        <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2 mr-1">קטגוריה</p>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(c=>{
            const active = form.category === c.value;
            return (
              <button key={c.value} type="button"
                onClick={()=>setForm(p=>({...p,category:c.value}))}
                className={`py-3.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  active ? 'bg-charcoal-900 text-white' : 'bg-white text-charcoal-700'
                }`}
                style={{boxShadow:active?'none':'0 1px 4px rgba(0,0,0,0.05)'}}>
                {active && <div className="w-2 h-2 rounded-full" style={{background:c.color}}/>}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section: RSVP */}
      <div>
        <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2 mr-1">סטטוס הגעה</p>
        <div className="grid grid-cols-3 gap-2">
          {rsvpOptions.map(r=>{
            const active = form.rsvpStatus === r.value;
            return (
              <motion.button key={r.value} type="button"
                onClick={()=>setForm(p=>({...p,rsvpStatus:r.value}))}
                whileTap={{scale:0.95}}
                className="py-3.5 rounded-2xl text-[13px] font-bold transition-all flex flex-col items-center gap-1"
                style={{
                  background: active ? r.active : 'white',
                  color: active ? 'white' : r.text,
                  boxShadow: active ? `0 4px 12px ${r.active}40` : '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                <div className="w-2 h-2 rounded-full" style={{background: active?'white':r.active}}/>
                {r.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2 mr-1">הערות</p>
        <textarea
          name="notes" value={form.notes} rows={3}
          onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
          placeholder="הערות נוספות..."
          className="w-full px-4 py-4 rounded-2xl bg-white text-[15px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 transition resize-none"
          style={{boxShadow:'0 1px 6px rgba(0,0,0,0.05)'}}
        />
      </div>

      {errors.submit && (
        <div className="bg-red-50 text-red-600 text-[13px] px-4 py-3 rounded-2xl font-medium">{errors.submit}</div>
      )}

      {/* CTA */}
      <div className="pt-2">
        <button type="submit" disabled={isLoading || submitting}
          className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
          style={{boxShadow:'0 4px 16px rgba(26,25,22,0.2)'}}>
          {isLoading || submitting ? 'שומר...' : 'שמור מוזמן'}
        </button>
      </div>

    </form>
  );
};
