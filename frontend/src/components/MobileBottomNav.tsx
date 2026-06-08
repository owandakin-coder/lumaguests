import { Home, Users, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { HE } from '../constants/he';

interface MobileBottomNavProps {
  currentPage: string;
  onNavChange: (page: string) => void;
  userEmail?: string;
  onLogout?: () => void;
}

export const MobileBottomNav = ({
  currentPage,
  onNavChange,
  userEmail,
  onLogout,
}: MobileBottomNavProps) => {
  const navItems = [
    { id: 'dashboard', label: HE.nav.dashboard, icon: Home },
    { id: 'guests', label: HE.nav.guests, icon: Users },
    { id: 'settings', label: HE.nav.settings, icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-charcoal-100 safe-area-inset-bottom z-40">
      <div className="flex items-center justify-between h-20 px-4">
        {/* Nav items */}
        <div className="flex flex-1 justify-around">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              className={`flex flex-col items-center justify-center w-16 h-20 rounded-lg transition ${
                currentPage === id
                  ? 'text-gold-500'
                  : 'text-charcoal-400 hover:text-charcoal-600'
              }`}
              title={label}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Logout button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 text-charcoal-400 hover:text-red-500 transition rounded-lg"
            title={HE.nav.logout}
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </nav>
  );
};
