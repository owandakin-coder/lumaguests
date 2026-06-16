import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { rsvpService, storageService } from '../services/supabase';
import { RsvpPublicGuest } from '../types';
import { getRsvpTheme } from '../utils/rsvpTheme';

interface RsvpPageProps {
  token: string;
  eventName?: string;
  eventDate?: string;
  venueName?: string;
  venueAddress?: string;
  coverImageUrl?: string;
}

type Step = 'loading' | 'form' | 'already' | 'success' | 'error';
type ErrorState = 'not_found' | 'guest_unavailable' | 'event_passed' | 'rsvp_closed' | 'general' | 'rate_limited';

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
  const [signedCoverUrl, setSignedCoverUrl] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const theme = getRsvpTheme(guest?.template_id);

  // Card style helper — adapts opacity, blur, radius to the layout variant
  const blurVal = theme.layout !== 'minimal' ? 'blur(12px)' : undefined;
  const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: theme.cardRadius,
    background: theme.cardBg,
    border: `1px solid ${theme.cardBorder}`,
    boxShadow: theme.cardShadow,
    backdropFilter: blurVal,
    WebkitBackdropFilter: blurVal,
    ...extra,
  });
  const innerStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: `calc(${theme.cardRadius} - 10px)`,
    background: theme.innerCardBg,
    ...extra,
  });
  const subBorderRadius = `calc(${theme.cardRadius} - 12px)`;

  useEffect(() => {
    void load();
  }, [token]);

  useEffect(() => {
    const raw = guest?.cover_image_url;
    if (!raw) { setSignedCoverUrl(null); return; }
    let cancelled = false;
    storageService.getSignedCoverUrl(raw)
      .then(url => { if (!cancelled) setSignedCoverUrl(url); })
      .catch(() => { if (!cancelled) setSignedCoverUrl(raw); });
    return () => { cancelled = true; };
  }, [guest?.cover_image_url]);

  const load = async () => {
    try {
      setStep('loading');
      const result = await rsvpService.getByToken(token);

      if (!result?.success || !result.guest) {
        if (result?.error === 'guest_unavailable') {
          setErrorState('guest_unavailable');
        } else if (result?.error === 'not_found') {
          setErrorState('not_found');
        } else {
          setErrorState('general');
        }
        setStep('error');
        return;
      }

      const data = result.guest;
      if (!data.id || !data.full_name) {
        setErrorState('not_found');
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
        if (response?.error === 'event_passed') {
          setErrorState('event_passed');
        } else if (response?.error === 'rsvp_closed' || response?.error === 'event_archived') {
          setErrorState('rsvp_closed');
        } else if (response?.error === 'rate_limited') {
          setErrorState('rate_limited');
        } else if (response?.error === 'not_found') {
          setErrorState('not_found');
        } else if (response?.error) {
          setErrorState('guest_unavailable');
        } else {
          setErrorState('general');
        }
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
    const coverImageUrl = signedCoverUrl ?? guest?.cover_image_url ?? propCoverImageUrl ?? '';

    const formattedDate = rawDate
      ? new Date(rawDate).toLocaleDateString('he-IL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : fallbackDate;

    const shortDate = rawDate
      ? new Date(rawDate).toLocaleDateString('he-IL', {
          weekday: 'short',
          day: 'numeric',
          month: 'numeric',
          year: '2-digit',
        })
      : fallbackDate;

    const venueCompact = venueName !== fallbackVenue
      ? `${venueName}${venueAddress ? `, ${venueAddress}` : ''}`
      : fallbackVenue;

    return {
      eventName,
      formattedDate,
      shortDate,
      venueName,
      venueAddress,
      venueCompact,
      coverImageUrl,
    };
  }, [guest, propCoverImageUrl, propEventDate, propEventName, propVenueAddress, propVenueName, signedCoverUrl]);

  const errorContent = {
    not_found: {
      title: 'הקישור לאישור ההגעה לא נמצא',
      description: 'בדוק שקיבלת את הקישור המלא ונסה לפתוח אותו שוב.',
    },
    guest_unavailable: {
      title: 'המוזמן אינו זמין יותר',
      description: 'ייתכן שהמוזמן הוסר או שהקישור כבר אינו פעיל.',
    },
    event_passed: {
      title: 'תקופת ההרשמה הסתיימה',
      description: 'תאריך האירוע עבר ולא ניתן עוד לעדכן את התשובה.',
    },
    rsvp_closed: {
      title: 'ההרשמה נסגרה',
      description: 'תאריך סיום ה-RSVP עבר. לשינוי פנה/י למארגנים ישירות.',
    },
    rate_limited: {
      title: 'ניסיונות רבים מדי',
      description: 'נסה/י שוב בעוד מספר דקות.',
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
        ? `אגיע עם ${companions} מלווים`
        : 'אגיע לאירוע';

  const hasCoverData = !!(guest?.cover_image_url || propCoverImageUrl);
  const heroHeightClass = hasCoverData ? 'h-[340px] sm:h-[380px]' : '';
  const heroOffsetClass = hasCoverData ? 'pt-[220px] sm:pt-[250px]' : 'pt-3';
  const heroImageSrc = signedCoverUrl || null;

  const Divider = ({ label }: { label: string }) => (
    <div className="flex items-center justify-center gap-3 text-[11px] font-semibold" style={{ color: theme.accentText }}>
      <span
        className="h-px max-w-[72px] flex-1"
        style={{ backgroundImage: `linear-gradient(to left, transparent, ${theme.accentVia}, transparent)` }}
      />
      <theme.Icon className="h-4 w-4" />
      <span>{label}</span>
      <theme.Icon className="h-4 w-4" />
      <span
        className="h-px max-w-[72px] flex-1"
        style={{ backgroundImage: `linear-gradient(to right, transparent, ${theme.accentVia}, transparent)` }}
      />
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen overflow-hidden" style={{ backgroundColor: theme.pageBg }}>
      <div className="relative min-h-screen">
        {hasCoverData ? (
          <div className={`absolute inset-x-0 top-0 overflow-hidden ${heroHeightClass}`}>
            <div className="absolute inset-0 bg-gradient-to-b from-[#D4B97A]/40 to-[#C09A50]/20" />
            {heroImageSrc && (
              <img
                src={heroImageSrc}
                alt={eventInfo.eventName}
                fetchPriority="high"
                loading="eager"
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                style={{ objectPosition: 'center 30%' }}
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, rgba(36,27,17,0.02) 0%, rgba(36,27,17,0.10) 34%, rgba(36,27,17,0.34) 62%, ${theme.pageBg}F2 100%)`,
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-16" style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${theme.pageBg})` }} />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background: hasCoverData
                ? `linear-gradient(180deg, ${theme.pageBg}2E 0%, ${theme.pageBg}D7 34%, ${theme.pageBg} 64%, ${theme.pageBg} 100%)`
                : `linear-gradient(180deg, ${theme.pageBg}CC 0%, ${theme.pageBg} 56%, ${theme.pageBg} 100%)`,
            }}
          />
          <div
            className="absolute right-[-12%] top-[210px] h-56 w-56 rounded-full blur-3xl"
            style={{ backgroundColor: theme.glowHex + '4D' }}
          />
          <div
            className="absolute left-[-14%] top-[420px] h-64 w-64 rounded-full blur-3xl"
            style={{ backgroundColor: theme.glowHex + '40' }}
          />
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
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.accentIcon }} />
                <p className="text-sm" style={{ color: theme.textMuted }}>טוען...</p>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-auto w-full px-6 py-8 text-center"
                style={cardStyle()}
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100">
                  <XCircle className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="mb-2 text-xl font-bold" style={{ color: theme.textPrimary }}>
                  {errorContent[errorState].title}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                  {errorContent[errorState].description}
                </p>
                <button
                  onClick={() => void load()}
                  className="mt-5 flex w-full items-center justify-center gap-2 py-3 text-sm font-bold text-white"
                  style={{ background: theme.accentHex, borderRadius: theme.buttonRadius }}
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
                <div
                  className="mx-auto mb-5 flex h-[76px] w-[76px] items-center justify-center"
                  style={{
                    ...cardStyle(),
                    borderRadius: '28px',
                    boxShadow: `0 14px 40px ${theme.accentShadow}`,
                  }}
                >
                  <CheckCircle className="h-9 w-9" style={{ color: theme.accentIcon }} />
                </div>

                <div className="px-5 pb-6 pt-5" style={cardStyle()}>
                  <div className="mb-4">
                    <Divider label="התגובה שלך נשמרה" />
                  </div>

                  <h2 className="text-[34px] font-black font-serif tracking-tight" style={{ color: theme.textPrimary }}>
                    {guest.full_name}
                  </h2>
                  <p className="mt-2 text-[15px]" style={{ color: theme.textMuted }}>
                    {guest.rsvp_status === 'CONFIRMED'
                      ? 'האישור כבר התקבל ואנחנו מחכים לך'
                      : 'קיבלנו את ההודעה שלא תגיע/י'}
                  </p>

                  <div className="mt-4 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" style={innerStyle()}>
                    <p className="text-[12px] font-semibold" style={{ color: theme.accentText }}>{eventInfo.eventName}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[12px]" style={{ color: theme.textMuted }}>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" style={{ color: theme.accentIcon }} />
                        {eventInfo.shortDate}
                      </span>
                      <span className="opacity-40">·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" style={{ color: theme.accentIcon }} />
                        {eventInfo.venueCompact}
                      </span>
                    </div>

                    <div className="mt-3 border bg-white/90 px-4 py-2.5" style={{ borderColor: theme.accentBorder, borderRadius: subBorderRadius }}>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-charcoal-400">הסטטוס שלך</p>
                      <p className="mt-1 text-[20px] font-black text-charcoal-900">
                        {guest.rsvp_status === 'CONFIRMED' ? 'אישרתי הגעה' : 'לא אגיע/ה'}
                      </p>
                      <p className="mt-1 text-[13px] text-charcoal-500">
                        {guest.companions > 0 ? `${guest.companions + 1} אורחים בסך הכל` : 'רק אני'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep('form')}
                  className="mt-5 text-sm font-bold underline underline-offset-4"
                  style={{ color: theme.accentText }}
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
                className={hasCoverData ? 'w-full' : 'my-auto w-full'}
              >
                <div className={heroOffsetClass}>
                  <div className="px-4 py-4 text-center" style={cardStyle()}>
                    <div className="mb-2">
                      <Divider label={theme.headerLabel} />
                    </div>

                    <p className="text-[24px] font-black leading-tight tracking-tight sm:text-[27px]" style={{ color: theme.textPrimary }}>
                      {eventInfo.eventName}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[12px]" style={{ color: theme.textMuted }}>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" style={{ color: theme.accentIcon }} />
                        {eventInfo.shortDate}
                      </span>
                      <span className="opacity-40">·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" style={{ color: theme.accentIcon }} />
                        {eventInfo.venueCompact}
                      </span>
                    </div>
                  </div>

                  <div className="px-2 py-6 text-center">
                    <div className="mb-2 flex items-center justify-center gap-3" style={{ color: theme.accentText }}>
                      <span
                        className="h-px w-16"
                        style={{ backgroundImage: `linear-gradient(to left, transparent, ${theme.accentVia}, transparent)` }}
                      />
                      <Sparkles className="h-4 w-4" />
                      <span
                        className="h-px w-16"
                        style={{ backgroundImage: `linear-gradient(to right, transparent, ${theme.accentVia}, transparent)` }}
                      />
                    </div>
                    <h1 className="text-[40px] font-black font-serif leading-none tracking-tight sm:text-[44px]" style={{ color: theme.textPrimary }}>
                      {guest.full_name}
                    </h1>
                    <p className="mt-2 text-[16px]" style={{ color: theme.textSecondary }}>נשמח לדעת אם תגיע/י</p>
                  </div>

                  <div className="space-y-4">
                    <div className="px-4 py-4" style={cardStyle()}>
                      <p className="text-center text-[15px] font-bold" style={{ color: theme.textSecondary }}>כמה אנשים תגיעו?</p>
                      <div className="mt-4 flex items-center justify-center gap-5" dir="ltr">
                        <button
                          onClick={() => setCompanions((c) => Math.max(0, c - 1))}
                          className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform active:scale-90"
                          style={{ backgroundColor: theme.accentHex, boxShadow: `0 8px 18px ${theme.accentShadow}` }}
                        >
                          <Minus className="h-5 w-5" />
                        </button>

                        <div className="min-w-[84px] text-center">
                          <p className="text-[32px] font-black leading-[0.95] tracking-tight" style={{ color: theme.textPrimary }}>
                            {companions + 1}
                          </p>
                          <p className="mt-1 text-[14px]" style={{ color: theme.textMuted }}>
                            {companions + 1 === 1 ? 'רק אני' : `${companions + 1} אנשים`}
                          </p>
                        </div>

                        <button
                          onClick={() => setCompanions((c) => Math.min(20, c + 1))}
                          className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform active:scale-90"
                          style={{ backgroundColor: theme.accentHex, boxShadow: `0 8px 18px ${theme.accentShadow}` }}
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
                        className="flex w-full items-center justify-center gap-3 px-5 py-4 text-[17px] font-black text-white disabled:opacity-60"
                        style={{
                          background: 'linear-gradient(135deg, #148F4A 0%, #26B86B 100%)',
                          boxShadow: '0 14px 28px rgba(20,143,74,0.22)',
                          borderRadius: theme.buttonRadius,
                        }}
                      >
                        אגיע לאירוע
                        {submitting && choice === 'CONFIRMED' ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.985 }}
                        onClick={() => !submitting && handleSubmit('DECLINED')}
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-3 border bg-white/92 px-5 py-4 text-[17px] font-black text-charcoal-800 shadow-[0_6px_22px_rgba(130,104,48,0.08)] disabled:opacity-60"
                        style={{ borderColor: theme.accentBorder, borderRadius: theme.buttonRadius }}
                      >
                        לא אגיע לאירוע
                        {submitting && choice === 'DECLINED' ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <span className="text-[20px]">😔</span>
                        )}
                      </motion.button>
                    </div>

                    {!showNotes ? (
                      <button
                        onClick={() => setShowNotes(true)}
                        className="flex w-full items-center justify-center gap-2 border py-3 text-[14px]"
                        style={{
                          color: theme.textMuted,
                          borderColor: theme.accentBorder + '80',
                          background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.60)',
                          borderRadius: theme.buttonRadius,
                        }}
                      >
                        <UtensilsCrossed className="h-4 w-4" style={{ color: theme.accentIcon }} />
                        יש לך רגישויות מזון? הוסף הערה
                      </button>
                    ) : (
                      <AnimatePresence initial={false}>
                        <motion.div
                          key="notes"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="px-4 py-4" style={cardStyle()}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-[15px] font-bold" style={{ color: theme.textSecondary }}>הערות / רגישויות מזון</p>
                              <UtensilsCrossed className="h-5 w-5" style={{ color: theme.accentIcon }} />
                            </div>
                            <textarea
                              autoFocus
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              placeholder="לדוגמה: צמחוני, ללא גלוטן..."
                              maxLength={500}
                              rows={2}
                              className="w-full resize-none px-4 py-3.5 text-[14px] placeholder:opacity-50 focus:outline-none focus:ring-2 transition"
                              style={{
                                borderRadius: subBorderRadius,
                                background: theme.innerCardBg,
                                color: theme.textPrimary,
                                '--tw-ring-color': theme.accentBorder,
                              } as React.CSSProperties}
                            />
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}

                    <div className="px-4 pt-1 text-center">
                      <p className="text-[15px] font-medium" style={{ color: theme.textMuted }}>{theme.footerText}</p>
                      <theme.Icon className="mx-auto mt-2 h-5 w-5" style={{ color: theme.accentIcon }} />
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
                  className="mx-auto mb-5 text-center"
                >
                  <span className="text-5xl">{choice === 'CONFIRMED' ? '🎉' : '💛'}</span>
                </motion.div>

                <div className="px-5 pb-6 pt-5" style={cardStyle()}>
                  <h2 className="mb-2 text-2xl font-bold" style={{ color: theme.textPrimary }}>
                    {choice === 'CONFIRMED' ? 'תודה, מחכים לך!' : 'תודה על ההודעה'}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                    {choice === 'CONFIRMED'
                      ? companions > 0
                        ? `אישרת הגעה לאירוע עם ${companions} מלווים. נשמח לראותך!`
                        : 'אישרת הגעה לאירוע. נשמח לראותך!'
                      : 'חבל שלא תגיע/י. מקווים לראותך בפעם הבאה!'}
                  </p>

                  <div className="mt-4 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" style={innerStyle()}>
                    <p className="text-[12px] font-semibold" style={{ color: theme.accentText }}>{eventInfo.eventName}</p>
                    <p className="mt-2 flex items-center justify-center gap-2 text-[14px]" style={{ color: theme.textSecondary }}>
                      <CalendarDays className="h-4 w-4" style={{ color: theme.accentIcon }} />
                      {eventInfo.formattedDate}
                    </p>
                    <p className="mt-2 flex items-center justify-center gap-2 text-[14px]" style={{ color: theme.textSecondary }}>
                      <MapPin className="h-4 w-4" style={{ color: theme.accentIcon }} />
                      {eventInfo.venueName}
                    </p>

                    <div className="mt-4 border bg-white/90 px-4 py-3" style={{ borderColor: theme.accentBorder, borderRadius: subBorderRadius }}>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-charcoal-400">התגובה שנשלחה</p>
                      <p className="mt-1 text-[18px] font-black text-charcoal-900">{responseLabel}</p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col items-center gap-3">
                    <button
                      onClick={() => setStep('form')}
                      className="text-sm font-bold"
                      style={{ color: theme.accentText }}
                    >
                      שינוי תשובה
                    </button>
                    <p className="text-xs" style={{ color: theme.textMuted }}>ניתן לסגור חלון זה</p>
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
