import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { rsvpService } from '../services/supabase';
import { RsvpPublicGuest } from '../types';

interface RsvpPageProps {
  token: string;
  eventName?: string;
  eventDate?: string;
  venueName?: string;
  venueAddress?: string;
}

type Step = 'loading' | 'form' | 'already' | 'success' | 'error';
type ErrorState = 'not_found' | 'guest_unavailable' | 'general';

const fallbackDate = 'טרם נקבע';
const fallbackVenue = 'טרם נקבע';

export const RsvpPage = ({
  token,
  eventName: propEventName,
  eventDate: propEventDate,
  venueName: propVenueName,
  venueAddress: propVenueAddress,
}: RsvpPageProps) => {
  const [guest, setGuest] = useState<RsvpPublicGuest | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [errorState, setErrorState] = useState<ErrorState>('general');
  const [companions, setCompanions] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [choice, setChoice] = useState<'CONFIRMED' | 'DECLINED' | null>(null);

  useEffect(() => {
    void load();
  }, [token]);

  const load = async () => {
    try {
      setStep('loading');
      const data = await rsvpService.getByToken(token);

      if (!data) {
        setErrorState('not_found');
        setStep('error');
        return;
      }

      if (!data.id || !data.full_name) {
        setErrorState('guest_unavailable');
        setStep('error');
        return;
      }

      setGuest(data);
      setCompanions(data.companions || 0);
      setStep(data.rsvp_via_link ? 'already' : 'form');
    } catch {
      setErrorState('general');
      setStep('error');
    }
  };

  const handleSubmit = async (status: 'CONFIRMED' | 'DECLINED') => {
    if (!guest || submitting) return;

    try {
      setChoice(status);
      setSubmitting(true);
      const response = await rsvpService.respond(token, status, companions, note || undefined);

      if (!response?.success) {
        setErrorState(response?.error ? 'guest_unavailable' : 'general');
        setStep('error');
        return;
      }

      setStep('success');
    } catch {
      setErrorState('general');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const eventInfo = useMemo(() => {
    const eventName = guest?.event_name || propEventName || 'הזמנה לאירוע';
    const rawDate = guest?.event_date || propEventDate || null;
    const venueName = guest?.venue_name || propVenueName || fallbackVenue;
    const venueAddress = guest?.venue_address || propVenueAddress || '';

    const formattedDate = rawDate
      ? new Date(rawDate).toLocaleDateString('he-IL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : fallbackDate;

    return {
      eventName,
      formattedDate,
      venueName,
      venueAddress,
    };
  }, [guest, propEventDate, propEventName, propVenueAddress, propVenueName]);

  const errorContent = {
    not_found: {
      title: 'הקישור לאישור ההגעה לא נמצא',
      description: 'בדוק שקיבלת את הקישור המלא ונסה לפתוח אותו שוב.',
    },
    guest_unavailable: {
      title: 'המוזמן אינו זמין יותר',
      description: 'ייתכן שהמוזמן הוסר או שהקישור כבר אינו פעיל.',
    },
    general: {
      title: 'לא הצלחנו לטעון את אישור ההגעה',
      description: 'נסה שוב בעוד כמה רגעים.',
    },
  } as const;

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: '#F8F6F2' }}
    >
      <AnimatePresence mode="wait">
        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-8 h-8 text-charcoal-400 animate-spin" />
            <p className="text-charcoal-400 text-sm">טוען...</p>
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-16 h-16 rounded-3xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-charcoal-900 mb-2">{errorContent[errorState].title}</h2>
            <p className="text-sm text-charcoal-400 leading-relaxed">{errorContent[errorState].description}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => void load()}
                className="w-full py-3 rounded-2xl bg-charcoal-900 text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                נסה שוב
              </button>
            </div>
          </motion.div>
        )}

        {step === 'already' && guest && (
          <motion.div
            key="already"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-gold-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gold-600" />
            </div>
            <h2 className="text-2xl font-bold text-charcoal-900 mb-1">{guest.full_name}</h2>
            <p className="text-sm text-charcoal-500 mb-3">
              {guest.rsvp_status === 'CONFIRMED' ? 'אישרת הגעה לאירוע' : 'סימנת שלא תגיע/י'}
            </p>
            <div className="bg-white rounded-2xl p-4 text-center space-y-2" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="text-[11px] text-charcoal-400">{eventInfo.eventName}</p>
              <p className="text-[13px] text-charcoal-500">📅 {eventInfo.formattedDate}</p>
              <p className="text-[13px] text-charcoal-500">📍 {eventInfo.venueName}</p>
              {eventInfo.venueAddress ? <p className="text-[11px] text-charcoal-300">{eventInfo.venueAddress}</p> : null}
              <div className="pt-2 border-t border-charcoal-100">
                <p className="text-xs text-charcoal-400">סטטוס נוכחי</p>
                <p className="text-base font-bold text-charcoal-900">
                  {guest.rsvp_status === 'CONFIRMED' ? 'אישרתי הגעה' : 'לא אגיע'}
                </p>
                {guest.companions > 0 ? (
                  <p className="text-sm text-charcoal-500">
                    {guest.companions} מלווים · {guest.companions + 1} אנשים סך הכל
                  </p>
                ) : null}
              </div>
            </div>
            <button onClick={() => setStep('form')} className="mt-5 text-sm text-gold-600 font-bold underline">
              שינוי תשובה
            </button>
          </motion.div>
        )}

        {step === 'form' && guest && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <div className="mb-8">
              <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                <p className="text-[17px] font-bold text-charcoal-900">{eventInfo.eventName}</p>
                <p className="text-[13px] text-charcoal-500 mt-0.5">📅 {eventInfo.formattedDate}</p>
                <p className="text-[12px] text-charcoal-400 mt-0.5">📍 {eventInfo.venueName}</p>
                {eventInfo.venueAddress ? <p className="text-[11px] text-charcoal-300 mt-0.5">{eventInfo.venueAddress}</p> : null}
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-charcoal-900">{guest.full_name}</h1>
              <p className="text-sm text-charcoal-400 mt-1">נשמח לדעת אם תגיע/י</p>
            </div>

            <div className="bg-white rounded-2xl p-5 mb-5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <p className="text-[13px] font-bold text-charcoal-500 text-center mb-4">כמה אנשים מגיעים?</p>
              <div className="flex items-center justify-center gap-5">
                <button
                  onClick={() => setCompanions((current) => Math.max(0, current - 1))}
                  className="w-12 h-12 rounded-2xl bg-charcoal-100 flex items-center justify-center text-2xl font-bold text-charcoal-700 active:scale-90 transition-transform"
                >
                  -
                </button>
                <div className="text-center min-w-[64px]">
                  <span className="text-[48px] font-black text-charcoal-900 leading-none">{companions + 1}</span>
                  <p className="text-[12px] text-charcoal-400 mt-1">
                    {companions + 1 === 1 ? 'רק אני' : `${companions + 1} אנשים`}
                  </p>
                </div>
                <button
                  onClick={() => setCompanions((current) => current + 1)}
                  className="w-12 h-12 rounded-2xl bg-charcoal-900 flex items-center justify-center text-2xl font-bold text-white active:scale-90 transition-transform"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => !submitting && handleSubmit('CONFIRMED')}
                disabled={submitting}
                className="w-full py-5 rounded-2xl text-white text-lg font-bold flex items-center justify-center gap-3 disabled:opacity-60 transition-all"
                style={{
                  background: submitting && choice === 'CONFIRMED' ? '#059669' : '#10B981',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                }}
              >
                {submitting && choice === 'CONFIRMED' ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-xl">✅</span>}
                אני מגיע/ה
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => !submitting && handleSubmit('DECLINED')}
                disabled={submitting}
                className="w-full py-5 rounded-2xl text-charcoal-600 text-base font-bold flex items-center justify-center gap-3 disabled:opacity-60 transition-all border border-charcoal-200 bg-white"
              >
                {submitting && choice === 'DECLINED' ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-lg">😔</span>}
                לא אגיע
              </motion.button>
            </div>

            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
              <p className="text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-2">הערות / רגישויות מזון</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="לדוגמה: צמחוני, ללא גלוטן..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-charcoal-50 text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 resize-none transition"
              />
            </div>

            <p className="text-center text-xs text-charcoal-400 mt-5">ניתן לשנות את התשובה בכל עת דרך הקישור</p>
          </motion.div>
        )}

        {step === 'success' && guest && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: choice === 'CONFIRMED' ? '#ECFDF5' : '#FFF1F2',
                boxShadow: choice === 'CONFIRMED'
                  ? '0 8px 24px rgba(16,185,129,0.25)'
                  : '0 8px 24px rgba(248,113,113,0.2)',
              }}
            >
              <span className="text-4xl">{choice === 'CONFIRMED' ? '🎉' : '💔'}</span>
            </motion.div>

            <h2 className="text-2xl font-bold text-charcoal-900 mb-2">
              {choice === 'CONFIRMED' ? 'תודה, מחכים לך!' : 'תודה על ההודעה'}
            </h2>
            <p className="text-sm text-charcoal-400 leading-relaxed">
              {choice === 'CONFIRMED'
                ? companions > 0
                  ? `אישרת הגעה לאירוע עם ${companions} מלווים. נשמח לראותך!`
                  : 'אישרת הגעה לאירוע. נשמח לראותך!'
                : 'חבל שלא תגיע/י. מקווים לראותך בפעם הבאה!'}
            </p>
            <div className="mt-4 bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="text-[11px] text-charcoal-400">{eventInfo.eventName}</p>
              <p className="text-[13px] text-charcoal-500 mt-1">📅 {eventInfo.formattedDate}</p>
              <p className="text-[13px] text-charcoal-500 mt-1">📍 {eventInfo.venueName}</p>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <button onClick={() => setStep('form')} className="text-sm text-gold-600 font-bold">
                שינוי תשובה
              </button>
              <p className="text-xs text-charcoal-400">ניתן לסגור חלון זה</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
