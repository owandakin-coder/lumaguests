import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  ImagePlus,
  Link,
  Pencil,
  RefreshCw,
  Send,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Collaborator, Event } from '../types';
import { collaboratorService, eventService, openWhatsAppUrl, storageService } from '../services/supabase';
import { ImageCropModal } from '../components/ImageCropModal';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface EventManagerProps {
  event?: Event | null;
  archivedEvents?: Event[];
  onBack: () => void;
  onEventUpdate?: (updates: Partial<Event>) => Promise<Event | undefined>;
  onCreateEvent?: (name?: string) => Promise<Event>;
  onActivateEvent?: (eventId: string) => Promise<Event>;
  onArchiveEvent?: (eventId: string) => Promise<Event>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
}

type BusyAction = 'save' | 'create' | 'activate' | 'archive' | 'delete' | 'invite' | 'removeCollab' | 'cover' | null;
type ConfirmAction = 'create' | 'archive' | { type: 'delete'; eventId: string; name: string } | null;
type AccordionSection = 'cover' | 'details' | 'rsvp' | 'sharing' | 'archive';

const surface = 'rounded-[28px] bg-white shadow-[0_10px_28px_rgba(34,29,21,0.07)]';
const sectionLabel = 'text-[11px] font-bold tracking-[0.22em] text-charcoal-900 uppercase';
const inputClass =
  'w-full rounded-[20px] border border-[#EFE8D8] bg-[#FAF7EF] px-4 py-3 text-[15px] text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#D8C088]';

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
  onDeleteEvent,
}: EventManagerProps) => {
  const auth = useSupabaseAuth();
  const isOwner = !event || event.owner_user_id === auth.user?.id;

  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [openSection, setOpenSection] = useState<AccordionSection | null>(null);
  const [newEventName, setNewEventName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [lastInvitedEmail, setLastInvitedEmail] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [form, setForm] = useState({
    eventName: '',
    eventDate: '',
    venueName: '',
    venueAddress: '',
    description: '',
    publicSlug: '',
    publicEnabled: false,
    rsvpOpen: true,
  });
  const dateInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [signedCoverUrl, setSignedCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      eventName: event?.event_name || '',
      eventDate: event?.event_date ? event.event_date.split('T')[0] : '',
      venueName: event?.venue_name || '',
      venueAddress: event?.venue_address || '',
      description: event?.description || '',
      publicSlug: event?.public_slug || '',
      publicEnabled: !!event?.is_public,
      rsvpOpen: event?.public_rsvp_enabled ?? true,
    });
    setMessage(null);
    setNewEventName('');
    setIsEditing(false);
  }, [
    event?.id,
    event?.event_name,
    event?.event_date,
    event?.venue_name,
    event?.venue_address,
    event?.description,
    event?.public_slug,
    event?.is_public,
    event?.public_rsvp_enabled,
  ]);

  useEffect(() => {
    if (!event?.id || !isOwner) return;
    void collaboratorService.list(event.id).then(setCollaborators).catch(() => {});
  }, [event?.id, isOwner]);

  useEffect(() => {
    const raw = event?.cover_image_url;
    if (!raw) { setSignedCoverUrl(null); return; }
    let cancelled = false;
    storageService.getSignedCoverUrl(raw)
      .then(url => { if (!cancelled) setSignedCoverUrl(url); })
      .catch(() => { if (!cancelled) setSignedCoverUrl(raw); });
    return () => { cancelled = true; };
  }, [event?.cover_image_url]);

  const normalizedSlug = useMemo(
    () =>
      form.publicSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
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

  const isDeleteConfirm = (a: ConfirmAction): a is { type: 'delete'; eventId: string; name: string } =>
    typeof a === 'object' && a !== null && (a as any).type === 'delete';

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
        public_rsvp_enabled: form.rsvpOpen,
      });
      setMessage({ type: 'success', text: 'פרטי האירוע נשמרו.' });
      setIsEditing(false);
    } catch (error: any) {
      const duplicate =
        error?.code === '23505' || String(error?.message || '').toLowerCase().includes('duplicate');
      setMessage({
        type: 'error',
        text: duplicate
          ? 'הקישור הזה כבר תפוס. בחר קישור אחר.'
          : error?.message || 'לא הצלחנו לשמור את פרטי האירוע.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const cancelEdit = () => {
    setForm({
      eventName: event?.event_name || '',
      eventDate: event?.event_date ? event.event_date.split('T')[0] : '',
      venueName: event?.venue_name || '',
      venueAddress: event?.venue_address || '',
      description: event?.description || '',
      publicSlug: event?.public_slug || '',
      publicEnabled: !!event?.is_public,
      rsvpOpen: event?.public_rsvp_enabled ?? true,
    });
    setMessage(null);
    setIsEditing(false);
  };

  const resetCoverState = () => {
    setRawImageUrl(null);
    setCroppedBlob(null);
    setCroppedPreview(null);
    setShowCropper(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const toggleSection = (section: AccordionSection) => {
    if (isEditing && section === 'details') return;
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const createEvent = async () => {
    if (!onCreateEvent) return;
    try {
      setBusyAction('create');
      await onCreateEvent(newEventName.trim() || undefined);
      setNewEventName('');
      onBack();
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'לא הצלחנו ליצור אירוע חדש.' });
    } finally {
      setBusyAction(null);
    }
  };

  const activateEvent = async (eventId: string) => {
    if (!onActivateEvent) return;
    try {
      setBusyAction('activate');
      await onActivateEvent(eventId);
      setMessage({ type: 'success', text: 'עברת לאירוע שבחרת.' });
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

  const deleteEventById = async (eventId: string) => {
    if (!onDeleteEvent) return;
    try {
      setBusyAction('delete');
      await onDeleteEvent(eventId);
      setMessage({ type: 'success', text: 'האירוע נמחק.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'לא הצלחנו למחוק את האירוע.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleInvite = async () => {
    if (!event?.id || !inviteEmail.trim()) return;
    try {
      setBusyAction('invite');
      const result = await collaboratorService.invite(event.id, inviteEmail.trim());
      if (result.success) {
        const invited = inviteEmail.trim();
        setInviteEmail('');
        setLastInvitedEmail(invited);
        setMessage({ type: 'success', text: 'השותף/ה נוסף/ה בהצלחה.' });
        const updated = await collaboratorService.list(event.id);
        setCollaborators(updated);
      } else {
        const msgs: Record<string, string> = {
          user_not_found: 'לא נמצא משתמש עם כתובת מייל זו.',
          not_owner: 'רק בעל/ת האירוע יכול/ה להזמין שותפים.',
          cannot_invite_self: 'לא ניתן להזמין את עצמך.',
        };
        setMessage({ type: 'error', text: msgs[result.error || ''] || 'לא הצלחנו להזמין.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'שגיאה בהזמנה.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!event?.id) return;
    try {
      setBusyAction('removeCollab');
      await collaboratorService.remove(event.id, userId);
      setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'לא הצלחנו להסיר.' });
    } finally {
      setBusyAction(null);
    }
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

  if (!event) {
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
  
            <h1 className="text-[28px] font-bold text-charcoal-900">ניהול אירוע</h1>
            <p className="text-[12px] text-charcoal-400 mt-0.5">יצירת אירוע חדש או חזרה לאירוע קודם</p>
          </div>
        </div>

        <div className={surface}>
          <div className="p-5">
            <p className={sectionLabel}>אירוע חדש</p>
            <h2 className="text-[24px] font-black text-charcoal-900 mt-3">אין כרגע אירוע פעיל</h2>
            <p className="text-[13px] text-charcoal-500 mt-2 leading-relaxed">
              תן שם לאירוע שלך ולחץ על הכפתור. מיד אחרי זה ייפתח אירוע פעיל חדש ותוכל להגדיר RSVP, פרטי מקום ותאריך.
            </p>

            <input
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="לדוגמה: החתונה של דוד"
              className={`${inputClass} mt-4`}
            />

            <button
              onClick={() => void createEvent()}
              disabled={busyAction === 'create'}
              className="w-full mt-3 py-4 rounded-[22px] bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              style={{ boxShadow: '0 12px 30px rgba(26,25,22,0.14)' }}
            >
              {busyAction === 'create' ? 'יוצר אירוע...' : 'צור אירוע חדש'}
            </button>
          </div>
        </div>

        {message ? (
          <div
            className={`rounded-[20px] px-4 py-3 text-[13px] font-medium ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {message.text}
          </div>
        ) : null}

        {archivedEvents.length > 0 && (
          <div className={surface}>
            <div className="p-4">
              <p className={sectionLabel}>אירועים קודמים</p>
              <p className="text-[12px] text-charcoal-400 mt-1">אפשר גם להחזיר אירוע קיים להיות פעיל.</p>

              <div className="space-y-2 mt-4">
                {archivedEvents.map((archivedEvent) => (
                  <div
                    key={archivedEvent.id}
                    className="rounded-[20px] border border-[#EFE8D8] bg-[#FCFBF7] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-charcoal-900 truncate">
                          {archivedEvent.event_name}
                        </p>
                        <p className="text-[12px] text-charcoal-400 mt-0.5">
                          {formatDisplayDate(archivedEvent.event_date)}
                        </p>
                      </div>
                      <button
                        onClick={() => activateEvent(archivedEvent.id)}
                        disabled={busyAction === 'activate'}
                        className="px-3 py-2 rounded-xl bg-charcoal-900 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform shrink-0"
                      >
                        הפוך לפעיל
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

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

          <h1 className="text-[28px] font-bold text-charcoal-900">ניהול אירוע</h1>
          <p className="text-[12px] text-charcoal-400 mt-0.5">פרטי אירוע ו-RSVP במסך אחד פשוט</p>
        </div>
      </div>

      {!isOwner && (
        <div className="rounded-[18px] border border-[#DDD6FE] bg-[#F5F3FF] px-4 py-2.5 flex items-center gap-2">
          <span className="text-[13px] flex-shrink-0" style={{ color: '#7C3AED' }}>🔒</span>
          <p className="text-[12px] leading-snug" style={{ color: '#5B21B6' }}>
            גישה כשותף/ה — עריכת פרטי האירוע זמינה רק לבעל/ת האירוע
          </p>
        </div>
      )}

      <div
        className="rounded-[22px] px-4 py-3.5 text-white"
        style={{
          background:
            'radial-gradient(ellipse at top right, rgba(228,202,134,0.15), transparent 50%), linear-gradient(150deg, #1C1A14 0%, #2A2720 100%)',
          boxShadow: '0 8px 24px rgba(20,18,12,0.18)',
        }}
      >
        <div>
          <p className="text-[9px] font-bold tracking-[0.24em] text-white/38 uppercase mb-0.5">האירוע הפעיל</p>
          <h2 className="text-[20px] font-black leading-tight truncate">
            {form.eventName || 'האירוע שלי'}
          </h2>
          <p className="text-[11px] text-white/50 mt-0.5 truncate">
            {selectedDateLabel}
            {form.venueName ? ` · ${form.venueName}` : ''}
          </p>
        </div>
      </div>

      {message ? (
        <div
          className={`rounded-[20px] px-4 py-3 text-[13px] font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {/* תמונת האירוע */}
      {isOwner && (
        <div className={surface}>
          <button
            onClick={() => toggleSection('cover')}
            className="w-full px-4 py-4 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-[14px] bg-pink-50 flex items-center justify-center flex-shrink-0">
              <ImagePlus className="w-4 h-4 text-pink-500" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className={sectionLabel}>תמונת האירוע</p>
              <p className="text-[13px] text-charcoal-500 mt-0.5">
                {(croppedPreview || signedCoverUrl) ? 'תמונה מוגדרת' : 'לא הוגדרה תמונה'}
              </p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-charcoal-400 flex-shrink-0 transition-transform duration-200 ${openSection === 'cover' ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {openSection === 'cover' && (
              <motion.div
                key="cover-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div className="border-t border-[#F2EAD8] p-4">
                  {(croppedPreview || signedCoverUrl) ? (
                    <div className="rounded-2xl overflow-hidden bg-charcoal-100 mb-3" style={{ aspectRatio: '16 / 9' }}>
                      <img
                        src={croppedPreview || signedCoverUrl || ''}
                        alt={form.eventName || 'תמונת האירוע'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-charcoal-200 px-4 py-6 text-center text-[12px] text-charcoal-400 mb-3">
                      עדיין לא הוגדרה תמונת אירוע.
                    </div>
                  )}

                  <label className="flex items-center justify-center gap-2 w-full py-3.5 rounded-[20px] border-2 border-dashed border-charcoal-200 cursor-pointer active:bg-charcoal-50 transition-colors">
                    <ImagePlus className="w-4 h-4 text-charcoal-400" />
                    <span className="text-[14px] font-semibold text-charcoal-600">
                      {croppedBlob || signedCoverUrl ? 'החלף תמונה' : 'בחר תמונת אירוע'}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>

                  <div className="mt-3 space-y-2">
                    {croppedBlob && (
                      <button
                        onClick={() => void uploadCover()}
                        disabled={busyAction === 'cover'}
                        className="w-full py-3 rounded-[20px] bg-charcoal-900 text-white text-[14px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                      >
                        {busyAction === 'cover' ? 'שומר תמונה...' : 'שמור תמונת אירוע'}
                      </button>
                    )}
                    {!croppedBlob && signedCoverUrl && (
                      <button
                        onClick={() => void removeCover()}
                        disabled={busyAction === 'cover'}
                        className="w-full py-3 rounded-[20px] border border-charcoal-200 text-charcoal-700 text-[14px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
                      >
                        {busyAction === 'cover' ? 'מסיר...' : 'הסר תמונת אירוע'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* פרטי האירוע */}
      <div className={surface}>
        <button
          onClick={() => toggleSection('details')}
          className="w-full px-4 py-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-[14px] bg-amber-50 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className={sectionLabel}>פרטי האירוע</p>
            <p className="text-[13px] text-charcoal-500 mt-0.5 truncate">
              {form.eventName || 'ללא שם'}
              {form.eventDate ? ` · ${selectedDateLabel}` : ''}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-charcoal-400 flex-shrink-0 transition-transform duration-200 ${openSection === 'details' ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {openSection === 'details' && (
            <motion.div
              key="details-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="border-t border-[#F2EAD8]">
                {isOwner && !isEditing && (
                  <div className="px-4 pt-3 flex justify-end">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-charcoal-600 px-3 py-1.5 rounded-xl bg-[#FAF7EF] active:scale-90 transition-transform"
                    >
                      <Pencil className="w-3 h-3" />
                      ערוך
                    </button>
                  </div>
                )}

                <div className="px-4 py-2.5 border-t border-[#F2EAD8] mt-2">
                  <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">שם האירוע</p>
                  {isEditing ? (
                    <input
                      value={form.eventName}
                      onChange={(e) => setField('eventName', e.target.value)}
                      placeholder="חתונה, בר-מצווה..."
                      autoFocus
                      className="w-full bg-transparent text-[14px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none"
                    />
                  ) : (
                    <p className="text-[14px] text-charcoal-900">{form.eventName || <span className="text-charcoal-300">לא הוגדר</span>}</p>
                  )}
                </div>

                <div
                  className={`px-4 py-2.5 border-t border-[#F2EAD8] relative${isEditing ? ' cursor-pointer' : ''}`}
                  onClick={isEditing ? () => dateInputRef.current?.showPicker?.() : undefined}
                >
                  <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">תאריך</p>
                  <p className={`text-[14px] ${form.eventDate ? 'text-charcoal-900' : 'text-charcoal-300'}`}>
                    {selectedDateLabel}
                    {isEditing && <span className="text-[11px] text-gold-500 mr-2">← לחץ לשינוי</span>}
                  </p>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => setField('eventDate', e.target.value)}
                    className={`absolute inset-0 w-full h-full opacity-0${isEditing ? ' cursor-pointer' : ' pointer-events-none'}`}
                    tabIndex={-1}
                  />
                </div>

                <div className="px-4 py-2.5 border-t border-[#F2EAD8]">
                  <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">מקום האירוע</p>
                  {isEditing ? (
                    <input
                      value={form.venueName}
                      onChange={(e) => setField('venueName', e.target.value)}
                      placeholder="שם האולם"
                      className="w-full bg-transparent text-[14px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none"
                    />
                  ) : (
                    <p className="text-[14px] text-charcoal-900">{form.venueName || <span className="text-charcoal-300">לא הוגדר</span>}</p>
                  )}
                </div>

                <div className="px-4 py-2.5 border-t border-[#F2EAD8]">
                  <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">כתובת</p>
                  {isEditing ? (
                    <input
                      value={form.venueAddress}
                      onChange={(e) => setField('venueAddress', e.target.value)}
                      placeholder="רחוב ועיר"
                      className="w-full bg-transparent text-[14px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none"
                    />
                  ) : (
                    <p className="text-[14px] text-charcoal-900">{form.venueAddress || <span className="text-charcoal-300">לא הוגדר</span>}</p>
                  )}
                </div>

                <div className="px-4 py-2.5 border-t border-[#F2EAD8]">
                  <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">תיאור</p>
                  {isEditing ? (
                    <textarea
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="תיאור קצר לאורחים"
                      rows={2}
                      className="w-full bg-transparent text-[14px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none resize-none"
                    />
                  ) : (
                    <p className="text-[14px] text-charcoal-900">{form.description || <span className="text-charcoal-300">לא הוגדר</span>}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#F2EAD8] flex gap-2">
                    <button
                      onClick={cancelEdit}
                      className="flex-1 py-2.5 rounded-[18px] border border-[#E0D6C2] text-[14px] font-semibold text-charcoal-600 active:scale-[0.98] transition-transform"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={() => void saveEvent()}
                      disabled={busyAction === 'save'}
                      className="flex-1 py-2.5 rounded-[18px] bg-charcoal-900 text-white text-[14px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                    >
                      {busyAction === 'save' ? 'שומר...' : 'שמור'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RSVP ציבורי */}
      <div className={surface}>
        <button
          onClick={() => toggleSection('rsvp')}
          className="w-full px-4 py-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-[14px] bg-sky-50 flex items-center justify-center flex-shrink-0">
            <Link className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className={sectionLabel}>RSVP ציבורי</p>
            <p className="text-[13px] text-charcoal-500 mt-0.5">קישור ושיתוף לאורחים</p>
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
              form.publicEnabled
                ? 'bg-green-100 text-green-700'
                : 'bg-charcoal-100 text-charcoal-500'
            }`}
          >
            {form.publicEnabled ? 'פעיל' : 'כבוי'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-charcoal-400 flex-shrink-0 transition-transform duration-200 ${openSection === 'rsvp' ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {openSection === 'rsvp' && (
            <motion.div
              key="rsvp-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="border-t border-[#F2EAD8] p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <p className="text-[13px] font-bold text-charcoal-900">הפעל עמוד RSVP ציבורי</p>
                  <button
                    onClick={isOwner ? () => setField('publicEnabled', !form.publicEnabled) : undefined}
                    disabled={!isOwner}
                    className={`rounded-2xl bg-[#FAF7EF] px-3 py-2 flex items-center gap-2 transition-transform${isOwner ? ' active:scale-[0.98]' : ' cursor-default opacity-75'}`}
                  >
                    {form.publicEnabled ? (
                      <ToggleRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-charcoal-400" />
                    )}
                    <span className="text-[13px] font-bold text-charcoal-900">{form.publicEnabled ? 'פעיל' : 'כבוי'}</span>
                  </button>
                </div>

                <div className="rounded-[20px] border border-[#EFE8D8] bg-[#FAF7EF] p-3">
                  <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-[0.18em] mb-2">קישור האירוע</p>
                  <div className="flex items-center gap-2" dir="ltr">
                    <span className="text-[13px] text-charcoal-400 font-mono flex-shrink-0">/event/</span>
                    <input
                      value={form.publicSlug}
                      onChange={(e) => setField('publicSlug', e.target.value)}
                      placeholder="my-event-link"
                      readOnly={!isOwner}
                      className={`flex-1 bg-transparent text-[15px] text-charcoal-900 focus:outline-none${!isOwner ? ' cursor-default select-text' : ''}`}
                    />
                  </div>
                </div>

                {form.publicEnabled && (
                  <div className="flex items-center justify-between mt-3 px-1">
                    <div>
                      <p className="text-[13px] font-bold text-charcoal-900">קבלת הרשמות</p>
                      <p className="text-[11px] text-charcoal-400 mt-0.5">כשסגור — אורחים לא יוכלו להירשם</p>
                    </div>
                    <button
                      onClick={isOwner ? () => setField('rsvpOpen', !form.rsvpOpen) : undefined}
                      disabled={!isOwner}
                      className={`rounded-2xl bg-[#FAF7EF] px-3 py-2 flex items-center gap-2 transition-transform${isOwner ? ' active:scale-[0.98]' : ' cursor-default opacity-75'}`}
                    >
                      {form.rsvpOpen ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-red-400" />
                      )}
                      <span className="text-[13px] font-bold text-charcoal-900">
                        {form.rsvpOpen ? 'פתוח' : 'סגור'}
                      </span>
                    </button>
                  </div>
                )}

                {slugChanged ? (
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 mt-3 text-[12px] text-amber-900">
                    שינוי slug ישבור קישורים ציבוריים ישנים שכבר נשלחו לאורחים.
                  </div>
                ) : null}

                {publicUrl ? (
                  <div className="rounded-[20px] border border-[#EEDFB5] bg-[#FFFBEF] p-3 mt-3">
                    <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-[0.18em] mb-2">קישור מוכן</p>
                    <p className="text-[12px] text-charcoal-700 break-all" dir="ltr">
                      {publicUrl}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={copyLink}
                        className="py-3 rounded-[18px] bg-white text-[13px] font-bold text-charcoal-900 border border-[#EFE3C6] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        העתק קישור
                      </button>
                      <button
                        onClick={shareLink}
                        className="py-3 rounded-[18px] bg-charcoal-900 text-[13px] font-bold text-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        שתף בוואטסאפ
                      </button>
                    </div>
                    <button
                      onClick={openPreview}
                      className="w-full mt-2 py-3 rounded-[18px] bg-white text-[13px] font-bold text-charcoal-900 border border-[#EFE3C6] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      צפה בדף ה-RSVP
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[#E5D9BE] bg-[#FCF9F0] px-4 py-4 text-center text-[12px] text-charcoal-400 mt-3">
                    הקישור הציבורי יופיע כאן אחרי שמירה והפעלת RSVP.
                  </div>
                )}

                {isOwner && (
                  <button
                    onClick={() => void saveEvent()}
                    disabled={busyAction === 'save'}
                    className="w-full mt-3 py-3 rounded-[22px] bg-charcoal-900 text-white text-[14px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    {busyAction === 'save' ? 'שומר...' : 'שמור הגדרות'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ניהול משותף */}
      <div className={surface}>
        <button
          onClick={() => toggleSection('sharing')}
          className="w-full px-4 py-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-[14px] bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className={sectionLabel}>ניהול משותף</p>
            <p className="text-[13px] text-charcoal-500 mt-0.5">
              {collaborators.length > 0
                ? `${collaborators.length} שותף${collaborators.length !== 1 ? 'ים' : ''}`
                : 'אין שותפים'}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-charcoal-400 flex-shrink-0 transition-transform duration-200 ${openSection === 'sharing' ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {openSection === 'sharing' && (
            <motion.div
              key="sharing-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="border-t border-[#F2EAD8] p-4">
                {isOwner ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleInvite(); }}
                        placeholder="כתובת מייל"
                        dir="ltr"
                        className="flex-1 rounded-[20px] border border-[#EFE8D8] bg-[#FAF7EF] px-4 py-2.5 text-[14px] text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#D8C088]"
                      />
                      <button
                        onClick={() => void handleInvite()}
                        disabled={busyAction === 'invite' || !inviteEmail.trim()}
                        className="px-4 py-2.5 rounded-[20px] bg-charcoal-900 text-white text-[13px] font-bold disabled:opacity-40 active:scale-[0.98] transition-transform flex-shrink-0"
                      >
                        {busyAction === 'invite' ? '...' : 'הזמן'}
                      </button>
                    </div>

                    {lastInvitedEmail && (
                      <div className="rounded-[20px] bg-[#EDFFF4] border border-[#A7F3C9] px-4 py-3 mt-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-green-800">נוסף/ה בהצלחה!</p>
                          <p className="text-[11px] text-green-700 mt-0.5 truncate" dir="ltr">{lastInvitedEmail}</p>
                          <p className="text-[11px] text-green-600 mt-0.5">שלח/י להם הודעה כדי שידעו להיכנס</p>
                        </div>
                        <button
                          onClick={() => {
                            const appUrl = window.location.origin;
                            const text = `הוזמנת לנהל יחד את האורחים של ${form.eventName || 'האירוע שלנו'} 🎉\nכנס/י לאפליקציה עם המייל: ${lastInvitedEmail}\n${appUrl}`;
                            openWhatsAppUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
                          }}
                          className="shrink-0 flex items-center gap-1.5 bg-[#25D366] text-white text-[12px] font-bold px-3 py-2 rounded-[14px] active:scale-[0.97] transition-transform"
                        >
                          <Send className="w-3.5 h-3.5" />
                          WhatsApp
                        </button>
                      </div>
                    )}

                    {collaborators.length === 0 ? (
                      <div className="rounded-[20px] bg-[#FAF7EF] px-4 py-4 text-center text-[13px] text-charcoal-400 mt-3">
                        עדיין אין שותפים לניהול האירוע.
                      </div>
                    ) : (
                      <div className="space-y-2 mt-3">
                        {collaborators.map((c) => (
                          <div
                            key={c.user_id}
                            className="flex items-center gap-3 rounded-[20px] border border-[#EFE8D8] bg-[#FCFBF7] px-4 py-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-charcoal-900 truncate" dir="ltr">
                                {c.email}
                              </p>
                            </div>
                            <button
                              onClick={() => void handleRemoveCollaborator(c.user_id)}
                              disabled={busyAction === 'removeCollab'}
                              className="w-7 h-7 rounded-xl border border-red-200 bg-red-50 flex items-center justify-center disabled:opacity-40 active:scale-[0.98] transition-transform flex-shrink-0"
                            >
                              <X className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-[20px] bg-[#F5F3FF] px-4 py-4 text-center text-[13px] text-[#5B21B6]">
                    אתה/את מנהל/ת אירוע זה כשותף/ה.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isOwner && (
        <div className={surface}>
          <button
            onClick={() => toggleSection('archive')}
            className="w-full px-4 py-4 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-[14px] bg-charcoal-100 flex items-center justify-center flex-shrink-0">
              <Archive className="w-4 h-4 text-charcoal-500" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className={sectionLabel}>ארכיון אירועים</p>
              <p className="text-[13px] text-charcoal-500 mt-0.5">
                {archivedEvents.length > 0 ? `${archivedEvents.length} אירועים בארכיון` : 'ריק'}
              </p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-charcoal-400 flex-shrink-0 transition-transform duration-200 ${openSection === 'archive' ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {openSection === 'archive' && (
              <motion.div
                key="archive-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div className="border-t border-[#F2EAD8] p-4">
                  <button
                    onClick={() => setConfirmAction('create')}
                    disabled={busyAction === 'create'}
                    className="w-full py-3 rounded-[20px] bg-charcoal-900 text-white text-[14px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform mb-3"
                  >
                    {busyAction === 'create' ? 'יוצר...' : '+ צור אירוע חדש'}
                  </button>

                  <div className="flex items-center justify-between gap-3 mb-4">
                    <p className="text-[12px] text-charcoal-400">מעבר מהיר בין אירועים קודמים בלי לאבד מידע.</p>
                    <button
                      onClick={() => setConfirmAction('archive')}
                      disabled={busyAction === 'archive'}
                      className="rounded-2xl border border-[#E9DEC5] px-3 py-2 text-[12px] font-bold text-charcoal-700 disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center gap-2 shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {busyAction === 'archive' ? 'מעביר...' : 'העבר לארכיון'}
                    </button>
                  </div>

                  {archivedEvents.length === 0 ? (
                    <div className="rounded-[20px] bg-[#FAF7EF] px-4 py-5 text-center text-[13px] text-charcoal-400">
                      עדיין אין אירועים בארכיון.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {archivedEvents.map((archivedEvent) => (
                        <div
                          key={archivedEvent.id}
                          className="rounded-[20px] border border-[#EFE8D8] bg-[#FCFBF7] px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-bold text-charcoal-900 truncate">
                                {archivedEvent.event_name}
                              </p>
                              <p className="text-[12px] text-charcoal-400 mt-0.5">
                                {formatDisplayDate(archivedEvent.event_date)}
                              </p>
                            </div>
                            <button
                              onClick={() => activateEvent(archivedEvent.id)}
                              disabled={busyAction === 'activate'}
                              className="px-3 py-2 rounded-xl bg-charcoal-900 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform shrink-0"
                            >
                              הפוך לפעיל
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  type: 'delete',
                                  eventId: archivedEvent.id,
                                  name: archivedEvent.event_name || 'אירוע',
                                })
                              }
                              disabled={busyAction === 'delete'}
                              className="w-8 h-8 rounded-xl border border-red-200 bg-red-50 flex items-center justify-center disabled:opacity-50 active:scale-[0.98] transition-transform shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {showCropper && rawImageUrl && (
        <ImageCropModal
          imageSrc={rawImageUrl}
          onDone={(blob) => handleCropDone(blob)}
          onCancel={() => {
            setShowCropper(false);
            setRawImageUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
      )}

      {createPortal(
        <AnimatePresence>
          {confirmAction ? (
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
                className="bg-white w-full max-w-[430px] rounded-t-[32px] px-5 pt-5 pb-8"
                style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
              >
                <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-4" />

                <div
                  className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                    isDeleteConfirm(confirmAction) ? 'bg-red-100' : 'bg-amber-100'
                  }`}
                >
                  {isDeleteConfirm(confirmAction) ? (
                    <Trash2 className="w-6 h-6 text-red-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-700" />
                  )}
                </div>

                <h3 className="text-[19px] font-bold text-charcoal-900 text-center mb-2">
                  {confirmAction === 'create'
                    ? 'ליצור אירוע חדש?'
                    : isDeleteConfirm(confirmAction)
                      ? `למחוק את "${confirmAction.name}"?`
                      : 'להעביר את האירוע לארכיון?'}
                </h3>

                <p className="text-[13px] text-charcoal-500 text-center leading-relaxed mb-5">
                  {confirmAction === 'create'
                    ? 'האירוע הנוכחי יישמר בארכיון ותוכל לחזור אליו בכל שלב.'
                    : isDeleteConfirm(confirmAction)
                      ? 'האירוע וכל המוזמנים שלו יימחקו לצמיתות. לא ניתן לבטל פעולה זו.'
                      : 'האירוע הפעיל יועבר לארכיון ותעבור אוטומטית לאירוע אחר או לאירוע חדש.'}
                </p>

                {confirmAction === 'create' ? (
                  <input
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="שם לאירוע החדש"
                    autoFocus
                    className={`${inputClass} mb-4`}
                  />
                ) : null}

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      const action = confirmAction;
                      setConfirmAction(null);
                      if (action === 'create') {
                        void createEvent();
                      } else if (action === 'archive') {
                        void archiveEvent();
                      } else if (isDeleteConfirm(action)) {
                        void deleteEventById(action.eventId);
                      }
                    }}
                    disabled={
                      busyAction === 'create' || busyAction === 'archive' || busyAction === 'delete'
                    }
                    className={`w-full py-4 rounded-[22px] text-white text-[14px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform ${
                      isDeleteConfirm(confirmAction) ? 'bg-red-500' : 'bg-charcoal-900'
                    }`}
                  >
                    {confirmAction === 'create'
                      ? busyAction === 'create'
                        ? 'יוצר...'
                        : 'כן, צור אירוע חדש'
                      : isDeleteConfirm(confirmAction)
                        ? busyAction === 'delete'
                          ? 'מוחק...'
                          : 'כן, מחק לצמיתות'
                        : busyAction === 'archive'
                          ? 'מעביר...'
                          : 'כן, העבר לארכיון'}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="w-full py-4 rounded-[22px] bg-charcoal-100 text-charcoal-700 text-[14px] font-bold active:scale-[0.98] transition-transform"
                  >
                    ביטול
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};
