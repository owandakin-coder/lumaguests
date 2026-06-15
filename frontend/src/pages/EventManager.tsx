import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronRight,
  Copy,
  Eye,
  RefreshCw,
  Save,
  Send,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { Collaborator, Event } from '../types';
import { collaboratorService, eventService, openWhatsAppUrl } from '../services/supabase';
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

type BusyAction = 'save' | 'create' | 'activate' | 'archive' | 'delete' | 'invite' | 'removeCollab' | null;
type ConfirmAction = 'create' | 'archive' | { type: 'delete'; eventId: string; name: string } | null;

const surface = 'rounded-[28px] bg-white shadow-[0_10px_28px_rgba(34,29,21,0.07)]';
const sectionLabel = 'text-[11px] font-bold tracking-[0.22em] text-[#B49B62] uppercase';
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
  const [newEventName, setNewEventName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
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
      setTimeout(() => onBack(), 1200);
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

  const createEvent = async () => {
    if (!onCreateEvent) return;
    try {
      setBusyAction('create');
      await onCreateEvent(newEventName.trim() || undefined);
      setMessage({ type: 'success', text: 'אירוע חדש נוצר. עכשיו אפשר להגדיר אותו כאן.' });
      setNewEventName('');
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
        setInviteEmail('');
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
            <p className="text-[11px] font-bold tracking-[0.18em] text-gold-600 uppercase">Event Studio</p>
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
          <p className="text-[11px] font-bold tracking-[0.18em] text-gold-600 uppercase">Event Studio</p>
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
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold tracking-[0.24em] text-white/38 uppercase mb-0.5">האירוע הפעיל</p>
            <h2 className="text-[20px] font-black leading-tight truncate">
              {form.eventName || 'האירוע שלי'}
            </h2>
            <p className="text-[11px] text-white/50 mt-0.5 truncate">
              {selectedDateLabel}
              {form.venueName ? ` · ${form.venueName}` : ''}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setConfirmAction('create')}
              disabled={busyAction === 'create'}
              className="shrink-0 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {busyAction === 'create' ? '...' : '+ אירוע'}
            </button>
          )}
        </div>
      </div>

      <div className={surface}>
        <div className="px-4 pt-4 pb-1">
          <p className={sectionLabel}>פרטי האירוע</p>
        </div>

        <div className="px-4 py-2.5 border-t border-[#F2EAD8] mt-2">
          <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">שם האירוע</p>
          <input
            value={form.eventName}
            onChange={(e) => setField('eventName', e.target.value)}
            placeholder="חתונה, בר-מצווה..."
            readOnly={!isOwner}
            className={`w-full bg-transparent text-[14px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none${!isOwner ? ' cursor-default select-text' : ''}`}
          />
        </div>

        <div
          className={`px-4 py-2.5 border-t border-[#F2EAD8] relative${isOwner ? ' cursor-pointer' : ' cursor-default'}`}
          onClick={isOwner ? () => dateInputRef.current?.showPicker?.() : undefined}
        >
          <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">תאריך</p>
          <p className={`text-[14px] ${form.eventDate ? 'text-charcoal-900' : 'text-charcoal-300'}`}>
            {selectedDateLabel}
          </p>
          <input
            ref={dateInputRef}
            type="date"
            value={form.eventDate}
            onChange={(e) => setField('eventDate', e.target.value)}
            className={`absolute inset-0 w-full h-full opacity-0${isOwner ? ' cursor-pointer' : ' pointer-events-none'}`}
            tabIndex={-1}
            readOnly={!isOwner}
          />
        </div>

        <div className="px-4 py-2.5 border-t border-[#F2EAD8]">
          <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">מקום האירוע</p>
          <input
            value={form.venueName}
            onChange={(e) => setField('venueName', e.target.value)}
            placeholder="שם האולם"
            readOnly={!isOwner}
            className={`w-full bg-transparent text-[14px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none${!isOwner ? ' cursor-default select-text' : ''}`}
          />
        </div>

        <div className="px-4 py-2.5 border-t border-[#F2EAD8]">
          <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">כתובת</p>
          <input
            value={form.venueAddress}
            onChange={(e) => setField('venueAddress', e.target.value)}
            placeholder="רחוב ועיר"
            readOnly={!isOwner}
            className={`w-full bg-transparent text-[14px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none${!isOwner ? ' cursor-default select-text' : ''}`}
          />
        </div>

        <div className="px-4 py-2.5 border-t border-[#F2EAD8] pb-4">
          <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-[0.16em] mb-1">תיאור</p>
          <textarea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="תיאור קצר לאורחים"
            rows={2}
            readOnly={!isOwner}
            className={`w-full bg-transparent text-[14px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none resize-none${!isOwner ? ' cursor-default select-text' : ''}`}
          />
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

          <div className="rounded-[20px] border border-[#EFE8D8] bg-[#FAF7EF] p-3 mt-4">
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

      {isOwner ? (
        <button
          onClick={saveEvent}
          disabled={busyAction === 'save'}
          className="w-full py-4 rounded-[22px] bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          style={{ boxShadow: '0 12px 30px rgba(26,25,22,0.14)' }}
        >
          <Save className="w-4 h-4" />
          {busyAction === 'save' ? 'שומר...' : 'שמור פרטי אירוע'}
        </button>
      ) : (
        <div className="w-full py-4 rounded-[22px] border border-[#DDD6FE] bg-[#F5F3FF] text-[13px] text-[#5B21B6] font-medium text-center">
          עריכת פרטי האירוע זמינה רק לבעל/ת האירוע
        </div>
      )}

      <div className={surface}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={sectionLabel}>ניהול משותף</p>
              <h3 className="text-[18px] font-bold text-charcoal-900 mt-2">שיתוף אירוע</h3>
              <p className="text-[12px] text-charcoal-400 mt-1">
                הזמן את בן/בת הזוג לנהל את רשימת האורחים יחד.
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#F5F3FF' }}>
              <UserPlus className="w-4.5 h-4.5" style={{ color: '#7C3AED' }} />
            </div>
          </div>

          {isOwner ? (
            <>
              <div className="flex gap-2 mt-4">
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
            <div className="rounded-[20px] bg-[#F5F3FF] px-4 py-4 mt-3 text-center text-[13px] text-[#5B21B6]">
              אתה/את מנהל/ת אירוע זה כשותף/ה.
            </div>
          )}
        </div>
      </div>

      {isOwner && (
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
            <div className="rounded-[20px] bg-[#FAF7EF] px-4 py-5 text-center text-[13px] text-charcoal-400 mt-4">
              עדיין אין אירועים בארכיון.
            </div>
          ) : (
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
      </div>
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
