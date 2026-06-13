import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Copy,
  Eye,
  ImagePlus,
  MapPin,
  RefreshCw,
  Save,
  Send,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { Event } from '../types';
import { eventService, openWhatsAppUrl, storageService } from '../services/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { ImageCropModal } from '../components/ImageCropModal';

interface EventManagerProps {
  event?: Event | null;
  archivedEvents?: Event[];
  onBack: () => void;
  onEventUpdate?: (updates: Partial<Event>) => Promise<Event | undefined>;
  onCreateEvent?: (name?: string) => Promise<Event>;
  onActivateEvent?: (eventId: string) => Promise<Event>;
  onArchiveEvent?: (eventId: string) => Promise<Event>;
}

type BusyAction = 'save' | 'create' | 'activate' | 'archive' | 'cover' | null;
type ConfirmAction = 'create' | 'archive' | null;

const surface = 'rounded-[28px] bg-white shadow-[0_10px_28px_rgba(34,29,21,0.07)]';
const sectionLabel = 'text-[11px] font-bold tracking-[0.22em] text-[#B49B62] uppercase';
const inputClass =
  'w-full rounded-[22px] border border-[#EFE8D8] bg-[#FAF7EF] px-4 py-3.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#D8C088]';

function formatDisplayDate(date?: string | null) {
  if (!date) return 'טרם נקבע';
  return new Date(date).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const EventManager = ({
  event,
  archivedEvents = [],
  onBack,
  onEventUpdate,
  onCreateEvent,
  onActivateEvent,
  onArchiveEvent,
}: EventManagerProps) => {
  const auth = useSupabaseAuth();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [signedCoverUrl, setSignedCoverUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    eventName: '',
    eventDate: '',
    venueName: '',
    venueAddress: '',
    description: '',
    publicSlug: '',
    publicEnabled: false,
  });

  useEffect(() => {
    const raw = event?.cover_image_url;
    if (!raw) { setSignedCoverUrl(null); return; }
    let cancelled = false;
    storageService.getSignedCoverUrl(raw)
      .then(url => { if (!cancelled) setSignedCoverUrl(url); })
      .catch(() => { if (!cancelled) setSignedCoverUrl(raw); });
    return () => { cancelled = true; };
  }, [event?.cover_image_url]);

  useEffect(() => {
    setForm({
      eventName: event?.event_name || '',
      eventDate: event?.event_date ? event.event_date.split('T')[0] : '',
      venueName: event?.venue_name || '',
      venueAddress: event?.venue_address || '',
      description: event?.description || '',
      publicSlug: event?.public_slug || '',
      publicEnabled: !!event?.is_public,
    });
    setMessage(null);
    setCroppedBlob(null);
    setCroppedPreview(null);
    setRawImageUrl(null);
    setShowCropper(false);
  }, [
    event?.id,
    event?.event_name,
    event?.event_date,
    event?.venue_name,
    event?.venue_address,
    event?.description,
    event?.public_slug,
    event?.is_public,
  ]);

  const normalizedSlug = useMemo(
    () => form.publicSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    [form.publicSlug]
  );

  const publicUrl = useMemo(() => {
    if (!form.publicEnabled || !normalizedSlug) return null;
    return eventService.buildPublicUrl(normalizedSlug);
  }, [form.publicEnabled, normalizedSlug]);

  const selectedDateLabel = useMemo(() => formatDisplayDate(form.eventDate || null), [form.eventDate]);
  const slugChanged = !!event?.public_slug && normalizedSlug !== '' && normalizedSlug !== event.public_slug;

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const resetCoverState = () => {
    setRawImageUrl(null);
    setCroppedBlob(null);
    setCroppedPreview(null);
    setShowCropper(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'ניתן להעלות רק תמונה תקינה מסוג JPG, PNG או WEBP.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImageUrl(ev.target?.result as string);
      setShowCropper(true);
      setMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCropDone = (blob: Blob) => {
    setCroppedBlob(blob);
    setCroppedPreview(URL.createObjectURL(blob));
    setShowCropper(false);
    setMessage({ type: 'success', text: 'התמונה נחתכה ומוכנה לשמירה.' });
  };

  const uploadCover = async () => {
    if (!croppedBlob || !event?.id || !auth.user || !onEventUpdate) return;
    try {
      setBusyAction('cover');
      const file = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
      const url = await storageService.uploadEventCover(auth.user.id, event.id, file);
      await onEventUpdate({ cover_image_url: url });
      resetCoverState();
      setMessage({ type: 'success', text: 'תמונת האירוע נשמרה.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'לא הצלחנו לשמור את תמונת האירוע.' });
    } finally {
      setBusyAction(null);
    }
  };

  const removeCover = async () => {
    if (!event?.id || !auth.user || !onEventUpdate) return;
    try {
      setBusyAction('cover');
      await storageService.removeEventCover(auth.user.id, event.id);
      await onEventUpdate({ cover_image_url: null });
      resetCoverState();
      setMessage({ type: 'success', text: 'תמונת האירוע הוסרה.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'לא הצלחנו להסיר את תמונת האירוע.' });
    } finally {
      setBusyAction(null);
    }
  };

  const saveEvent = async () => {
    if (!onEventUpdate) return;

    if (form.publicEnabled && !form.eventDate) {
      setMessage({ type: 'error', text: 'לפני שמפעילים RSVP ציבורי צריך להגדיר תאריך אירוע.' });
      return;
    }

    if (form.publicEnabled && !normalizedSlug) {
      setMessage({ type: 'error', text: 'יש להגדיר קישור אירוע תקין לפני הפעלת RSVP ציבורי.' });
      return;
    }

    try {
      setBusyAction('save');
      await onEventUpdate({
        event_name: form.eventName.trim() || 'האירוע שלי',
        event_date: form.eventDate || null,
        venue_name: form.venueName.trim() || null,
        venue_address: form.venueAddress.trim() || null,
        description: form.description.trim() || null,
        public_slug: normalizedSlug || null,
        is_public: form.publicEnabled,
      });
      setMessage({ type: 'success', text: 'פרטי האירוע נשמרו.' });
    } catch (error: any) {
      const duplicate = error?.code === '23505' || String(error?.message || '').toLowerCase().includes('duplicate');
      setMessage({
        type: 'error',
        text: duplicate ? 'הקישור הזה כבר תפוס. בחר קישור אחר.' : (error?.message || 'לא הצלחנו לשמור את פרטי האירוע.'),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const createEvent = async () => {
    if (!onCreateEvent) return;
    try {
      setBusyAction('create');
      await onCreateEvent();
      setMessage({ type: 'success', text: 'אירוע חדש נוצר. עכשיו אפשר להגדיר אותו כאן.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'לא הצלחנו ליצור אירוע חדש.' });
    } finally {
      setBusyAction(null);
    }
  };

  const confirmCreateEvent = async () => {
    setConfirmAction(null);
    await createEvent();
  };

  const activateEvent = async (eventId: string) => {
    if (!onActivateEvent) return;
    try {
      setBusyAction('activate');
      await onActivateEvent(eventId);
      setMessage({ type: 'success', text: 'עברנו לאירוע שבחרת.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'לא הצלחנו לעבור לאירוע הזה.' });
    } finally {
      setBusyAction(null);
    }
  };

  const archiveEvent = async () => {
    if (!event?.id || !onArchiveEvent) return;
    try {
      setBusyAction('archive');
      await onArchiveEvent(event.id);
      setMessage({ type: 'success', text: 'האירוע הועבר לארכיון.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'לא הצלחנו להעביר את האירוע לארכיון.' });
    } finally {
      setBusyAction(null);
    }
  };

  const confirmArchiveEvent = async () => {
    setConfirmAction(null);
    await archiveEvent();
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setMessage({ type: 'success', text: 'קישור ה-RSVP הועתק.' });
  };

  const shareLink = () => {
    if (!publicUrl) return;
    const text = `הוזמנת ל${form.eventName || 'האירוע שלנו'}\nלאישור הגעה:\n${publicUrl}`;
    openWhatsAppUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const openPreview = () => {
    if (!publicUrl) return;
    window.open(publicUrl, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-1 pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center active:scale-90 transition-transform"
          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}
        >
          <ChevronRight className="w-5 h-5 text-charcoal-600" />
        </button>
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-gold-600 uppercase">Event Studio</p>
          <h1 className="text-[28px] font-bold text-charcoal-900">ניהול אירוע</h1>
          <p className="text-[12px] text-charcoal-400 mt-0.5">פרטי אירוע, תמונה, RSVP ושיתוף במסך אחד נקי</p>
        </div>
      </div>

      <div
        className="rounded-[32px] overflow-hidden text-white"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(228,202,134,0.22), transparent 34%), linear-gradient(145deg, #171612 0%, #26231D 100%)',
          boxShadow: '0 18px 48px rgba(27,22,15,0.18)',
        }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-white/45 uppercase">האירוע הפעיל</p>
              <h2 className="text-[30px] font-black leading-tight mt-2">{form.eventName || 'האירוע שלי'}</h2>
            </div>
            <button
              onClick={() => setConfirmAction('create')}
              disabled={busyAction === 'create'}
              className="rounded-2xl bg-white/10 px-4 py-2.5 text-[13px] font-bold text-white backdrop-blur active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {busyAction === 'create' ? 'יוצר...' : 'צור אירוע'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-5">
            <div className="rounded-2xl bg-white/8 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 text-white/70 text-[12px] font-semibold">
                <CalendarDays className="w-4 h-4" />
                <span>{selectedDateLabel}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/8 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 text-white/70 text-[12px] font-semibold">
                <MapPin className="w-4 h-4" />
                <span>{form.venueName || 'מקום האירוע טרם הוגדר'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5">
            <div className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-white/85">
              RSVP {form.publicEnabled ? 'פעיל' : 'כבוי'}
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-white/85">
              {publicUrl ? 'קישור מוכן לשיתוף' : 'טרם הוגדר קישור'}
            </div>
          </div>
        </div>
      </div>

      <div className={surface}>
        <div className="p-4">
          <p className={sectionLabel}>פרטי האירוע</p>
          <div className="space-y-3 mt-4">
            <input
              value={form.eventName}
              onChange={(e) => setField('eventName', e.target.value)}
              placeholder="שם האירוע"
              className={inputClass}
            />

            <div className="rounded-[24px] border border-[#EFE8D8] bg-[#FAF7EF] p-3.5">
              <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-[0.18em] mb-2">תאריך האירוע</p>
              <input
                type="date"
                lang="en-CA"
                dir="ltr"
                value={form.eventDate}
                onChange={(e) => setField('eventDate', e.target.value)}
                className="w-full bg-transparent text-[15px] text-charcoal-900 focus:outline-none text-left"
              />
              <p className="text-[12px] text-charcoal-400 mt-2">{selectedDateLabel}</p>
            </div>

            <input
              value={form.venueName}
              onChange={(e) => setField('venueName', e.target.value)}
              placeholder="מקום האירוע"
              className={inputClass}
            />
            <input
              value={form.venueAddress}
              onChange={(e) => setField('venueAddress', e.target.value)}
              placeholder="כתובת"
              className={inputClass}
            />
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="תיאור קצר לאורחים"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </div>

      <div className={surface}>
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={sectionLabel}>תמונת אירוע</p>
              <p className="text-[12px] text-charcoal-400 mt-1">זו התמונה שתופיע בדף האישור ובתצוגות המקדימות.</p>
            </div>
          </div>

          <div className="mt-4">
            {(croppedPreview || signedCoverUrl || event?.cover_image_url) ? (
              <div className="rounded-[24px] overflow-hidden bg-charcoal-100" style={{ aspectRatio: '16 / 9' }}>
                <img
                  src={croppedPreview || signedCoverUrl || event?.cover_image_url || ''}
                  alt={form.eventName || 'תמונת האירוע'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#E5D9BE] bg-[#FCF9F0] px-4 py-10 text-center">
                <ImagePlus className="w-6 h-6 text-gold-600 mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-charcoal-700">עדיין לא הוגדרה תמונת אירוע</p>
                <p className="text-[12px] text-charcoal-400 mt-1">מומלץ להוסיף תמונה רחבה ונקייה של האירוע</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 mt-3">
            <label className="flex items-center justify-center gap-2 w-full py-3.5 rounded-[22px] border border-[#E9DEC5] bg-[#FAF7EF] cursor-pointer active:scale-[0.98] transition-transform">
              <ImagePlus className="w-4 h-4 text-charcoal-500" />
              <span className="text-[13px] font-bold text-charcoal-700">{croppedBlob ? 'בחר תמונה אחרת' : 'בחר תמונת אירוע'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>

            {croppedBlob && (
              <button
                onClick={uploadCover}
                disabled={busyAction === 'cover'}
                className="w-full py-3.5 rounded-[22px] bg-charcoal-900 text-white text-[13px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {busyAction === 'cover' ? 'שומר תמונה...' : 'שמור תמונת אירוע'}
              </button>
            )}

            {!croppedBlob && event?.cover_image_url && (
              <button
                onClick={removeCover}
                disabled={busyAction === 'cover'}
                className="w-full py-3.5 rounded-[22px] border border-[#E9DEC5] text-charcoal-700 text-[13px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {busyAction === 'cover' ? 'מסיר...' : 'הסר תמונת אירוע'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={surface}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={sectionLabel}>RSVP ציבורי</p>
              <h3 className="text-[18px] font-bold text-charcoal-900 mt-2">קישור ושיתוף לאורחים</h3>
              <p className="text-[12px] text-charcoal-400 mt-1">הפעלת עמוד אישור ציבורי עם קישור קבוע לאירוע.</p>
            </div>
            <button
              onClick={() => setField('publicEnabled', !form.publicEnabled)}
              className="rounded-2xl bg-[#FAF7EF] px-3 py-2 flex items-center gap-2 active:scale-[0.98] transition-transform"
            >
              {form.publicEnabled ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-charcoal-400" />}
              <span className="text-[13px] font-bold text-charcoal-900">{form.publicEnabled ? 'פעיל' : 'כבוי'}</span>
            </button>
          </div>

          <div className="rounded-[24px] border border-[#EFE8D8] bg-[#FAF7EF] p-3.5 mt-4">
            <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-[0.18em] mb-2">קישור האירוע</p>
            <div className="flex items-center gap-2" dir="ltr">
              <span className="text-[13px] text-charcoal-400 font-mono flex-shrink-0">/event/</span>
              <input
                value={form.publicSlug}
                onChange={(e) => setField('publicSlug', e.target.value)}
                placeholder="my-event-link"
                className="flex-1 bg-transparent text-[15px] text-charcoal-900 focus:outline-none"
              />
            </div>
          </div>

          {slugChanged && (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 mt-3 text-[12px] text-amber-900">
              שינוי slug ישבור קישורים ציבוריים ישנים שכבר נשלחו לאורחים.
            </div>
          )}

          {publicUrl ? (
            <div className="rounded-[24px] border border-[#EEDFB5] bg-[#FFFBEF] p-3.5 mt-3">
              <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-[0.18em] mb-2">קישור מוכן</p>
              <p className="text-[12px] text-charcoal-700 break-all" dir="ltr">{publicUrl}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={copyLink}
                  className="py-3 rounded-[20px] bg-white text-[13px] font-bold text-charcoal-900 border border-[#EFE3C6] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  העתק קישור
                </button>
                <button
                  onClick={shareLink}
                  className="py-3 rounded-[20px] bg-charcoal-900 text-[13px] font-bold text-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  שתף בוואטסאפ
                </button>
              </div>
              <button
                onClick={openPreview}
                className="w-full mt-2 py-3 rounded-[20px] bg-white text-[13px] font-bold text-charcoal-900 border border-[#EFE3C6] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                צפה בדף ה-RSVP
              </button>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#E5D9BE] bg-[#FCF9F0] px-4 py-4 text-center text-[12px] text-charcoal-400 mt-3">
              הקישור הציבורי יופיע כאן אחרי שמירה והפעלת RSVP.
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`rounded-[22px] px-4 py-3 text-[13px] font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={saveEvent}
        disabled={busyAction === 'save'}
        className="w-full py-4 rounded-[24px] bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        style={{ boxShadow: '0 12px 30px rgba(26,25,22,0.18)' }}
      >
        <Save className="w-4 h-4" />
        {busyAction === 'save' ? 'שומר...' : 'שמור פרטי אירוע'}
      </button>

      <div className={surface}>
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={sectionLabel}>ארכיון אירועים</p>
              <p className="text-[12px] text-charcoal-400 mt-1">מעבר מהיר בין אירועים קודמים בלי לאבד מידע.</p>
            </div>
            <button
              onClick={() => setConfirmAction('archive')}
              disabled={busyAction === 'archive'}
              className="rounded-2xl border border-[#E9DEC5] px-3 py-2 text-[12px] font-bold text-charcoal-700 disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {busyAction === 'archive' ? 'מעביר...' : 'העבר לארכיון'}
            </button>
          </div>

          {archivedEvents.length === 0 ? (
            <div className="rounded-[24px] bg-[#FAF7EF] px-4 py-5 text-center text-[13px] text-charcoal-400 mt-4">
              עדיין אין אירועים בארכיון.
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {archivedEvents.map((archivedEvent) => (
                <div key={archivedEvent.id} className="rounded-[22px] border border-[#EFE8D8] bg-[#FCFBF7] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-charcoal-900 truncate">{archivedEvent.event_name}</p>
                      <p className="text-[12px] text-charcoal-400 mt-1">{formatDisplayDate(archivedEvent.event_date)}</p>
                    </div>
                    <button
                      onClick={() => activateEvent(archivedEvent.id)}
                      disabled={busyAction === 'activate'}
                      className="px-3 py-2 rounded-xl bg-charcoal-900 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                    >
                      הפוך לפעיל
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCropper && rawImageUrl && (
        <ImageCropModal
          imageSrc={rawImageUrl}
          onDone={(blob) => handleCropDone(blob)}
          onCancel={() => {
            setShowCropper(false);
            setRawImageUrl(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        />
      )}

      {createPortal(
        <AnimatePresence>
          {confirmAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/45 flex items-end justify-center"
              style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => setConfirmAction(null)}
            >
              <motion.div
                initial={{ y: 32, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 32, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[430px] rounded-t-[32px] p-6"
                style={{ paddingBottom: 'max(36px, env(safe-area-inset-bottom))' }}
              >
                <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-5" />
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-amber-700" />
                </div>
                <h3 className="text-[20px] font-bold text-charcoal-900 text-center mb-2">
                  {confirmAction === 'create' ? 'ליצור אירוע חדש?' : 'להעביר את האירוע לארכיון?'}
                </h3>
                <p className="text-[14px] text-charcoal-500 text-center leading-relaxed mb-6">
                  {confirmAction === 'create'
                    ? 'יצירת אירוע חדש תעביר את האירוע הנוכחי לארכיון ותעבוד מעכשיו על האירוע החדש.'
                    : 'האירוע הפעיל יועבר לארכיון ותעבור אוטומטית לאירוע אחר או לאירוע חדש.'}
                </p>
                <div className="space-y-2.5">
                  <button
                    onClick={confirmAction === 'create' ? confirmCreateEvent : confirmArchiveEvent}
                    disabled={busyAction === 'create' || busyAction === 'archive'}
                    className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    {confirmAction === 'create'
                      ? (busyAction === 'create' ? 'יוצר...' : 'כן, צור אירוע חדש')
                      : (busyAction === 'archive' ? 'מעביר...' : 'כן, העבר לארכיון')}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="w-full py-4 rounded-2xl bg-charcoal-100 text-charcoal-700 text-[15px] font-bold active:scale-[0.98] transition-transform"
                  >
                    ביטול
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};
