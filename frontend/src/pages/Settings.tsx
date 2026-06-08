import { motion } from 'framer-motion';
import { User, Shield, Palette, HelpCircle, FileText, LogOut, ChevronLeft, Trash2, Info } from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface SettingsProps {
  onLogout: () => void;
  userEmail?: string;
}

interface SettingRow {
  icon: React.ElementType;
  label: string;
  value?: string;
  danger?: boolean;
}

interface SettingSection {
  title: string;
  icon: React.ElementType;
  rows: SettingRow[];
}

export const Settings = ({ onLogout, userEmail }: SettingsProps) => {
  const auth = useSupabaseAuth();
  const email = userEmail || auth.user?.email || '';
  const initials = email ? email[0].toUpperCase() : 'U';

  const sections: SettingSection[] = [
    {
      title: 'חשבון',
      icon: User,
      rows: [
        { icon: User,   label: 'אימייל',   value: email     },
        { icon: Shield, label: 'סיסמה',    value: '••••••••' },
      ],
    },
    {
      title: 'מראה',
      icon: Palette,
      rows: [
        { icon: Palette, label: 'ערכת צבעים', value: 'בהיר' },
        { icon: Info,    label: 'גרסה',        value: '1.0.0' },
      ],
    },
    {
      title: 'תמיכה',
      icon: HelpCircle,
      rows: [
        { icon: HelpCircle, label: 'מרכז עזרה'      },
        { icon: FileText,   label: 'צור קשר'         },
      ],
    },
    {
      title: 'משפטי',
      icon: FileText,
      rows: [
        { icon: FileText, label: 'תנאי שימוש'      },
        { icon: Shield,   label: 'מדיניות פרטיות'  },
      ],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <h1 className="text-[28px] font-bold text-charcoal-900">הגדרות</h1>

      {/* Profile card */}
      <div className="bg-white rounded-3xl p-5 flex items-center gap-4" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="w-14 h-14 rounded-2xl bg-charcoal-900 flex items-center justify-center text-xl font-bold text-gold-400 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-charcoal-900 truncate">{email || 'משתמש'}</p>
          <p className="text-xs text-charcoal-400 mt-0.5">חשבון פרמיום</p>
        </div>
      </div>

      {/* Setting sections */}
      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-xs font-semibold text-charcoal-400 mb-2 mr-1 uppercase tracking-wide">{section.title}</p>
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            {section.rows.map((row, idx) => (
              <button
                key={row.label}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-right active:bg-charcoal-50 transition-colors ${
                  idx < section.rows.length - 1 ? 'border-b border-charcoal-100/60' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center flex-shrink-0">
                  <row.icon className="w-4 h-4 text-charcoal-500" strokeWidth={1.8} />
                </div>
                <span className="flex-1 text-sm font-medium text-charcoal-900">{row.label}</span>
                {row.value && (
                  <span className="text-xs text-charcoal-400 truncate max-w-[120px]">{row.value}</span>
                )}
                <ChevronLeft className="w-4 h-4 text-charcoal-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-charcoal-700 text-sm font-semibold active:scale-[0.98] transition-transform"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
      >
        <LogOut className="w-4 h-4" />
        התנתקות
      </button>

      {/* Delete account — separated, dangerous */}
      <div className="pt-2">
        <p className="text-xs font-semibold text-charcoal-400 mb-2 mr-1 uppercase tracking-wide">מסוכן</p>
        <button className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold active:scale-[0.98] transition-transform">
          <Trash2 className="w-4 h-4" />
          מחיקת חשבון
        </button>
      </div>
    </motion.div>
  );
};
