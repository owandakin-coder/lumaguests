import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Palette, HelpCircle, FileText,
  LogOut, ChevronLeft, Trash2, Info, Bell, Globe, Star,
  X, Eye, EyeOff, Mail, Lock, MessageCircle, Check, CalendarDays,
  MapPin, Link2, Share2, ToggleLeft, ToggleRight, AlignLeft, ImagePlus,
} from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { guestService, authService, eventService, supabase, storageService, openWhatsAppUrl } from '../services/supabase';
import { Event } from '../types';
import { ImageCropModal } from '../components/ImageCropModal';

interface SettingsProps {
  onLogout: () => void;
  userEmail?: string;
  event?: Event | null;
  onEventUpdate?: (updates: Partial<Event>) => Promise<Event | undefined>;
}

type ModalType =
  | 'email' | 'password' | 'notifications' | 'theme' | 'language'
  | 'eventName' | 'eventDate' | 'eventVenue' | 'eventDesc' | 'eventSlug' | 'eventShare' | 'eventCover'
  | 'help' | 'contact' | 'terms' | 'privacy' | null;

const EVENT_KEY      = 'luma_event_name';
const EVENT_DATE_KEY = 'luma_event_date';

// ── Bottom Sheet wrapper — uses Portal to escape motion.div transform context ─
const Sheet = ({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) => createPortal(
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          onClick={e => e.stopPropagation()}
          className="bg-white w-full max-w-[430px] rounded-t-3xl p-6 overflow-y-auto"
          style={{
            maxHeight: '85dvh',
            paddingBottom: 'max(40px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-5" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[18px] font-bold text-charcoal-900">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-charcoal-100 flex items-center justify-center active:scale-90 transition-transform">
              <X className="w-4 h-4 text-charcoal-600" />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>,
  document.body
);

// ── Field ──────────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="text-[12px] font-bold text-charcoal-400 uppercase tracking-wide">{label}</p>
    {children}
  </div>
);

const inputCls = 'w-full px-4 py-3.5 rounded-2xl bg-charcoal-50 text-[14px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 transition';

// ── Main component ─────────────────────────────────────────────
export const Settings = ({ onLogout, userEmail, event, onEventUpdate }: SettingsProps) => {
  const auth = useSupabaseAuth();

  const [activeModal, setActiveModal]     = useState<ModalType>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSlugWarning,   setShowSlugWarning]   = useState(false);
  const [pendingSlug,       setPendingSlug]       = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [copied, setCopied]       = useState(false);

  // Derive display values from event prop (fall back to localStorage)
  const eventName = event?.event_name || localStorage.getItem(EVENT_KEY) || 'האירוע שלי';
  const eventDateRaw = event?.event_date
    ? event.event_date.split('T')[0]
    : (localStorage.getItem(EVENT_DATE_KEY) || '');

  const [f, setF] = useState({
    email: '', password: '', confirm: '',
    event: '', eventDate: '', venue: '', venueAddr: '', desc: '', slug: '',
  });
  const [showPass,     setShowPass]    = useState(false);
  const [rawImageUrl,  setRawImageUrl] = useState<string | null>(null);
  const [croppedBlob,  setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [showCropper,  setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');
  const [ok, setOk]         = useState('');

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
  }, []);

  const open = (m: ModalType) => {
    setF({
      email: '', password: '', confirm: '',
      event:     eventName,
      eventDate: eventDateRaw,
      venue:     event?.venue_name    || '',
      venueAddr: event?.venue_address || '',
      desc:      event?.description   || '',
      slug:      event?.public_slug   || '',
    });
    setErr(''); setOk(''); setShowPass(false); setActiveModal(m);
  };
  const close = () => setActiveModal(null);

  // ── Handlers ───────────────────────────────────────────────
  const changeEmail = async () => {
    if (!f.email.includes('@')) { setErr('כתובת אימייל לא תקינה'); return; }
    try {
      setBusy(true); setErr('');
      await authService.updateEmail(f.email);
      setOk('נשלח אימייל אימות לכתובת החדשה — יש לאשר אותו');
    } catch (e: any) { setErr(e?.message || 'שגיאה בשינוי האימייל'); }
    finally { setBusy(false); }
  };

  const changePassword = async () => {
    if (f.password.length < 6) { setErr('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
    if (f.password !== f.confirm) { setErr('הסיסמאות אינן תואמות'); return; }
    try {
      setBusy(true); setErr('');
      await authService.updatePassword(f.password);
      setOk('הסיסמה שונתה בהצלחה');
    } catch (e: any) { setErr(e?.message || 'שגיאה בשינוי הסיסמה'); }
    finally { setBusy(false); }
  };

  const saveField = async (updates: Parameters<NonNullable<typeof onEventUpdate>>[0], msg: string) => {
    try {
      setBusy(true); setErr('');
      if (onEventUpdate) await onEventUpdate(updates);
      else {
        // fallback: localStorage only
        if (updates.event_name !== undefined) localStorage.setItem(EVENT_KEY, updates.event_name || '');
        if (updates.event_date !== undefined) {
          if (updates.event_date) localStorage.setItem(EVENT_DATE_KEY, updates.event_date.split('T')[0]);
          else localStorage.removeItem(EVENT_DATE_KEY);
        }
      }
      setOk(msg);
      setTimeout(close, 900);
    } catch (e: any) { setErr(e?.message || 'שגיאה בשמירה'); }
    finally { setBusy(false); }
  };

  const saveEventName = () => saveField({ event_name: f.event.trim() || 'האירוע שלי' }, 'שם האירוע עודכן');
  const saveEventDate = () => saveField({ event_date: f.eventDate || null }, f.eventDate ? 'תאריך האירוע נשמר' : 'תאריך האירוע נמחק');
  const saveVenue     = () => saveField({ venue_name: f.venue.trim() || null, venue_address: f.venueAddr.trim() || null }, 'מיקום האירוע נשמר');
  const saveDesc      = () => saveField({ description: f.desc.trim() || null }, 'תיאור נשמר');

  const resetCoverState = () => {
    setRawImageUrl(null); setCroppedBlob(null); setCroppedPreview(null); setShowCropper(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErr('קובץ לא תקין — ניתן להעלות תמונות בלבד (JPG, PNG, WEBP)');
      return;
    }
    const MAX_MB = 15;
    if (file.size > MAX_MB * 1024 * 1024) {
      setErr(`הקובץ גדול מדי — הגודל המקסימלי הוא ${MAX_MB}MB`);
      return;
    }

    setErr('');
    const reader = new FileReader();
    reader.onload = ev => {
      setRawImageUrl(ev.target?.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropDone = (blob: Blob, sizeKB: number) => {
    setCroppedBlob(blob);
    setCroppedPreview(URL.createObjectURL(blob));
    setShowCropper(false);
    setOk(`תמונה חתוכה — ${sizeKB}KB`);
  };

  const uploadCover = async () => {
    if (!croppedBlob || !event?.id || !auth.user) return;
    try {
      setBusy(true); setErr('');
      const file = new File([croppedBlob], 'cover.jpg', { type: 'image/jpeg' });
      const url  = await storageService.uploadEventCover(auth.user.id, event.id, file);
      await onEventUpdate?.({ cover_image_url: url });
      resetCoverState();
      setOk('תמונה הועלתה בהצלחה ✓');
      setTimeout(close, 1000);
    } catch (e: any) {
      setErr(e?.message?.includes('bucket') ? 'יש ליצור bucket "event-covers" ב-Supabase Storage' : (e?.message || 'שגיאה בהעלאה'));
    } finally { setBusy(false); }
  };

  const removeCover = async () => {
    if (!event?.id || !auth.user) return;
    try {
      setBusy(true); setErr('');
      await storageService.removeEventCover(auth.user.id, event.id);
      await onEventUpdate?.({ cover_image_url: null });
      resetCoverState();
      setOk('תמונה הוסרה');
      setTimeout(close, 900);
    } catch (e: any) { setErr(e?.message || 'שגיאה בהסרה'); }
    finally { setBusy(false); }
  };

  const doSaveSlug = async (slug: string) => {
    try {
      setBusy(true); setErr('');
      if (onEventUpdate) await onEventUpdate({ public_slug: slug });
      setOk('הקישור עודכן');
      setTimeout(close, 900);
    } catch (e: any) {
      const isDuplicate = e?.code === '23505' || e?.message?.includes('unique') || e?.message?.includes('duplicate');
      setErr(isDuplicate ? 'הכינוי כבר תפוס — בחר כינוי אחר' : (e?.message || 'שגיאה בשמירה'));
    } finally { setBusy(false); }
  };

  const saveSlug = () => {
    const slug = f.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!slug) { setErr('יש להזין כינוי תקין'); return; }
    // Warn if slug was already set (old links will break)
    if (event?.public_slug && event.public_slug !== slug) {
      setPendingSlug(slug);
      setShowSlugWarning(true);
      return;
    }
    doSaveSlug(slug);
  };

  const togglePublic = async () => {
    if (!onEventUpdate) return;
    // Guard: activating without a date → open the date sheet with a hint
    if (!event?.is_public && !event?.event_date) {
      open('eventDate');
      // err/ok reset in open(); set ok after to show the hint
      setTimeout(() => setOk('הוסף תאריך כדי להפעיל RSVP ציבורי'), 0);
      return;
    }
    try {
      await onEventUpdate({ is_public: !event?.is_public });
    } catch { /* silent */ }
  };

  const copyPublicLink = async () => {
    if (!event?.is_public || !event?.public_slug) {
      setErr('יש להפעיל RSVP ציבורי לפני העתקת הקישור.');
      return;
    }
    const url = eventService.buildPublicUrl(event.public_slug);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sharePublicLink = () => {
    if (!event?.is_public || !event?.public_slug) {
      setErr('יש להפעיל RSVP ציבורי לפני שיתוף הקישור.');
      return;
    }
    const url  = eventService.buildPublicUrl(event.public_slug);
    const msg  = `הוזמנת ל${eventName}! לאישור הגעה:\n${url}`;
    openWhatsAppUrl(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) { setErr('הדפדפן לא תומך בהתראות'); return; }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') setOk('התראות הופעלו בהצלחה');
    else if (perm === 'denied') setErr('ההתראות נחסמו — ניתן לשנות בהגדרות הדפדפן');
  };

  const handleDeleteAccount = async () => {
    if (!auth.user) return;
    try {
      setDeleteLoading(true);
      // Delete all guests
      await guestService.deleteAll(auth.user.id);
      // Delete the event record
      await supabase.from('events').delete().eq('owner_user_id', auth.user.id);
      await authService.signOut();
      onLogout();
    } catch {
      setShowDeleteConfirm(false);
      setActiveModal(null);
    } finally { setDeleteLoading(false); }
  };

  const email   = userEmail || auth.user?.email || '';
  const initial = email ? email[0].toUpperCase() : 'U';

  const eventDateDisplay = eventDateRaw
    ? new Date(eventDateRaw).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'לא הוגדר';

  const notifLabel =
    notifPerm === 'granted' ? 'פעיל' :
    notifPerm === 'denied'  ? 'חסום' : 'כבוי';

  const publicUrl = event?.is_public && event?.public_slug
    ? eventService.buildPublicUrl(event.public_slug)
    : null;

  const sections = [
    {
      title: 'חשבון',
      rows: [
        { icon: Mail,    label: 'שינוי אימייל',  value: email,          action: () => open('email') },
        { icon: Lock,    label: 'שינוי סיסמה',   value: '••••••••',      action: () => open('password') },
        { icon: Bell,    label: 'התראות',         value: notifLabel,     action: () => open('notifications') },
      ],
    },
    {
      title: 'פרטי האירוע',
      rows: [
        { icon: Star,        label: 'שם האירוע',    value: eventName,                     action: () => open('eventName') },
        { icon: CalendarDays,label: 'תאריך',         value: eventDateDisplay,              action: () => open('eventDate') },
        { icon: MapPin,      label: 'מיקום',         value: event?.venue_name || 'לא הוגדר', action: () => open('eventVenue') },
        { icon: ImagePlus,   label: 'תמונת שיתוף',   value: event?.cover_image_url ? 'הוגדרה ✓' : 'לא הוגדרה', action: () => open('eventCover') },
        { icon: AlignLeft,   label: 'תיאור',         value: event?.description ? event.description.substring(0, 22) + (event.description.length > 22 ? '…' : '') : 'לא הוגדר', action: () => open('eventDesc') },
        { icon: Info,        label: 'גרסה',          value: '1.0.0',                       action: null },
      ],
    },
    {
      title: 'RSVP ציבורי',
      rows: [
        { icon: event?.is_public ? ToggleRight : ToggleLeft, label: 'RSVP ציבורי', value: event?.is_public ? 'פעיל ✓' : 'כבוי', action: togglePublic, activeColor: event?.is_public ? '#10B981' : undefined },
        { icon: Link2,  label: 'קישור האירוע', value: event?.public_slug || 'לא הוגדר', action: () => open('eventSlug') },
        { icon: Share2, label: 'שיתוף',        value: null,                            action: () => open('eventShare') },
      ],
    },
    {
      title: 'מראה',
      rows: [
        { icon: Palette, label: 'ערכת צבעים',     value: 'בהיר',          action: () => open('theme') },
        { icon: Globe,   label: 'שפה',             value: 'עברית',         action: () => open('language') },
      ],
    },
    {
      title: 'תמיכה',
      rows: [
        { icon: HelpCircle, label: 'שאלות נפוצות', value: null,           action: () => open('help') },
        { icon: MessageCircle, label: 'צור קשר',   value: null,           action: () => open('contact') },
      ],
    },
    {
      title: 'משפטי',
      rows: [
        { icon: FileText, label: 'תנאי שימוש',    value: null,            action: () => open('terms') },
        { icon: Shield,   label: 'מדיניות פרטיות', value: null,           action: () => open('privacy') },
      ],
    },
  ];

  // ── Submit button ───────────────────────────────────────────
  const Btn = ({ onPress, label }: { onPress: () => void; label: string }) => (
    <button
      onClick={onPress}
      disabled={busy}
      className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[14px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform mt-1"
    >
      {busy ? 'שומר...' : label}
    </button>
  );

  // ── Status ──────────────────────────────────────────────────
  const Status = () => (
    <>
      {err && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-red-50 text-red-600 text-[13px] px-4 py-3 rounded-2xl font-medium">
          {err}
        </motion.div>
      )}
      {ok && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-green-50 text-green-700 text-[13px] px-4 py-3 rounded-2xl font-medium flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />{ok}
        </motion.div>
      )}
    </>
  );

  // ── Render ──────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-4">
      <h1 className="text-[28px] font-bold text-charcoal-900 pt-1">הגדרות</h1>

      {/* Profile card */}
      <div className="bg-white rounded-3xl p-4 flex items-center gap-4"
        style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
        <div className="w-14 h-14 rounded-2xl bg-charcoal-900 flex items-center justify-center text-xl font-bold text-gold-400 flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-charcoal-900 truncate">{email}</p>
          <p className="text-[12px] text-charcoal-400 mt-0.5">{eventName} ✦</p>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2 mr-1">
            {section.title}
          </p>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            {section.rows.map((row, idx) => (
              <button
                key={row.label}
                onClick={() => row.action?.()}
                disabled={!row.action}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors active:bg-charcoal-50/50 disabled:cursor-default ${
                  idx < section.rows.length - 1 ? 'border-b border-charcoal-100/60' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center flex-shrink-0">
                  <row.icon
                    className="w-4 h-4"
                    style={{ color: (row as any).activeColor || '#6E6862' }}
                    strokeWidth={1.8}
                  />
                </div>
                <span className="flex-1 text-[14px] font-semibold text-charcoal-900">{row.label}</span>
                {row.value && (
                  <span
                    className="text-[12px] truncate max-w-[130px]"
                    style={{ color: (row as any).activeColor || '#9CA3AF' }}
                  >{row.value}</span>
                )}
                {row.action && <ChevronLeft className="w-4 h-4 text-charcoal-300 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-charcoal-800 text-[14px] font-bold active:scale-[0.98] transition-transform"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}
      >
        <LogOut className="w-4 h-4" />
        התנתקות
      </button>

      {/* Danger */}
      <div>
        <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-2 mr-1">מסוכן</p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-200 bg-red-50 text-red-500 text-[14px] font-bold active:scale-[0.98] transition-transform"
        >
          <Trash2 className="w-4 h-4" />
          מחיקת חשבון
        </button>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}

      {/* Email */}
      <Sheet open={activeModal === 'email'} onClose={close} title="שינוי אימייל">
        <div className="space-y-4">
          <p className="text-[13px] text-charcoal-500">אימייל נוכחי: <span className="font-semibold text-charcoal-800">{email}</span></p>
          <Field label="אימייל חדש">
            <div className="relative">
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
              <input type="email" value={f.email} onChange={e => { setF(p => ({ ...p, email: e.target.value })); setErr(''); }}
                placeholder="new@example.com" dir="ltr"
                className={`${inputCls} pr-10 text-right`} />
            </div>
          </Field>
          <Status />
          <Btn onPress={changeEmail} label="שמור אימייל" />
        </div>
      </Sheet>

      {/* Password */}
      <Sheet open={activeModal === 'password'} onClose={close} title="שינוי סיסמה">
        <div className="space-y-4">
          <Field label="סיסמה חדשה">
            <div className="relative">
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
              <input type={showPass ? 'text' : 'password'} value={f.password}
                onChange={e => { setF(p => ({ ...p, password: e.target.value })); setErr(''); }}
                placeholder="לפחות 6 תווים" dir="ltr"
                className={`${inputCls} pr-10 pl-10 text-right`} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="אימות סיסמה">
            <input type={showPass ? 'text' : 'password'} value={f.confirm}
              onChange={e => { setF(p => ({ ...p, confirm: e.target.value })); setErr(''); }}
              placeholder="הזן שוב" dir="ltr"
              className={`${inputCls} text-right`} />
          </Field>
          <Status />
          <Btn onPress={changePassword} label="שמור סיסמה" />
        </div>
      </Sheet>

      {/* Notifications */}
      <Sheet open={activeModal === 'notifications'} onClose={close} title="התראות">
        <div className="space-y-4">
          <div className="bg-charcoal-50 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-charcoal-900">סטטוס</span>
            <span className={`text-[13px] font-bold px-3 py-1 rounded-full ${
              notifPerm === 'granted' ? 'bg-green-100 text-green-700' :
              notifPerm === 'denied'  ? 'bg-red-100 text-red-600' :
              'bg-charcoal-200 text-charcoal-600'
            }`}>{notifLabel}</span>
          </div>
          {notifPerm === 'denied' && (
            <p className="text-[13px] text-charcoal-500 leading-relaxed">
              ההתראות נחסמו בהגדרות הדפדפן. ניתן לשנות בהגדרות ← פרטיות ← התראות.
            </p>
          )}
          {notifPerm !== 'granted' && notifPerm !== 'denied' && (
            <>
              <p className="text-[13px] text-charcoal-500 leading-relaxed">
                אפשר התראות כדי לקבל עדכונים על אישורי הגעה חדשים.
              </p>
              <Status />
              <Btn onPress={requestNotifications} label="הפעל התראות" />
            </>
          )}
          {notifPerm === 'granted' && (
            <p className="text-[13px] text-green-700 bg-green-50 rounded-2xl px-4 py-3">
              ✓ התראות מופעלות — תקבל עדכון על כל אישור הגעה חדש.
            </p>
          )}
        </div>
      </Sheet>

      {/* Theme */}
      <Sheet open={activeModal === 'theme'} onClose={close} title="ערכת צבעים">
        <div className="space-y-3">
          {[
            { id: 'light', label: 'בהיר', desc: 'רקע לבן-שמנת עם טיפוגרפיה כהה', active: true },
            { id: 'dark',  label: 'כהה',  desc: 'מצב לילה — יגיע בקרוב',         active: false },
          ].map(t => (
            <div key={t.id}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                t.active ? 'border-charcoal-900 bg-charcoal-50' : 'border-charcoal-100 opacity-50'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.active ? 'bg-charcoal-900' : 'bg-charcoal-200'}`}>
                <Palette className={`w-5 h-5 ${t.active ? 'text-white' : 'text-charcoal-500'}`} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-charcoal-900">{t.label}</p>
                <p className="text-[12px] text-charcoal-400">{t.desc}</p>
              </div>
              {t.active && <Check className="w-5 h-5 text-charcoal-900" />}
            </div>
          ))}
        </div>
      </Sheet>

      {/* Language */}
      <Sheet open={activeModal === 'language'} onClose={close} title="שפה">
        <div className="space-y-3">
          {[
            { code: 'he', label: 'עברית', active: true },
            { code: 'en', label: 'English', active: false, soon: true },
            { code: 'ar', label: 'العربية', active: false, soon: true },
          ].map(l => (
            <div key={l.code}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                l.active ? 'border-charcoal-900 bg-charcoal-50' : 'border-charcoal-100 opacity-50'
              }`}>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-charcoal-900">{l.label}</p>
                {l.soon && <p className="text-[11px] text-charcoal-400">בקרוב</p>}
              </div>
              {l.active && <Check className="w-5 h-5 text-charcoal-900" />}
            </div>
          ))}
        </div>
      </Sheet>

      {/* Event name */}
      <Sheet open={activeModal === 'eventName'} onClose={close} title="שם האירוע">
        <div className="space-y-4">
          <Field label="שם האירוע">
            <input value={f.event} onChange={e => { setF(p => ({ ...p, event: e.target.value })); setErr(''); }}
              placeholder="לדוגמה: חתונת שרה ודוד"
              className={inputCls} />
          </Field>
          <p className="text-[12px] text-charcoal-400">שם זה מוצג בכרטיסיית ההגדרות ובקישורי RSVP.</p>
          <Status />
          <Btn onPress={saveEventName} label="שמור שם" />
        </div>
      </Sheet>

      {/* Help */}
      <Sheet open={activeModal === 'help'} onClose={close} title="שאלות נפוצות">
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {[
            { q: 'איך מוסיפים מוזמן?', a: 'לחצ/י על כפתור + בכל מסך, מלא/י את הפרטים ולחצ/י "שמור מוזמן".' },
            { q: 'מה זה קישור RSVP?', a: 'קישור אישי לכל מוזמן שמאפשר לו לאשר הגעה בלחיצה אחת, ללא צורך בהתחברות.' },
            { q: 'איך שולחים קישור RSVP?', a: 'פתח/י את פרטי המוזמן → לחצ/י על "וואטסאפ" — ישלח הודעה עם הקישור האישי. אפשר גם להעתיק קישור ולשלוח ידנית.' },
            { q: 'האם ניתן לשנות סטטוס מוזמן?', a: 'כן — לחצ/י על המוזמן → "עריכה" ושנה/י את סטטוס ההגעה.' },
            { q: 'מה ההבדל בין "מלווים" לבין "סך אנשים"?', a: 'מלווים הם אנשים נוספים שבאים יחד עם המוזמן. "סך אנשים" כולל את המוזמן עצמו + המלווים.' },
            { q: 'האם אפשר לייצא את רשימת המוזמנים?', a: 'פיצ\'ר ייצוא לאקסל יתווסף בגרסה הבאה.' },
          ].map(({ q, a }) => (
            <div key={q} className="bg-charcoal-50 rounded-2xl p-4">
              <p className="text-[13px] font-bold text-charcoal-900 mb-1">{q}</p>
              <p className="text-[12px] text-charcoal-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </Sheet>

      {/* Contact */}
      <Sheet open={activeModal === 'contact'} onClose={close} title="צור קשר">
        <div className="space-y-3">
          <p className="text-[13px] text-charcoal-500 leading-relaxed">
            נשמח לעזור! ניתן לפנות אלינו בכל אחת מהדרכים הבאות:
          </p>
          <button
            onClick={() => openWhatsAppUrl('https://wa.me/?text=שלום%2C%20אני%20צריך%20עזרה%20עם%20Luma%20Guests')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-right">
              <p className="text-[14px] font-bold text-charcoal-900">WhatsApp</p>
              <p className="text-[12px] text-charcoal-500">תגובה תוך שעה</p>
            </div>
          </button>
          <button
            onClick={() => window.location.href = 'mailto:support@lumaguests.app?subject=תמיכה - Luma Guests'}
            className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform"
            style={{ background: 'rgba(96,165,250,0.1)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-400 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="text-right">
              <p className="text-[14px] font-bold text-charcoal-900">אימייל</p>
              <p className="text-[12px] text-charcoal-500">support@lumaguests.app</p>
            </div>
          </button>
        </div>
      </Sheet>

      {/* Terms */}
      <Sheet open={activeModal === 'terms'} onClose={close} title="תנאי שימוש">
        <div className="space-y-3 max-h-72 overflow-y-auto text-[13px] text-charcoal-600 leading-relaxed">
          <p className="font-bold text-charcoal-900">1. קבלת התנאים</p>
          <p>השימוש ב-Luma Guests מהווה הסכמה לתנאים אלה. אם אינך מסכים, אנא הפסק את השימוש.</p>
          <p className="font-bold text-charcoal-900">2. השירות</p>
          <p>Luma Guests מספקת פלטפורמה לניהול רשימות מוזמנים לאירועים. אנו שומרים על הזכות לשנות, להשעות או להפסיק את השירות בכל עת.</p>
          <p className="font-bold text-charcoal-900">3. חשבון משתמש</p>
          <p>אחריות לשמירת פרטי ההתחברות חלה עליך. אנא הודע לנו מיידית על כל שימוש בלתי מורשה.</p>
          <p className="font-bold text-charcoal-900">4. תוכן</p>
          <p>אתה אחראי לכל התוכן שאתה מזין לאפליקציה. אסור להכניס מידע מטעה, פוגעני או בלתי חוקי.</p>
          <p className="font-bold text-charcoal-900">5. פרטיות</p>
          <p>אנו מתייחסים לפרטיות שלך ברצינות. ראה מדיניות הפרטיות לפרטים מלאים.</p>
          <p className="font-bold text-charcoal-900">6. הגבלת אחריות</p>
          <p>השירות ניתן "כפי שהוא". אנו לא נישא באחריות לנזקים ישירים או עקיפים הנובעים מהשימוש.</p>
          <p className="text-charcoal-400 text-[11px] pt-2">עודכן לאחרונה: יוני 2026</p>
        </div>
      </Sheet>

      {/* Privacy */}
      <Sheet open={activeModal === 'privacy'} onClose={close} title="מדיניות פרטיות">
        <div className="space-y-3 max-h-72 overflow-y-auto text-[13px] text-charcoal-600 leading-relaxed">
          <p className="font-bold text-charcoal-900">מה אנו אוספים</p>
          <p>אנו אוספים: כתובת אימייל, נתוני מוזמנים שהוכנסו על ידך (שם, טלפון, סטטוס RSVP).</p>
          <p className="font-bold text-charcoal-900">איך אנו משתמשים במידע</p>
          <p>המידע משמש אך ורק למתן השירות — הצגת נתוני האירוע שלך. אנו לא מוכרים מידע לצדדים שלישיים.</p>
          <p className="font-bold text-charcoal-900">אחסון מידע</p>
          <p>הנתונים מאוחסנים בשרתי Supabase (AWS) באיחוד האירופי, עם הצפנה מלאה בעת מנוחה ובעת העברה.</p>
          <p className="font-bold text-charcoal-900">זכויות שלך</p>
          <p>יש לך זכות לגשת לנתוניך, לתקן אותם, ולמחוק אותם בכל עת דרך הגדרות החשבון.</p>
          <p className="font-bold text-charcoal-900">עוגיות</p>
          <p>אנו משתמשים בעוגיות הכרחיות בלבד לצורכי אימות.</p>
          <p className="font-bold text-charcoal-900">יצירת קשר</p>
          <p>לשאלות בנוגע לפרטיות: support@lumaguests.app</p>
          <p className="text-charcoal-400 text-[11px] pt-2">עודכן לאחרונה: יוני 2026</p>
        </div>
      </Sheet>

      {/* Event date */}
      <Sheet open={activeModal === 'eventDate'} onClose={close} title="תאריך האירוע">
        <div className="space-y-4">
          <Field label="תאריך האירוע">
            <input
              type="date"
              value={f.eventDate}
              onChange={e => { setF(p => ({ ...p, eventDate: e.target.value })); setErr(''); }}
              className={inputCls}
            />
          </Field>
          <p className="text-[12px] text-charcoal-400 leading-relaxed">
            התאריך ישמש לספירה לאחור בדשבורד. השאר ריק כדי למחוק.
          </p>
          <Status />
          <Btn onPress={saveEventDate} label="שמור תאריך" />
        </div>
      </Sheet>

      {/* Venue */}
      <Sheet open={activeModal === 'eventVenue'} onClose={close} title="מיקום האירוע">
        <div className="space-y-4">
          <Field label="שם המקום">
            <input value={f.venue} onChange={e => { setF(p => ({ ...p, venue: e.target.value })); setErr(''); }}
              placeholder="לדוגמה: אולמי הגן" className={inputCls} />
          </Field>
          <Field label="כתובת">
            <input value={f.venueAddr} onChange={e => { setF(p => ({ ...p, venueAddr: e.target.value })); setErr(''); }}
              placeholder="לדוגמה: רחוב הפרחים 5, תל אביב" className={inputCls} />
          </Field>
          <Status />
          <Btn onPress={saveVenue} label="שמור מיקום" />
        </div>
      </Sheet>

      {/* Description */}
      <Sheet open={activeModal === 'eventDesc'} onClose={close} title="תיאור האירוע">
        <div className="space-y-4">
          <Field label="תיאור">
            <textarea value={f.desc}
              onChange={e => { setF(p => ({ ...p, desc: e.target.value })); setErr(''); }}
              placeholder="תיאור קצר שיופיע בדף ה-RSVP הציבורי..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <p className="text-[12px] text-charcoal-400">יוצג לאורחים בדף ה-RSVP הציבורי.</p>
          <Status />
          <Btn onPress={saveDesc} label="שמור תיאור" />
        </div>
      </Sheet>

      {/* Slug / Public link */}
      <Sheet open={activeModal === 'eventSlug'} onClose={close} title="קישור האירוע">
        <div className="space-y-4">
          <Field label="כינוי (באנגלית בלבד)">
            <div className="flex items-center bg-charcoal-50 rounded-2xl overflow-hidden">
              <span className="text-[12px] text-charcoal-400 px-3 flex-shrink-0 border-l border-charcoal-200 py-3.5 leading-none" dir="ltr">
                /event/
              </span>
              <input value={f.slug}
                onChange={e => { setF(p => ({ ...p, slug: e.target.value })); setErr(''); }}
                placeholder="dan-and-maya"
                dir="ltr"
                className="flex-1 px-3 py-3.5 bg-transparent text-[14px] text-charcoal-900 focus:outline-none"
              />
            </div>
          </Field>
          <p className="text-[12px] text-charcoal-400 leading-relaxed">
            באנגלית, מספרים ומקפים בלבד. לדוגמה: <span className="font-mono text-charcoal-600">dan-and-maya</span>
          </p>
          <Status />
          <Btn onPress={saveSlug} label="שמור קישור" />
        </div>
      </Sheet>

      {/* Share */}
      <Sheet open={activeModal === 'eventShare'} onClose={close} title="שיתוף האירוע">
        <div className="space-y-4">
          {!event?.is_public ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-[13px] text-amber-800 font-semibold mb-1">RSVP ציבורי כבוי</p>
              <p className="text-[12px] text-amber-700 leading-relaxed">
                הפעל את RSVP ציבורי מהגדרות האירוע כדי לאפשר לאורחים להירשם.
              </p>
            </div>
          ) : (
            <>
              {publicUrl && (
                <div className="bg-charcoal-50 rounded-2xl p-3 flex items-center gap-2">
                  <p className="flex-1 text-[12px] text-charcoal-600 font-mono truncate" dir="ltr">{publicUrl}</p>
                  <button onClick={copyPublicLink}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-charcoal-900 text-white text-[11px] font-bold flex-shrink-0 active:scale-95 transition-transform">
                    {copied ? '✓' : <Link2 className="w-3 h-3" />}
                    {copied ? 'הועתק' : 'העתק'}
                  </button>
                </div>
              )}

              <button
                onClick={sharePublicLink}
                className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform"
                style={{ background: 'rgba(16,185,129,0.1)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-charcoal-900">שתף ב-WhatsApp</p>
                  <p className="text-[12px] text-charcoal-500">שלח קישור לכל הקבוצות</p>
                </div>
              </button>
            </>
          )}
        </div>
      </Sheet>

      {/* Cover image */}
      <Sheet open={activeModal === 'eventCover'} onClose={() => { close(); resetCoverState(); }} title="תמונת שיתוף">
        <div className="space-y-4">
          <p className="text-[12px] text-charcoal-400 leading-relaxed">
            תמונה זו תוצג כ-preview בהודעות וואטסאפ כשתשלח קישור RSVP לאורחים. יחס 16:9, עד 15MB.
          </p>

          {/* Current or cropped preview */}
          {(croppedPreview || event?.cover_image_url) && (
            <div className="rounded-2xl overflow-hidden bg-charcoal-100" style={{ aspectRatio: '16/9' }}>
              <img
                src={croppedPreview || event?.cover_image_url || ''}
                alt="תמונת האירוע"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* File picker */}
          <label className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-dashed border-charcoal-200 cursor-pointer active:bg-charcoal-50 transition-colors">
            <ImagePlus className="w-5 h-5 text-charcoal-400" />
            <span className="text-[14px] font-semibold text-charcoal-600">
              {croppedBlob ? 'בחר תמונה אחרת' : 'בחר תמונה מהגלריה'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>

          <Status />

          {croppedBlob && (
            <Btn onPress={uploadCover} label="העלה תמונה" />
          )}

          {!croppedBlob && event?.cover_image_url && (
            <button
              onClick={removeCover}
              disabled={busy}
              className="w-full py-3 rounded-2xl text-[13px] font-semibold text-red-500 active:bg-red-50 transition-colors"
            >
              {busy ? 'מסיר...' : 'הסר תמונה'}
            </button>
          )}
        </div>
      </Sheet>

      {/* Cropper — full screen, rendered via portal inside ImageCropModal */}
      {showCropper && rawImageUrl && (
        <ImageCropModal
          imageSrc={rawImageUrl}
          onDone={handleCropDone}
          onCancel={() => { setShowCropper(false); setRawImageUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        />
      )}

      {/* Slug change warning */}
      {createPortal(
        <AnimatePresence>
          {showSlugWarning && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center p-4"
              style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => setShowSlugWarning(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-[430px] rounded-t-3xl p-6"
                style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}
                dir="rtl"
              >
                <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-5" />
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-[18px] font-bold text-charcoal-900 text-center mb-2">שינוי כינוי ישבור קישורים</h3>
                <p className="text-[13px] text-charcoal-500 text-center leading-relaxed mb-6">
                  קישורים ציבוריים שכבר שלחת לאורחים יפסיקו לעבוד.<br />
                  הכינוי הישן: <span className="font-mono font-bold text-charcoal-800">{event?.public_slug}</span>
                </p>
                <div className="space-y-2.5">
                  <button
                    onClick={() => { setShowSlugWarning(false); doSaveSlug(pendingSlug); }}
                    disabled={busy}
                    className="w-full py-4 rounded-2xl bg-amber-500 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    {busy ? 'שומר...' : 'כן, שנה את הכינוי'}
                  </button>
                  <button
                    onClick={() => setShowSlugWarning(false)}
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

      {/* Delete confirm modal — Portal to escape transform stacking context */}
      {createPortal(
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4"
              style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-[430px] rounded-t-3xl p-6"
                style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}
              >
                <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-5" />
                <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-[20px] font-bold text-charcoal-900 text-center mb-2">מחיקת כל הנתונים</h3>
                <p className="text-[14px] text-charcoal-500 text-center leading-relaxed mb-6">
                  פעולה זו תמחק לצמיתות את <strong>כל המוזמנים ופרטי האירוע</strong> שלך.
                  לא ניתן לשחזר את הנתונים לאחר המחיקה.
                </p>
                <div className="space-y-2.5">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="w-full py-4 rounded-2xl bg-red-500 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    {deleteLoading ? 'מוחק...' : 'כן, מחק את כל הנתונים'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
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
