import { BarChart2, Users, MessageCircle, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileBottomNavProps {
  currentPage: string;
  onNavChange: (page: string) => void;
  pendingCount?: number;
  messageCount?: number;
}

/*
  RTL visual order (right → left):
  דוח | מוזמנים | הודעות | הגדרות
  In RTL flex, first item = rightmost. Array order:
  [דוח, מוזמנים, הודעות, הגדרות]
*/
const tabs = [
  { id: 'dashboard', label: 'דוח',     icon: BarChart2      },
  { id: 'guests',    label: 'מוזמנים', icon: Users          },
  { id: 'messages',  label: 'הודעות',  icon: MessageCircle  },
  { id: 'settings',  label: 'הגדרות',  icon: SettingsIcon   },
];

export const MobileBottomNav = ({ currentPage, onNavChange, pendingCount = 0, messageCount = 0 }: MobileBottomNavProps) => {
  const badges: Record<string, number> = {
    guests:   pendingCount,
    messages: messageCount,
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-4 mb-4">
        <nav
          className="rounded-[28px] px-2 py-2 flex items-center"
          dir="rtl"
          style={{
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const active  = currentPage === id;
            const badge   = badges[id] ?? 0;
            return (
              <button key={id} onClick={() => onNavChange(id)}
                className="relative flex flex-col items-center justify-center gap-1 flex-1 h-14 rounded-[20px]">
                <AnimatePresence>
                  {active && (
                    <motion.div layoutId="tab-bg"
                      className="absolute inset-0 rounded-[20px] bg-charcoal-900"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon + badge wrapper */}
                <div className="relative z-10">
                  <Icon
                    className={`w-[18px] h-[18px] transition-colors duration-200 ${active ? 'text-white' : 'text-charcoal-400'}`}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {badge > 0 && !active && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"
                    >
                      <span className="text-[9px] font-black text-white leading-none">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    </motion.div>
                  )}
                </div>

                <span className={`text-[10px] font-semibold relative z-10 transition-colors duration-200 ${active ? 'text-white' : 'text-charcoal-400'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
