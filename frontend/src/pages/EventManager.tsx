import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronRight,
  Copy,
  MapPin,
  Save,
  Send,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Event } from '../types';
import { eventService, openWhatsAppUrl } from '../services/supabase';

interface EventManagerProps {
  event?: Event | null;
  archivedEvents?: Event[];
  onBack: () => void;
  onEventUpdate?: (updates: Partial<Event>) => Promise<Event | undefined>;
  onCreateEvent?: (name?: string) => Promise<Event>;
  onActivateEvent?: (eventId: string) => Promise<Event>;
  onArchiveEvent?: (eventId: string) => Promise<Event>;
}

type BusyAction = 'save' | 'create' | 'activate' | 'archive' | null;

export const EventManager = ({
  event,
  archivedEvents = [],
  onBack,
  onEventUpdate,
  onCreateEvent,
  onActivateEvent,
  onArchiveEvent,
}: EventManagerProps) => {
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
  }, [event?.id, event?.event_name, event?.event_date, event?.venue_name, event?.venue_address, event?.description, event?.public_slug, event?.is_public]);

  const publicUrl = useMemo(() => {
    if (!form.publicEnabled || !form.publicSlug) return null;
    return eventService.buildPublicUrl(form.publicSlug);
  }, [form.publicEnabled, form.publicSlug]);

  const normalizedSlug = useMemo(
    () => form.publicSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    [form.publicSlug]
  );

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
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

  const cardClass = 'rounded-[28px] bg-white p-4 shadow-[0_8px_24px_rgba(26,25,22,0.06)]';

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
          <p className="text-[12px] text-charcoal-400 mt-0.5">יצירת אירוע, פרטי אירוע ו־RSVP במקום אחד</p>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold text-charcoal-400 mb-1">האירוע הפעיל</p>
            <p className="text-[20px] font-bold text-charcoal-900">{event?.event_name || 'האירוע שלי'}</p>
            <p className="text-[12px] text-charcoal-400 mt-1">
              {form.eventDate ? new Date(form.eventDate).toLocaleDateString('he-IL') : 'ללא תאריך'}
              {form.venueName ? ` · ${form.venueName}` : ''}
            </p>
          </div>
          <button
            onClick={createEvent}
            disabled={busyAction === 'create'}
            className="px-4 py-2.5 rounded-2xl bg-charcoal-900 text-white text-[13px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {busyAction === 'create' ? 'יוצר...' : 'צור אירוע'}
          </button>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-gold-600" />
          <h2 className="text-[16px] font-bold text-charcoal-900">פרטי האירוע</h2>
        </div>

        <div className="space-y-3">
          <input
            value={form.eventName}
            onChange={(e) => setField('eventName', e.target.value)}
            placeholder="שם האירוע"
            className="w-full px-4 py-3.5 rounded-2xl bg-charcoal-50 text-[14px] text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-200"
          />
          <input
            type="date"
            value={form.eventDate}
            onChange={(e) => setField('eventDate', e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl bg-charcoal-50 text-[14px] text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-200"
          />
          <div className="grid grid-cols-1 gap-3">
            <input
              value={form.venueName}
              onChange={(e) => setField('venueName', e.target.value)}
              placeholder="מקום האירוע"
              className="w-full px-4 py-3.5 rounded-2xl bg-charcoal-50 text-[14px] text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-200"
            />
            <input
              value={form.venueAddress}
              onChange={(e) => setField('venueAddress', e.target.value)}
              placeholder="כתובת"
              className="w-full px-4 py-3.5 rounded-2xl bg-charcoal-50 text-[14px] text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-200"
            />
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="תיאור קצר לאורחים"
            rows={3}
            className="w-full px-4 py-3.5 rounded-2xl bg-charcoal-50 text-[14px] text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-200 resize-none"
          />
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[16px] font-bold text-charcoal-900">RSVP ציבורי</h2>
            <p className="text-[12px] text-charcoal-400 mt-1">הגדרת קישור ציבורי וניהול השיתוף לאורחים</p>
          </div>
          <button
            onClick={() => setField('publicEnabled', !form.publicEnabled)}
            className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-charcoal-50 active:scale-[0.98] transition-transform"
          >
            {form.publicEnabled ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-charcoal-400" />}
            <span className="text-[13px] font-bold text-charcoal-900">{form.publicEnabled ? 'פעיל' : 'כבוי'}</span>
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-charcoal-50 px-3 py-2.5 flex items-center gap-2">
            <span className="text-[12px] text-charcoal-400 font-mono" dir="ltr">/event/</span>
            <input
              value={form.publicSlug}
              onChange={(e) => setField('publicSlug', e.target.value)}
              placeholder="your-event-link"
              dir="ltr"
              className="flex-1 bg-transparent text-[14px] text-charcoal-900 focus:outline-none"
            />
          </div>

          {publicUrl ? (
            <div className="rounded-2xl border border-charcoal-100 bg-[#FFFCF4] p-3">
              <p className="text-[11px] font-bold text-charcoal-400 mb-1">קישור פעיל</p>
              <p className="text-[12px] text-charcoal-700 break-all" dir="ltr">{publicUrl}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={copyLink}
                  className="py-3 rounded-2xl bg-white text-[13px] font-bold text-charcoal-900 border border-charcoal-100 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  העתק קישור
                </button>
                <button
                  onClick={shareLink}
                  className="py-3 rounded-2xl bg-charcoal-900 text-[13px] font-bold text-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  שתף בוואטסאפ
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-charcoal-200 p-4 text-center text-[12px] text-charcoal-400">
              הקישור הציבורי יופיע כאן אחרי שתשמור את ההגדרות.
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl px-4 py-3 text-[13px] font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={saveEvent}
        disabled={busyAction === 'save'}
        className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        style={{ boxShadow: '0 10px 28px rgba(26,25,22,0.16)' }}
      >
        <Save className="w-4 h-4" />
        {busyAction === 'save' ? 'שומר...' : 'שמור פרטי אירוע'}
      </button>

      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gold-600" />
          <h2 className="text-[16px] font-bold text-charcoal-900">אירועים קודמים</h2>
        </div>

        {archivedEvents.length === 0 ? (
          <p className="text-[13px] text-charcoal-400">עדיין אין אירועים בארכיון.</p>
        ) : (
          <div className="space-y-2">
            {archivedEvents.map((archivedEvent) => (
              <div key={archivedEvent.id} className="rounded-2xl border border-charcoal-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-charcoal-900 truncate">{archivedEvent.event_name}</p>
                    <p className="text-[12px] text-charcoal-400 mt-1">
                      {archivedEvent.event_date ? new Date(archivedEvent.event_date).toLocaleDateString('he-IL') : 'ללא תאריך'}
                    </p>
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

        <button
          onClick={archiveEvent}
          disabled={busyAction === 'archive'}
          className="w-full mt-3 py-3 rounded-2xl border border-charcoal-200 text-charcoal-700 text-[13px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {busyAction === 'archive' ? 'מעביר לארכיון...' : 'העבר את האירוע הפעיל לארכיון'}
        </button>
      </div>
    </motion.div>
  );
};
