import { BarChart2, Users, MessageCircle, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileBottomNavProps {
  currentPage: string;
  onNavChange: (page: string) => void;
}

const tabs = [
  { id: 'dashboard', label: 'דוח',      icon: BarChart2    },
  { id: 'guests',    label: 'מוזמנים',  icon: Users        },
  { id: 'messages',  label: 'הודעות',   icon: MessageCircle },
  { id: 'settings',  label: 'הגדרות',   icon: SettingsIcon  },
];

export const MobileBottomNav = ({ currentPage, onNavChange }: MobileBottomNavProps) => (
  <div className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <div className="mx-4 mb-4">
      <nav
        className="rounded-[28px] px-2 py-2 flex items-center justify-around"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 h-14 rounded-[20px] transition-colors"
            >
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 rounded-[20px] bg-charcoal-900"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>
              <Icon
                className={`w-[18px] h-[18px] relative z-10 transition-colors duration-200 ${active ? 'text-white' : 'text-charcoal-400'}`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] font-semibold relative z-10 transition-colors duration-200 ${active ? 'text-white' : 'text-charcoal-400'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  </div>
);
