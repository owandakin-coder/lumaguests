import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle,
  Heart,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { rsvpService } from '../services/supabase';
import { RsvpPublicGuest } from '../types';

interface RsvpPageProps {
  token: string;
  eventName?: string;
  eventDate?: string;
  venueName?: string;
  venueAddress?: string;
  coverImageUrl?: string;
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
  coverImageUrl: propCoverImageUrl,
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
    const coverImageUrl = guest?.cover_image_url || propCoverImageUrl || '';

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
      coverImageUrl,
    };
  }, [guest, propCoverImageUrl, propEventDate, propEventName, propVenueAddress, propVenueName]);

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

  const responseLabel =
    choice === 'DECLINED'
      ? 'לא אגיע/ה'
      : companions > 0
        ? `אני מגיע/ה עם ${companions} מלווים`
        : 'אני מגיע/ה';

  const hasHeroImage = !!eventInfo.coverImageUrl;
  const heroHeightClass = hasHeroImage ? 'h-[260px] sm:h-[300px]' : '';
  const heroOffsetClass = hasHeroImage ? 'pt-[144px] sm:pt-[166px]' : 'pt-3';

  return (
    <div dir="rtl" className="min-h-screen overflow-hidden bg-[#F7F2E8]">
      <div className="relative min-h-screen">
        {hasHeroImage ? (
          <div className={`absolute inset-x-0 top-0 overflow-hidden ${heroHeightClass}`}>
            <img
              src={eventInfo.coverImageUrl}
              alt={eventInfo.eventName}
              className="h-full w-full object-cover"
              style={{ objectPosition: 'center 34%' }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(36,27,17,0.06) 0%, rgba(36,27,17,0.18) 36%, rgba(36,27,17,0.44) 62%, rgba(247,242,232,0.97) 100%)',
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent via-[#F7F2E8]/35 to-[#F7F2E8]" />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background: hasHeroImage
                ? 'linear-gradient(180deg, rgba(251,248,241,0.18) 0%, rgba(248,244,236,0.84) 34%, #F7F2E8 64%, #F7F2E8 100%)'
                : 'linear-gradient(180deg, #FCFAF4 0%, #F7F2E8 56%, #F4EEE2 100%)',
            }}
          />
          <div className="absolute right-[-12%] top-[210px] h-56 w-56 rounded-full bg-[#F3DFA9]/30 blur-3xl" />
          <div className="absolute left-[-14%] top-[420px] h-64 w-64 rounded-full bg-white/65 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[460px] flex-col px-4 pb-8 pt-6">
          <AnimatePresence mode="wait">
            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-screen flex-col items-center justify-center gap-4"
              >
                <Loader2 className="h-8 w-8 animate-spin text-charcoal-400" />
                <p className="text-sm text-charcoal-400">טוען...</p>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-auto w-full rounded-[34px] border border-white/70 bg-white/84 px-6 py-8 text-center shadow-[0_20px_60px_rgba(102,84,50,0.12)] backdrop-blur-xl"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100">
                  <XCircle className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-charcoal-900">{errorContent[errorState].title}</h2>
                <p className="text-sm leading-relaxed text-charcoal-400">{errorContent[errorState].description}</p>
                <button
                  onClick={() => void load()}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-charcoal-900 py-3 text-sm font-bold text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  נסה שוב
                </button>
              </motion.div>
            )}

            {step === 'already' && guest && (
              <motion.div
                key="already"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-auto w-full text-center"
              >
                <div className="mx-auto mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-[28px] bg-white/86 shadow-[0_14px_40px_rgba(184,145,62,0.18)] backdrop-blur-xl">
                  <CheckCircle className="h-9 w-9 text-gold-600" />
                </div>

                <div className="rounded-[34px] border border-white/70 bg-white/86 px-5 pb-6 pt-5 shadow-[0_24px_60px_rgba(102,84,50,0.14)] backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-center gap-3 text-[12px] font-semibold text-gold-700">
                    <span className="h-px max-w-[72px] flex-1 bg-gradient-to-l from-transparent via-[#D9BC77] to-transparent" />
                    <Heart className="h-4 w-4" />
                    <span>התגובה שלך נשמרה</span>
                    <Heart className="h-4 w-4" />
                    <span className="h-px max-w-[72px] flex-1 bg-gradient-to-r from-transparent via-[#D9BC77] to-transparent" />
                  </div>

                  <h2 className="text-[34px] font-black tracking-tight text-charcoal-900">{guest.full_name}</h2>
                  <p className="mt-2 text-[15px] text-charcoal-500">
                    {guest.rsvp_status === 'CONFIRMED' ? 'האישור כבר התקבל ואנחנו מחכים לך' : 'קיבלנו את ההודעה שלא תגיע/י'}
                  </p>

                  <div className="mt-5 rounded-[28px] bg-[#FFFDF8] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <p className="text-[12px] font-semibold text-gold-700">{eventInfo.eventName}</p>
                    <div className="mt-3 space-y-2 text-[14px] text-charcoal-600">
                      <p className="flex items-center justify-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gold-600" />
                        {eventInfo.formattedDate}
                      </p>
                      <p className="flex items-center justify-center gap-2">
                        <MapPin className="h-4 w-4 text-gold-600" />
                        {eventInfo.venueName}
                      </p>
                      {eventInfo.venueAddress ? (
                        <p className="text-[12px] text-charcoal-400">{eventInfo.venueAddress}</p>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-[22px] border border-[#F2E5BF] bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-charcoal-400">הסטטוס שלך</p>
                      <p className="mt-1 text-[20px] font-black text-charcoal-900">
                        {guest.rsvp_status === 'CONFIRMED' ? 'אישרתי הגעה' : 'לא אגיע/ה'}
                      </p>
                      <p className="mt-1 text-[13px] text-charcoal-500">
                        {guest.companions > 0 ? `${guest.companions + 1} אורחים בסך הכול` : 'רק אני'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep('form')}
                  className="mt-5 text-sm font-bold text-gold-700 underline underline-offset-4"
                >
                  שינוי תשובה
                </button>
              </motion.div>
            )}

            {step === 'form' && guest && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <div className={heroOffsetClass}>
                  <div className="rounded-[30px] border border-white/75 bg-white/82 px-4 py-4 text-center shadow-[0_22px_60px_rgba(89,69,35,0.14)] backdrop-blur-xl">
                    <div className="mb-2 flex items-center justify-center gap-3 text-[11px] font-semibold text-gold-700">
                      <span className="h-px max-w-[72px] flex-1 bg-gradient-to-l from-transparent via-[#D9BC77] to-transparent" />
                      <Heart className="h-4 w-4" />
                      <span>הזמנה אישית</span>
                      <Heart className="h-4 w-4" />
                      <span className="h-px max-w-[72px] flex-1 bg-gradient-to-r from-transparent via-[#D9BC77] to-transparent" />
                    </div>

                    <p className="text-[24px] font-black leading-tight tracking-tight text-charcoal-900 sm:text-[27px]">
                      {eventInfo.eventName}
                    </p>

                    <div className="mt-3 space-y-1.5 text-[14px] text-charcoal-600">
                      <p className="flex items-center justify-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gold-600" />
                        {eventInfo.formattedDate}
                      </p>
                      <p className="flex items-center justify-center gap-2">
                        <MapPin className="h-4 w-4 text-gold-600" />
                        {eventInfo.venueName}
                      </p>
                      {eventInfo.venueAddress ? (
                        <p className="text-[12px] text-charcoal-400">{eventInfo.venueAddress}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-2 py-6 text-center">
                    <div className="mb-2 flex items-center justify-center gap-3 text-[#C5A45B]">
                      <span className="h-px w-16 bg-gradient-to-l from-transparent via-[#E1C987] to-transparent" />
                      <Sparkles className="h-4 w-4" />
                      <span className="h-px w-16 bg-gradient-to-r from-transparent via-[#E1C987] to-transparent" />
                    </div>
                    <h1 className="text-[40px] font-black leading-none tracking-tight text-charcoal-900 sm:text-[44px]">
                      {guest.full_name}
                    </h1>
                    <p className="mt-2 text-[16px] text-charcoal-600">נשמח לדעת אם תגיע/י</p>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_16px_40px_rgba(89,69,35,0.10)] backdrop-blur-xl">
                      <p className="text-center text-[15px] font-bold text-charcoal-700">כמה אנשים מגיעים?</p>
                      <div className="mt-4 flex items-center justify-center gap-5">
                        <button
                          onClick={() => setCompanions((current) => Math.max(0, current - 1))}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D2AB54] text-white shadow-[0_8px_18px_rgba(210,171,84,0.24)] transition-transform active:scale-90"
                        >
                          <Minus className="h-5 w-5" />
                        </button>

                        <div className="min-w-[84px] text-center">
                          <p className="text-[56px] font-black leading-[0.9] tracking-tight text-charcoal-900">
                            {companions + 1}
                          </p>
                          <p className="mt-1 text-[14px] text-charcoal-500">
                            {companions + 1 === 1 ? 'רק אני' : `${companions + 1} אנשים`}
                          </p>
                        </div>

                        <button
                          onClick={() => setCompanions((current) => current + 1)}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D2AB54] text-white shadow-[0_8px_18px_rgba(210,171,84,0.24)] transition-transform active:scale-90"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <motion.button
                        whileTap={{ scale: 0.985 }}
                        onClick={() => !submitting && handleSubmit('CONFIRMED')}
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-3 rounded-[24px] px-5 py-4 text-[17px] font-black text-white disabled:opacity-60"
                        style={{
                          background: 'linear-gradient(135deg, #148F4A 0%, #26B86B 100%)',
                          boxShadow: '0 14px 28px rgba(20,143,74,0.22)',
                        }}
                      >
                        {submitting && choice === 'CONFIRMED' ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                        אני מגיע/ה
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.985 }}
                        onClick={() => !submitting && handleSubmit('DECLINED')}
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-3 rounded-[24px] border border-[#D5B671] bg-white/92 px-5 py-4 text-[17px] font-black text-charcoal-800 shadow-[0_6px_22px_rgba(130,104,48,0.08)] disabled:opacity-60"
                      >
                        {submitting && choice === 'DECLINED' ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <span className="text-[20px]">😔</span>
                        )}
                        לא מגיע/ה
                      </motion.button>
                    </div>

                    <div className="rounded-[28px] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_16px_40px_rgba(89,69,35,0.10)] backdrop-blur-xl">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[15px] font-bold text-charcoal-700">הערות / רגישויות מזון</p>
                        <UtensilsCrossed className="h-5 w-5 text-[#C49A40]" />
                      </div>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="לדוגמה: צמחוני, ללא גלוטן..."
                        rows={2}
                        className="w-full resize-none rounded-[20px] bg-[#FBF8F2] px-4 py-3.5 text-[14px] text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#E5D3A1] transition"
                      />
                    </div>

                    <div className="px-4 pt-1 text-center">
                      <p className="text-[15px] font-medium text-charcoal-500">מחכים לכם באהבה</p>
                      <Heart className="mx-auto mt-2 h-5 w-5 text-[#C49A40]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'success' && guest && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-auto w-full text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px]"
                  style={{
                    background: choice === 'CONFIRMED' ? 'rgba(236,253,245,0.92)' : 'rgba(255,241,242,0.92)',
                    boxShadow: choice === 'CONFIRMED'
                      ? '0 8px 24px rgba(16,185,129,0.25)'
                      : '0 8px 24px rgba(248,113,113,0.2)',
                  }}
                >
                  <span className="text-4xl">{choice === 'CONFIRMED' ? '🎉' : '💔'}</span>
                </motion.div>

                <div className="rounded-[34px] border border-white/70 bg-white/86 px-5 pb-6 pt-5 shadow-[0_24px_60px_rgba(102,84,50,0.14)] backdrop-blur-xl">
                  <h2 className="mb-2 text-2xl font-bold text-charcoal-900">
                    {choice === 'CONFIRMED' ? 'תודה, מחכים לך!' : 'תודה על ההודעה'}
                  </h2>
                  <p className="text-sm leading-relaxed text-charcoal-400">
                    {choice === 'CONFIRMED'
                      ? companions > 0
                        ? `אישרת הגעה לאירוע עם ${companions} מלווים. נשמח לראותך!`
                        : 'אישרת הגעה לאירוע. נשמח לראותך!'
                      : 'חבל שלא תגיע/י. מקווים לראותך בפעם הבאה!'}
                  </p>

                  <div className="mt-4 rounded-[28px] bg-[#FFFDF8] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <p className="text-[12px] font-semibold text-gold-700">{eventInfo.eventName}</p>
                    <p className="mt-2 flex items-center justify-center gap-2 text-[14px] text-charcoal-600">
                      <CalendarDays className="h-4 w-4 text-gold-600" />
                      {eventInfo.formattedDate}
                    </p>
                    <p className="mt-2 flex items-center justify-center gap-2 text-[14px] text-charcoal-600">
                      <MapPin className="h-4 w-4 text-gold-600" />
                      {eventInfo.venueName}
                    </p>

                    <div className="mt-4 rounded-[22px] border border-[#F2E5BF] bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-charcoal-400">התגובה שנשלחה</p>
                      <p className="mt-1 text-[18px] font-black text-charcoal-900">{responseLabel}</p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col items-center gap-3">
                    <button onClick={() => setStep('form')} className="text-sm font-bold text-gold-700">
                      שינוי תשובה
                    </button>
                    <p className="text-xs text-charcoal-400">ניתן לסגור חלון זה</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
