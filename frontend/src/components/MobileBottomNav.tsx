import { BarChart2, Users, MessageCircle, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileBottomNavProps {
  currentPage: string;
  onNavChange: (page: string) => void;
}

const navItems = [
  { id: 'settings', label: 'הגדרות', icon: SettingsIcon },
  { id: 'messages', label: 'הודעות', icon: MessageCircle },
  { id: 'guests', label: 'מוזמנים', icon: Users },
  { id: 'dashboard', label: 'דוח', icon: BarChart2 },
];

export const MobileBottomNav = ({ currentPage, onNavChange }: MobileBottomNavProps) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="glass-nav mx-3 mb-3 rounded-3xl shadow-lg border border-white/60">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => onNavChange(id)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-x-1 inset-y-1.5 rounded-2xl bg-gold-100"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 transition-colors duration-200 ${
                    isActive ? 'text-gold-600' : 'text-charcoal-400'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                  className={`text-[10px] font-medium relative z-10 transition-colors duration-200 ${
                    isActive ? 'text-gold-600' : 'text-charcoal-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
