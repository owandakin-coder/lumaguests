import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, Palette, HelpCircle, FileText,
  LogOut, ChevronLeft, Trash2, Info, Bell, Globe, Star
} from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface SettingsProps {
  onLogout: () => void;
  userEmail?: string;
}

export const Settings = ({ onLogout, userEmail }: SettingsProps) => {
  const auth = useSupabaseAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState('');

  const email    = userEmail || auth.user?.email || '';
  const initial  = email ? email[0].toUpperCase() : 'U';

  const toast = (label: string) => {
    setShowComingSoon(label);
    setTimeout(() => setShowComingSoon(''), 2000);
  };

  const sections = [
    {
      title: 'חשבון',
      rows: [
        { icon: User,       label: 'אימייל',      value: email,     action: () => toast('עריכת אימייל') },
        { icon: Shield,     label: 'סיסמה',        value: '••••••••', action: () => toast('שינוי סיסמה') },
        { icon: Bell,       label: 'התראות',       value: 'פעיל',    action: () => toast('הגדרות התראות') },
      ],
    },
    {
      title: 'מראה',
      rows: [
        { icon: Palette,    label: 'ערכת צבעים',  value: 'בהיר',    action: () => toast('ערכת צבעים') },
        { icon: Globe,      label: 'שפה',          value: 'עברית',   action: () => toast('שינוי שפה') },
      ],
    },
    {
      title: 'אירוע',
      rows: [
        { icon: Star,       label: 'שם האירוע',   value: 'האירוע שלי', action: () => toast('שם האירוע') },
        { icon: Info,       label: 'גרסה',         value: '1.0.0',    action: null },
      ],
    },
    {
      title: 'תמיכה',
      rows: [
        { icon: HelpCircle, label: 'מרכז עזרה',   value: null, action: () => toast('מרכז עזרה') },
        { icon: FileText,   label: 'צור קשר',      value: null, action: () => toast('צור קשר') },
      ],
    },
    {
      title: 'משפטי',
      rows: [
        { icon: FileText,   label: 'תנאי שימוש',         value: null, action: () => toast('תנאי שימוש') },
        { icon: Shield,     label: 'מדיניות פרטיות',     value: null, action: () => toast('מדיניות פרטיות') },
      ],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-4">
      <h1 className="text-[28px] font-bold text-charcoal-900 pt-1">הגדרות</h1>

      {/* Profile card */}
      <div
        className="bg-white rounded-3xl p-4 flex items-center gap-4"
        style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
      >
        <div className="w-14 h-14 rounded-2xl bg-charcoal-900 flex items-center justify-center text-xl font-bold text-gold-400 flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-charcoal-900 truncate">{email}</p>
          <p className="text-[12px] text-charcoal-400 mt-0.5">חשבון פרמיום ✦</p>
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
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors active:bg-charcoal-50/50 ${
                  idx < section.rows.length - 1 ? 'border-b border-charcoal-100/60' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center flex-shrink-0">
                  <row.icon className="w-4 h-4 text-charcoal-500" strokeWidth={1.8} />
                </div>
                <span className="flex-1 text-[14px] font-semibold text-charcoal-900">{row.label}</span>
                {row.value && (
                  <span className="text-[12px] text-charcoal-400 truncate max-w-[120px]">{row.value}</span>
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

      {/* Danger zone */}
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

      {/* Delete confirm modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-[18px] font-bold text-charcoal-900 text-center mb-2">מחיקת חשבון</h3>
              <p className="text-[13px] text-charcoal-500 text-center mb-6 leading-relaxed">
                פעולה זו תמחק את החשבון ואת כל נתוני המוזמנים לצמיתות. לא ניתן לשחזר.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold text-[14px] active:scale-[0.98] transition-transform"
                >
                  כן, מחק את החשבון
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-3.5 rounded-2xl bg-charcoal-100 text-charcoal-700 font-bold text-[14px] active:scale-[0.98] transition-transform"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coming soon toast */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-charcoal-900 text-white text-[13px] font-semibold px-5 py-3 rounded-2xl z-50 whitespace-nowrap"
          >
            {showComingSoon} — בקרוב ✦
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
