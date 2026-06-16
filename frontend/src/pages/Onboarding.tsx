import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, MapPin } from 'lucide-react';
import { Event } from '../types';

interface OnboardingProps {
  onComplete: () => void;
  onUpdateEvent: (updates: Partial<Event>) => Promise<Event | undefined>;
  eventId?: string;
}

const inputCls = 'w-full px-4 py-4 rounded-2xl bg-white text-[15px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 transition';

export const Onboarding = ({ onComplete, onUpdateEvent }: OnboardingProps) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    event_name: '',
    event_date: '',
    venue_name: '',
  });

  const steps = [
    {
      title: 'ברוך הבא! 🎉',
      subtitle: 'בוא נגדיר את האירוע שלך — זה לוקח פחות מדקה',
      fields: (
        <div className="space-y-3">
          <input
            value={form.event_name}
            onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))}
            placeholder="שם האירוע (למשל: חתונת שרה ודוד)"
            className={inputCls}
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
          />
          {/* Date picker — hidden native input + custom Hebrew display */}
          <div
            className={`${inputCls} relative cursor-pointer`}
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
            onClick={() => dateRef.current?.showPicker?.()}
          >
            <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
            <span className={`block pr-7 ${form.event_date ? 'text-charcoal-900' : 'text-charcoal-400'}`}>
              {form.event_date
                ? new Date(form.event_date + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'תאריך האירוע'}
            </span>
            <input
              ref={dateRef}
              type="date"
              value={form.event_date}
              onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
            <input
              value={form.venue_name}
              onChange={e => setForm(p => ({ ...p, venue_name: e.target.value }))}
              placeholder="שם המקום (אופציונלי)"
              className={`${inputCls} pr-11`}
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
            />
          </div>
        </div>
      ),
      canNext: !!form.event_name.trim(),
    },
    {
      title: 'הכל מוגדר! ✦',
      subtitle: 'עכשיו אפשר להוסיף מוזמנים ולשלוח קישורי RSVP',
      fields: (
        <div className="space-y-4">
          {[
            { emoji: '👥', text: 'הוסף מוזמנים ידנית או ייבא מ-Excel' },
            { emoji: '📲', text: 'שלח קישור RSVP אישי לכל אורח בוואטסאפ' },
            { emoji: '📊', text: 'עקוב אחר אישורים בזמן אמת בדשבורד' },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <span className="text-2xl flex-shrink-0">{emoji}</span>
              <p className="text-[14px] font-semibold text-charcoal-800">{text}</p>
            </div>
          ))}
        </div>
      ),
      canNext: true,
    },
  ];

  const current = steps[step];

  const handleNext = async () => {
    if (step === 0) {
      try {
        setSaving(true);
        await onUpdateEvent({
          event_name: form.event_name.trim() || 'האירוע שלי',
          event_date: form.event_date || null,
          venue_name: form.venue_name.trim() || null,
        });
      } catch { /* silent */ }
      finally { setSaving(false); }
      setStep(1);
    } else {
      localStorage.setItem('luma_onboarding_done', '1');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('luma_onboarding_done', '1');
    onComplete();
  };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: '#F5F3EF' }}>
      {/* Logo top */}
      <div className="flex-shrink-0" style={{
        height: 160,
        background: '#1A1916',
        backgroundImage: 'url("/logo hd.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }} />

      {/* Card */}
      <div className="flex-1 flex flex-col px-5 pt-8 pb-8" style={{ borderRadius: '28px 28px 0 0', marginTop: -24, background: '#F5F3EF' }}>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === step ? 24 : 8, background: i === step ? '#1A1916' : '#D1CEC9' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <h2 className="text-[26px] font-bold font-serif text-charcoal-900 mb-1">{current.title}</h2>
            <p className="text-[13px] text-charcoal-500 mb-6 leading-relaxed">{current.subtitle}</p>
            {current.fields}
          </motion.div>
        </AnimatePresence>

        <div className="mt-auto pt-6 space-y-3">
          <button
            onClick={handleNext}
            disabled={!current.canNext || saving}
            className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
            style={{ boxShadow: '0 4px 16px rgba(26,25,22,0.2)' }}
          >
            {saving ? 'שומר...' : step < steps.length - 1 ? 'המשך' : 'בוא נתחיל! →'}
          </button>
          {step === 0 && (
            <button onClick={handleSkip}
              className="w-full py-3 text-[13px] text-charcoal-400 font-medium">
              דלג — אגדיר מאוחר יותר
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-charcoal-300 mt-4">
          Powered by <span className="font-semibold text-charcoal-400">Atzma</span>
        </p>
      </div>
    </div>
  );
};
