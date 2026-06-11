import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Users, Loader2 } from 'lucide-react';
import { rsvpService } from '../services/supabase';
import { RsvpPublicGuest } from '../types';

interface RsvpPageProps {
  token: string;
}

type Step = 'loading' | 'form' | 'already' | 'success' | 'error';

export const RsvpPage = ({ token }: RsvpPageProps) => {
  const [guest, setGuest]         = useState<RsvpPublicGuest | null>(null);
  const [step, setStep]           = useState<Step>('loading');
  const [companions, setCompanions] = useState(0);
  const [note, setNote]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [choice, setChoice]       = useState<'CONFIRMED' | 'DECLINED' | null>(null);

  useEffect(() => {
    load();
  }, [token]);

  const load = async () => {
    try {
      const data = await rsvpService.getByToken(token);
      if (!data) { setStep('error'); return; }
      setGuest(data);
      setCompanions(data.companions || 0);
      if (data.rsvp_via_link) {
        setStep('already');
      } else {
        setStep('form');
      }
    } catch {
      setStep('error');
    }
  };

  const handleSubmit = async (status: 'CONFIRMED' | 'DECLINED') => {
    if (!guest || submitting) return;
    try {
      setChoice(status);
      setSubmitting(true);
      await rsvpService.respond(token, status, companions, note || undefined);
      setStep('success');
    } catch {
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: '#F8F6F2' }}
    >
      <AnimatePresence mode="wait">

        {/* Loading */}
        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-charcoal-400 animate-spin" />
            <p className="text-charcoal-400 text-sm">טוען...</p>
          </motion.div>
        )}

        {/* Error */}
        {step === 'error' && (
          <motion.div key="error" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-charcoal-900 mb-2">קישור לא תקין</h2>
            <p className="text-sm text-charcoal-400">הקישור פג תוקף או אינו תקין.</p>
          </motion.div>
        )}

        {/* Already responded */}
        {step === 'already' && guest && (
          <motion.div key="already" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-3xl bg-gold-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gold-600" />
            </div>
            <h2 className="text-2xl font-bold text-charcoal-900 mb-1">{guest.full_name}</h2>
            <p className="text-sm text-charcoal-500 mb-6">
              {guest.rsvp_status === 'CONFIRMED' ? '✅ אישרת הגעה לאירוע' : '❌ לא תוכל/י להגיע'}
            </p>
            <div className="bg-white rounded-2xl p-4 text-right space-y-2"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="text-xs text-charcoal-400">סטטוס נוכחי</p>
              <p className="text-base font-bold text-charcoal-900">
                {guest.rsvp_status === 'CONFIRMED' ? 'אישרתי הגעה' : 'לא אגיע'}
              </p>
              {guest.companions > 0 && (
                <p className="text-sm text-charcoal-500">{guest.companions} מלווים · {1+guest.companions} אנשים סך הכל</p>
              )}
            </div>
            <button onClick={() => setStep('form')}
              className="mt-5 text-sm text-gold-600 font-bold underline">
              שינוי תשובה
            </button>
          </motion.div>
        )}

        {/* RSVP Form */}
        {step === 'form' && guest && (
          <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm">

            {/* Brand */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-charcoal-900 flex items-center justify-center mx-auto mb-3"
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                <span className="text-gold-400 text-lg font-black">L</span>
              </div>
              <p className="text-xs text-charcoal-400 font-medium uppercase tracking-widest">הזמנה לאירוע</p>
            </div>

            {/* Guest name */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-charcoal-900">{guest.full_name}</h1>
              <p className="text-sm text-charcoal-400 mt-1">נשמח לדעת אם תגיע/י</p>
            </div>

            {/* Main CTA buttons */}
            <div className="space-y-3 mb-6">
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
                {submitting && choice === 'CONFIRMED'
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <span className="text-xl">✅</span>
                }
                אני מגיע/ה
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => !submitting && handleSubmit('DECLINED')}
                disabled={submitting}
                className="w-full py-5 rounded-2xl text-white text-lg font-bold flex items-center justify-center gap-3 disabled:opacity-60 transition-all"
                style={{
                  background: submitting && choice === 'DECLINED' ? '#DC2626' : '#F87171',
                  boxShadow: '0 4px 20px rgba(248,113,113,0.3)',
                }}
              >
                {submitting && choice === 'DECLINED'
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <span className="text-xl">❌</span>
                }
                לא אוכל/י להגיע
              </motion.button>
            </div>

            {/* Optional fields */}
            <div className="bg-white rounded-2xl p-4 space-y-4"
              style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

              {/* Companions */}
              <div>
                <p className="text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-2">כמה אנשים מגיעים?</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setCompanions(c => Math.max(0, c-1))}
                    className="w-9 h-9 rounded-xl bg-charcoal-100 flex items-center justify-center text-lg font-bold text-charcoal-700 active:scale-90 transition-transform">
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-charcoal-900">{companions + 1}</span>
                    <span className="text-sm text-charcoal-400 mr-1"> אנשים</span>
                  </div>
                  <button onClick={() => setCompanions(c => c + 1)}
                    className="w-9 h-9 rounded-xl bg-charcoal-900 flex items-center justify-center text-lg font-bold text-white active:scale-90 transition-transform">
                    +
                  </button>
                </div>
                {companions > 0 && (
                  <p className="text-xs text-charcoal-400 text-center mt-1">
                    <Users className="inline w-3 h-3 ml-1" />
                    {companions} מלווים
                  </p>
                )}
              </div>

              {/* Note */}
              <div>
                <p className="text-xs font-bold text-charcoal-400 uppercase tracking-wide mb-2">הערות / רגישויות מזון</p>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="לדוגמה: צמחוני, ללא גלוטן..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-charcoal-50 text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 resize-none transition"
                />
              </div>
            </div>

            <p className="text-center text-xs text-charcoal-400 mt-5">
              ניתן לשנות את התשובה בכל עת דרך הקישור
            </p>
          </motion.div>
        )}

        {/* Success */}
        {step === 'success' && guest && (
          <motion.div key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center">
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
              <span className="text-4xl">{choice === 'CONFIRMED' ? '🎉' : '💙'}</span>
            </motion.div>

            <h2 className="text-2xl font-bold text-charcoal-900 mb-2">
              {choice === 'CONFIRMED' ? 'תודה, מחכים לך!' : 'תודה על ההודעה'}
            </h2>
            <p className="text-sm text-charcoal-400 leading-relaxed">
              {choice === 'CONFIRMED'
                ? `אישרת הגעה לאירוע עם ${companions} מלווים.\nנשמח לראותך!`
                : 'חבל שלא תוכל/י להגיע. מקווים לראותך בפעם הבאה!'}
            </p>

            <button onClick={() => setStep('form')}
              className="mt-8 text-sm text-gold-600 font-bold">
              שינוי תשובה
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
