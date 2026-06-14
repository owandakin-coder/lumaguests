import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  StickyNote,
} from 'lucide-react';
import { eventService } from '../services/supabase';
import { PublicEventData } from '../types';

interface EventPublicPageProps {
  slug: string;
}

type Step = 'loading' | 'form' | 'success' | 'declined' | 'error' | 'not_public' | 'event_closed';

function useCountdown(eventDate: string | null) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!eventDate) return null;
    const target = new Date(eventDate);
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds, past: false };
  }, [eventDate, now]);
}

const pad = (n: number) => String(n).padStart(2, '0');
const normalizePhone = (value: string) => value.replace(/\D/g, '');

export const EventPublicPage = ({ slug }: EventPublicPageProps) => {
  const [event, setEvent] = useState<PublicEventData | null>(null);
  const [disabledName, setDisabledName] = useState('');
  const [step, setStep] = useState<Step>('loading');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companions, setCompanions] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState<'CONFIRMED' | 'DECLINED' | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const countdown = useCountdown(event?.event_date ?? null);

  useEffect(() => {
    void load();
  }, [slug]);

  const load = async () => {
    try {
      const result = await eventService.getBySlug(slug);
      if (result.error === 'not_public') {
        setDisabledName(result.eventName || '');
        setStep('not_public');
        return;
      }
      if (!result.event) {
        setStep('error');
        return;
      }
      setEvent(result.event);
      setStep('form');
    } catch {
      setStep('error');
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!fullName.trim()) nextErrors.fullName = 'שם מלא הוא שדה חובה';
    if (!phone.trim()) {
      nextErrors.phone = 'מספר טלפון הוא שדה חובה';
    } else if (!normalizePhone(phone)) {
      nextErrors.phone = 'מספר הטלפון אינו תקין';
    }
    setErrors(nextErrors);
    return !Object.keys(nextErrors).length;
  };

  const handleSubmit = async (status: 'CONFIRMED' | 'DECLINED') => {
    if (!event || submitting) return;
    if (!validate()) return;
    if (honeypot) {
      setStep(status === 'CONFIRMED' ? 'success' : 'declined');
      return;
    }
    const normalizedPhone = normalizePhone(phone);

    try {
      setChoice(status);
      setSubmitting(true);
      const res = await eventService.publicRegister(
        slug,
        fullName.trim(),
        normalizedPhone,
        status,
        companions,
        note || undefined
      );

      if (!res.success) {
        if (res.error === 'event_passed') {
          setStep('event_closed');
          return;
        }
        if (res.error === 'rate_limited') {
          setErrors({ submit: 'יותר מדי ניסיונות — נסה שוב בעוד מספר דקות' });
          return;
        }
        setErrors({ submit: 'אירעה שגיאה, נסה שוב' });
        return;
      }

      setStep(status === 'CONFIRMED' ? 'success' : 'declined');
    } catch {
      setErrors({ submit: 'אירעה שגיאה, נסה שוב' });
    } finally {
      setSubmitting(false);
    }
  };

  const accent = event?.theme_color || '#C9A84C';

  const formattedDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const formattedTime = event?.event_date
    ? new Date(event.event_date).toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: '#F8F6F2' }}>
      <AnimatePresence mode="wait">
        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center"
          >
            <Loader2 className="w-8 h-8 text-charcoal-400 animate-spin" />
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-red-100 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-charcoal-900 mb-2">הקישור לא זמין</h2>
            <p className="text-sm text-charcoal-400">הקישור אינו פעיל או שפג תוקפו.</p>
          </motion.div>
        )}

        {step === 'not_public' && (
          <motion.div
            key="not_public"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            {disabledName ? (
              <h2 className="text-xl font-bold text-charcoal-900 mb-1">{disabledName}</h2>
            ) : null}
            <p className="text-[15px] font-semibold text-charcoal-700 mb-2">
              ההרשמה לאירוע אינה פתוחה כרגע
            </p>
            <p className="text-[13px] text-charcoal-400 leading-relaxed max-w-xs">
              בעל האירוע טרם פתח את הרישום. נסה שוב מאוחר יותר.
            </p>
          </motion.div>
        )}

        {step === 'event_closed' && (
          <motion.div
            key="event_closed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-charcoal-100 flex items-center justify-center mb-4">
              <span className="text-3xl">📅</span>
            </div>
            <h2 className="text-xl font-bold text-charcoal-900 mb-2">תקופת ההרשמה הסתיימה</h2>
            <p className="text-sm text-charcoal-400 leading-relaxed max-w-xs">
              תאריך האירוע עבר ולא ניתן עוד לאשר הגעה.
            </p>
          </motion.div>
        )}

        {(step === 'success' || step === 'declined') && event && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col"
          >
            <div
              className="h-40 flex items-end px-6 pb-6"
              style={{ background: `linear-gradient(160deg, ${accent}33 0%, ${accent}11 100%)` }}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>
                  {step === 'success' ? '🎉 אישור הגעה' : '💙 קיבלנו תשובה'}
                </p>
                <h1 className="text-2xl font-black text-charcoal-900">{event.event_name}</h1>
              </div>
            </div>

            <div className="flex-1 px-5 py-8 flex flex-col items-center text-center max-w-sm mx-auto w-full">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.1 }}
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{
                  background: step === 'success' ? '#ECFDF5' : '#EFF6FF',
                  boxShadow:
                    step === 'success'
                      ? '0 8px 24px rgba(16,185,129,0.2)'
                      : '0 8px 24px rgba(96,165,250,0.2)',
                }}
              >
                <span className="text-4xl">{step === 'success' ? '🎉' : '💙'}</span>
              </motion.div>

              <h2 className="text-2xl font-bold text-charcoal-900 mb-2">
                {step === 'success' ? 'תודה, מחכים לך!' : 'תודה על ההודעה'}
              </h2>
              <p className="text-sm text-charcoal-500 leading-relaxed mb-6">
                {step === 'success'
                  ? companions > 0
                    ? `אישרת הגעה עם ${companions} מלווים. נשמח לראותך!`
                    : 'אישרת הגעה לאירוע. נשמח לראותך!'
                  : 'חבל שלא תגיע/י. מקווים לראותך בפעם הבאה!'}
              </p>

              <button onClick={() => setStep('form')} className="text-sm font-bold" style={{ color: accent }}>
                שינוי תשובה
              </button>
            </div>
          </motion.div>
        )}

        {step === 'form' && event && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              className="relative overflow-hidden"
              style={{ background: `linear-gradient(160deg, ${accent}22 0%, ${accent}08 100%)` }}
            >
              <div
                className="absolute top-0 left-0 w-64 h-64 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-30"
                style={{ background: accent }}
              />
              <div
                className="absolute bottom-0 right-0 w-40 h-40 rounded-full translate-x-1/4 translate-y-1/4 opacity-20"
                style={{ background: accent }}
              />

              <div className="relative px-6 pt-14 pb-10">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-6"
                  style={{ background: `${accent}20` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>
                    הזמנה לאירוע
                  </span>
                </div>

                <h1 className="text-[36px] font-black text-charcoal-900 leading-tight mb-4">
                  {event.event_name}
                </h1>

                {event.description ? (
                  <p className="text-[14px] text-charcoal-600 leading-relaxed mb-5">
                    {event.description}
                  </p>
                ) : null}

                <div className="space-y-2.5">
                  {formattedDate ? (
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${accent}20` }}
                      >
                        <CalendarDays className="w-4 h-4" style={{ color: accent }} />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-charcoal-900">{formattedDate}</p>
                        {formattedTime && formattedTime !== '00:00' ? (
                          <p className="text-[12px] text-charcoal-400">{formattedTime}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {event.venue_name ? (
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${accent}20` }}
                      >
                        <MapPin className="w-4 h-4" style={{ color: accent }} />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-charcoal-900">{event.venue_name}</p>
                        {event.venue_address ? (
                          <p className="text-[12px] text-charcoal-400">{event.venue_address}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {countdown && !countdown.past ? (
              <div className="mx-5 -mt-4 mb-1">
                <div
                  className="bg-charcoal-900 rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
                >
                  <Clock className="w-4 h-4 text-white/40 flex-shrink-0" strokeWidth={1.5} />
                  <div className="flex items-center gap-3 flex-1">
                    {countdown.days > 0 ? (
                      <div className="text-center">
                        <p className="text-[22px] font-black leading-none" style={{ color: accent }}>
                          {countdown.days}
                        </p>
                        <p className="text-[9px] text-white/40 mt-0.5">ימים</p>
                      </div>
                    ) : null}
                    <div className="text-center">
                      <p className="text-[22px] font-black text-white leading-none">{pad(countdown.hours)}</p>
                      <p className="text-[9px] text-white/40 mt-0.5">שעות</p>
                    </div>
                    <p className="text-white/30 text-lg font-bold">:</p>
                    <div className="text-center">
                      <p className="text-[22px] font-black text-white leading-none">{pad(countdown.minutes)}</p>
                      <p className="text-[9px] text-white/40 mt-0.5">דקות</p>
                    </div>
                    <p className="text-white/30 text-lg font-bold">:</p>
                    <div className="text-center">
                      <p className="text-[22px] font-black text-white leading-none">{pad(countdown.seconds)}</p>
                      <p className="text-[9px] text-white/40 mt-0.5">שניות</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="px-5 py-6 space-y-4 max-w-[430px] mx-auto">
              <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest">אישור הגעה</p>

              {/* honeypot — hidden from humans, bots fill it */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <div>
                <input
                  value={fullName}
                  maxLength={100}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setErrors((prev) => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="שם מלא *"
                  className={`w-full px-4 py-4 rounded-2xl text-[15px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none transition ${
                    errors.fullName
                      ? 'bg-red-50 ring-2 ring-red-300'
                      : 'bg-white focus:ring-2 focus:ring-charcoal-200'
                  }`}
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
                />
                {errors.fullName ? (
                  <p className="text-red-500 text-[11px] mt-1 mr-1">{errors.fullName}</p>
                ) : null}
              </div>

              <div>
                <input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  placeholder="מספר טלפון *"
                  type="tel"
                  dir="ltr"
                  className={`w-full px-4 py-4 rounded-2xl text-[15px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none transition text-right ${
                    errors.phone
                      ? 'bg-red-50 ring-2 ring-red-300'
                      : 'bg-white focus:ring-2 focus:ring-charcoal-200'
                  }`}
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
                />
                {errors.phone ? (
                  <p className="text-red-500 text-[11px] mt-1 mr-1">{errors.phone}</p>
                ) : null}
              </div>

              <div
                className="bg-white rounded-2xl flex items-center justify-between px-4 py-3"
                style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-charcoal-400" strokeWidth={1.8} />
                  <span className="text-[14px] font-semibold text-charcoal-700">כמה אנשים תגיעו?</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCompanions((current) => Math.max(0, current - 1))}
                    className="w-9 h-9 rounded-xl bg-charcoal-100 flex items-center justify-center text-lg font-bold text-charcoal-700 active:scale-90 transition-transform"
                  >
                    -
                  </button>
                  <div className="text-center min-w-[40px]">
                    <span className="text-[18px] font-bold text-charcoal-900">{companions + 1}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompanions((current) => Math.min(20, current + 1))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold text-white active:scale-90 transition-transform"
                    style={{ background: accent }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="relative">
                <StickyNote
                  className="absolute right-4 top-4 w-4 h-4 text-charcoal-300 pointer-events-none"
                  strokeWidth={1.8}
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="הערות / רגישויות מזון (אופציונלי)"
                  rows={2}
                  maxLength={500}
                  className="w-full pr-11 pl-4 py-4 rounded-2xl bg-white text-[14px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 resize-none transition"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
                />
              </div>

              {errors.submit ? (
                <div className="bg-red-50 text-red-600 text-[13px] px-4 py-3 rounded-2xl font-medium">
                  {errors.submit}
                </div>
              ) : null}

              <div className="space-y-3 pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSubmit('CONFIRMED')}
                  disabled={submitting}
                  className="w-full py-5 rounded-2xl text-white text-[16px] font-bold flex items-center justify-center gap-3 disabled:opacity-60 transition-all"
                  style={{
                    background: submitting && choice === 'CONFIRMED' ? '#059669' : '#10B981',
                    boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                  }}
                >
                  {submitting && choice === 'CONFIRMED' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  אגיע לאירוע
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSubmit('DECLINED')}
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl text-charcoal-600 text-[15px] font-semibold flex items-center justify-center gap-2.5 disabled:opacity-60 transition-all bg-white"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
                >
                  {submitting && choice === 'DECLINED' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 text-charcoal-400" />
                  )}
                  לא אגיע לאירוע
                </motion.button>
              </div>

              <p className="text-center text-[11px] text-charcoal-400 pt-2 pb-6">
                ניתן לשנות את התשובה בכל עת דרך הקישור
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
