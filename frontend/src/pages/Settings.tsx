import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  FileText,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Palette,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { authService, guestService, openWhatsAppUrl, supabase } from '../services/supabase';
import { Event } from '../types';

interface SettingsProps {
  onLogout: () => void;
  userEmail?: string;
  event?: Event | null;
  onOpenEventManager?: () => void;
}

type ModalType =
  | 'email'
  | 'password'
  | 'notifications'
  | 'theme'
  | 'language'
  | 'help'
  | 'contact'
  | 'terms'
  | 'privacy'
  | null;

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

type FieldProps = {
  label: string;
  children: ReactNode;
};

type RowItem = {
  icon: typeof Mail;
  label: string;
  value?: string | null;
  action: () => void;
};

const inputCls =
  'w-full px-4 py-3.5 rounded-2xl bg-charcoal-50 text-[14px] text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-charcoal-200 transition';

const Sheet = ({ open, onClose, title, children }: SheetProps) =>
  createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-[430px] rounded-t-3xl p-6 overflow-y-auto"
            style={{ maxHeight: '85dvh', paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}
          >
            <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-charcoal-900">{title}</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-charcoal-100 flex items-center justify-center active:scale-90 transition-transform"
              >
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

const Field = ({ label, children }: FieldProps) => (
  <div className="space-y-1.5">
    <p className="text-[12px] font-bold text-charcoal-400 uppercase tracking-wide">{label}</p>
    {children}
  </div>
);

export const Settings = ({
  onLogout,
  userEmail,
  event,
  onOpenEventManager,
}: SettingsProps) => {
  const auth = useSupabaseAuth();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
  });

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const open = (modal: ModalType) => {
    setForm({ email: '', password: '', confirm: '' });
    setErr('');
    setOk('');
    setShowPass(false);
    setActiveModal(modal);
  };

  const close = () => setActiveModal(null);

  const changeEmail = async () => {
    if (!form.email.includes('@')) {
      setErr('כתובת האימייל אינה תקינה');
      return;
    }

    try {
      setBusy(true);
      setErr('');
      await authService.updateEmail(form.email);
      setOk('שלחנו מייל אימות לכתובת החדשה. יש לאשר אותו כדי להשלים את העדכון.');
    } catch (e: any) {
      setErr(e?.message || 'לא הצלחנו לעדכן את האימייל');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (form.password.length < 6) {
      setErr('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (form.password !== form.confirm) {
      setErr('הסיסמאות אינן תואמות');
      return;
    }

    try {
      setBusy(true);
      setErr('');
      await authService.updatePassword(form.password);
      setOk('הסיסמה עודכנה בהצלחה');
    } catch (e: any) {
      setErr(e?.message || 'לא הצלחנו לעדכן את הסיסמה');
    } finally {
      setBusy(false);
    }
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setErr('הדפדפן הזה לא תומך בהתראות');
      return;
    }

    const perm = await Notification.requestPermission();
    setNotifPerm(perm);

    if (perm === 'granted') {
      setOk('ההתראות הופעלו בהצלחה');
      setErr('');
    } else if (perm === 'denied') {
      setErr('ההתראות נחסמו. אפשר לשנות זאת בהגדרות המכשיר או הדפדפן.');
      setOk('');
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.user) return;

    try {
      setDeleteLoading(true);
      await guestService.deleteAll(auth.user.id);
      await supabase.from('events').delete().eq('owner_user_id', auth.user.id);
      await authService.signOut();
      onLogout();
    } catch {
      setShowDeleteConfirm(false);
      setActiveModal(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const email = userEmail || auth.user?.email || '';
  const initial = email ? email[0].toUpperCase() : 'L';
  const eventName = event?.event_name || 'האירוע שלי';
  const eventMeta = [
    event?.event_date ? new Date(event.event_date).toLocaleDateString('he-IL') : null,
    event?.venue_name || null,
  ]
    .filter(Boolean)
    .join(' · ');

  const notifLabel =
    notifPerm === 'granted' ? 'פעיל' : notifPerm === 'denied' ? 'חסום' : 'כבוי';

  const sections: Array<{ title: string; rows: RowItem[] }> = [
    {
      title: 'חשבון',
      rows: [
        { icon: Mail, label: 'שינוי אימייל', value: email, action: () => open('email') },
        { icon: Lock, label: 'שינוי סיסמה', value: '••••••••', action: () => open('password') },
        { icon: Bell, label: 'התראות', value: notifLabel, action: () => open('notifications') },
      ],
    },
    {
      title: 'מראה',
      rows: [
        { icon: Palette, label: 'ערכת צבעים', value: 'בהיר', action: () => open('theme') },
        { icon: Globe, label: 'שפה', value: 'עברית', action: () => open('language') },
      ],
    },
    {
      title: 'תמיכה',
      rows: [
        { icon: HelpCircle, label: 'שאלות נפוצות', action: () => open('help') },
        { icon: MessageCircle, label: 'צור קשר', action: () => open('contact') },
      ],
    },
    {
      title: 'משפטי',
      rows: [
        { icon: FileText, label: 'תנאי שימוש', action: () => open('terms') },
        { icon: Shield, label: 'מדיניות פרטיות', action: () => open('privacy') },
      ],
    },
  ];

  const Status = () => (
    <>
      {err && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 text-red-600 text-[13px] px-4 py-3 rounded-2xl font-medium"
        >
          {err}
        </motion.div>
      )}
      {ok && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-green-50 text-green-700 text-[13px] px-4 py-3 rounded-2xl font-medium flex items-center gap-2"
        >
          <Check className="w-4 h-4 flex-shrink-0" />
          {ok}
        </motion.div>
      )}
    </>
  );

  const Btn = ({ onPress, label }: { onPress: () => void; label: string }) => (
    <button
      onClick={onPress}
      disabled={busy}
      className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[14px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform mt-1"
    >
      {busy ? 'שומר...' : label}
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-4">
      <h1 className="text-[28px] font-bold text-charcoal-900 pt-1">הגדרות</h1>

      <div
        className="bg-white rounded-3xl p-4 flex items-center gap-4"
        style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
      >
        <div className="w-14 h-14 rounded-2xl bg-charcoal-900 flex items-center justify-center text-xl font-bold text-gold-400 flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-charcoal-900 truncate">{email}</p>
          <p className="text-[12px] text-charcoal-400 mt-0.5">{eventName}</p>
        </div>
      </div>

      <button
        onClick={() => onOpenEventManager?.()}
        disabled={!onOpenEventManager}
        className="w-full bg-white rounded-3xl p-4 text-right active:scale-[0.99] transition-transform disabled:opacity-60"
        style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-charcoal-900/6 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-charcoal-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-charcoal-900">ניהול אירוע</p>
            <p className="text-[12px] text-charcoal-400 mt-0.5">{eventName}</p>
            <p className="text-[12px] text-charcoal-400">
              {eventMeta || 'עריכת פרטי אירוע, תמונת אירוע וקישור RSVP'}
            </p>
          </div>
          <ChevronLeft className="w-4 h-4 text-charcoal-300 flex-shrink-0" />
        </div>
      </button>

      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest mb-2 mr-1">
            {section.title}
          </p>
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}
          >
            {section.rows.map((row, idx) => (
              <button
                key={row.label}
                onClick={row.action}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors active:bg-charcoal-50/50 ${
                  idx < section.rows.length - 1 ? 'border-b border-charcoal-100/60' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center flex-shrink-0">
                  <row.icon className="w-4 h-4 text-charcoal-500" strokeWidth={1.8} />
                </div>
                <span className="flex-1 text-[14px] font-semibold text-charcoal-900">
                  {row.label}
                </span>
                {row.value ? (
                  <span className="text-[12px] truncate max-w-[130px] text-charcoal-400">
                    {row.value}
                  </span>
                ) : null}
                <ChevronLeft className="w-4 h-4 text-charcoal-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-charcoal-800 text-[14px] font-bold active:scale-[0.98] transition-transform"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}
      >
        <LogOut className="w-4 h-4" />
        התנתקות
      </button>

      <div>
        <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-2 mr-1">
          מסוכן
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-200 bg-red-50 text-red-500 text-[14px] font-bold active:scale-[0.98] transition-transform"
        >
          <Trash2 className="w-4 h-4" />
          מחיקת חשבון
        </button>
      </div>

      <Sheet open={activeModal === 'email'} onClose={close} title="שינוי אימייל">
        <div className="space-y-4">
          <p className="text-[13px] text-charcoal-500">
            אימייל נוכחי: <span className="font-semibold text-charcoal-800">{email}</span>
          </p>
          <Field label="אימייל חדש">
            <div className="relative">
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm((p) => ({ ...p, email: e.target.value }));
                  setErr('');
                }}
                placeholder="new@example.com"
                dir="ltr"
                className={`${inputCls} pr-10 text-right`}
              />
            </div>
          </Field>
          <Status />
          <Btn onPress={changeEmail} label="שמור אימייל" />
        </div>
      </Sheet>

      <Sheet open={activeModal === 'password'} onClose={close} title="שינוי סיסמה">
        <div className="space-y-4">
          <Field label="סיסמה חדשה">
            <div className="relative">
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => {
                  setForm((p) => ({ ...p, password: e.target.value }));
                  setErr('');
                }}
                placeholder="לפחות 6 תווים"
                dir="ltr"
                className={`${inputCls} pr-10 pl-10 text-right`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="אימות סיסמה">
            <input
              type={showPass ? 'text' : 'password'}
              value={form.confirm}
              onChange={(e) => {
                setForm((p) => ({ ...p, confirm: e.target.value }));
                setErr('');
              }}
              placeholder="הזן שוב"
              dir="ltr"
              className={`${inputCls} text-right`}
            />
          </Field>
          <Status />
          <Btn onPress={changePassword} label="שמור סיסמה" />
        </div>
      </Sheet>

      <Sheet open={activeModal === 'notifications'} onClose={close} title="התראות">
        <div className="space-y-4">
          <div className="bg-charcoal-50 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-charcoal-900">סטטוס</span>
            <span
              className={`text-[13px] font-bold px-3 py-1 rounded-full ${
                notifPerm === 'granted'
                  ? 'bg-green-100 text-green-700'
                  : notifPerm === 'denied'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-charcoal-200 text-charcoal-600'
              }`}
            >
              {notifLabel}
            </span>
          </div>

          {notifPerm !== 'granted' ? (
            <>
              <p className="text-[13px] text-charcoal-500 leading-relaxed">
                אפשר להפעיל התראות כדי לקבל עדכונים על אישורי הגעה חדשים.
              </p>
              <Status />
              <Btn onPress={requestNotifications} label="הפעל התראות" />
            </>
          ) : (
            <p className="text-[13px] text-green-700 bg-green-50 rounded-2xl px-4 py-3">
              ההתראות פעילות ותקבל עדכונים על אישורי הגעה חדשים.
            </p>
          )}
        </div>
      </Sheet>

      <Sheet open={activeModal === 'theme'} onClose={close} title="ערכת צבעים">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-charcoal-900 bg-charcoal-50">
            <div className="w-10 h-10 rounded-xl bg-charcoal-900 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-charcoal-900">בהיר</p>
              <p className="text-[12px] text-charcoal-400">ערכת ברירת המחדל של המערכת</p>
            </div>
            <Check className="w-5 h-5 text-charcoal-900" />
          </div>
        </div>
      </Sheet>

      <Sheet open={activeModal === 'language'} onClose={close} title="שפה">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-charcoal-900 bg-charcoal-50">
            <div className="flex-1">
              <p className="text-[14px] font-bold text-charcoal-900">עברית</p>
              <p className="text-[12px] text-charcoal-400">שפת הממשק הפעילה</p>
            </div>
            <Check className="w-5 h-5 text-charcoal-900" />
          </div>
        </div>
      </Sheet>

      <Sheet open={activeModal === 'help'} onClose={close} title="שאלות נפוצות">
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {[
            ['איך מוסיפים מוזמן?', 'לוחצים על הוספת מוזמן, ממלאים את הפרטים ושומרים.'],
            ['איך שולחים בקשת אישור הגעה?', 'פותחים את בחירת המוזמנים ואז את כפתור השליחה בוואטסאפ.'],
            ['איפה עורכים את האירוע?', 'דרך כרטיס ניהול אירוע בחלק העליון של מסך ההגדרות.'],
          ].map(([q, a]) => (
            <div key={q} className="bg-charcoal-50 rounded-2xl p-4">
              <p className="text-[13px] font-bold text-charcoal-900 mb-1">{q}</p>
              <p className="text-[12px] text-charcoal-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={activeModal === 'contact'} onClose={close} title="צור קשר">
        <div className="space-y-3">
          <p className="text-[13px] text-charcoal-500 leading-relaxed">
            אפשר לפנות אלינו דרך אחת מהאפשרויות הבאות:
          </p>
          <button
            onClick={() =>
              openWhatsAppUrl(
                'https://wa.me/?text=' +
                  encodeURIComponent('שלום, אני צריך עזרה עם Luma Guests')
              )
            }
            className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-right">
              <p className="text-[14px] font-bold text-charcoal-900">WhatsApp</p>
              <p className="text-[12px] text-charcoal-500">מענה מהיר</p>
            </div>
          </button>
          <button
            onClick={() => {
              window.location.href =
                'mailto:support@lumaguests.app?subject=' +
                encodeURIComponent('תמיכה - Luma Guests');
            }}
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

      <Sheet open={activeModal === 'terms'} onClose={close} title="תנאי שימוש">
        <div className="space-y-3 max-h-72 overflow-y-auto text-[13px] text-charcoal-600 leading-relaxed">
          <p className="font-bold text-charcoal-900">1. שימוש באפליקציה</p>
          <p>
            Luma Guests מיועדת לניהול אירועים, מוזמנים ואישורי הגעה. אין להשתמש בה
            לרעה או לשלוח תוכן מטעה.
          </p>
          <p className="font-bold text-charcoal-900">2. אחריות משתמש</p>
          <p>
            המשתמש אחראי על המידע שהוא מזין, על ההודעות שהוא שולח ועל שמירת פרטי
            הגישה לחשבון שלו.
          </p>
          <p className="font-bold text-charcoal-900">3. זמינות השירות</p>
          <p>
            אנו עושים מאמץ לשמור על זמינות גבוהה, אך ייתכנו עדכונים, תחזוקה או
            תקלות זמניות.
          </p>
        </div>
      </Sheet>

      <Sheet open={activeModal === 'privacy'} onClose={close} title="מדיניות פרטיות">
        <div className="space-y-3 max-h-72 overflow-y-auto text-[13px] text-charcoal-600 leading-relaxed">
          <p className="font-bold text-charcoal-900">איזה מידע נשמר</p>
          <p>המערכת שומרת את פרטי החשבון שלך ואת פרטי האירועים והמוזמנים שהזנת.</p>
          <p className="font-bold text-charcoal-900">מטרת השימוש</p>
          <p>המידע משמש רק להפעלת המערכת, ניהול האירועים ושליחת קישורי RSVP.</p>
          <p className="font-bold text-charcoal-900">יצירת קשר</p>
          <p>לשאלות בנושא פרטיות אפשר לפנות לכתובת support@lumaguests.app.</p>
        </div>
      </Sheet>

      {createPortal(
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4"
              style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[430px] rounded-t-3xl p-6"
                style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}
              >
                <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-5" />
                <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-[20px] font-bold text-charcoal-900 text-center mb-2">
                  מחיקת כל הנתונים
                </h3>
                <p className="text-[14px] text-charcoal-500 text-center leading-relaxed mb-6">
                  פעולה זו תמחק לצמיתות את כל המוזמנים, האירועים ופרטי החשבון שלך.
                </p>
                <div className="space-y-2.5">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="w-full py-4 rounded-2xl bg-red-500 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    {deleteLoading ? 'מוחק...' : 'כן, מחק את החשבון'}
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
