import { ReactNode } from 'react';
import { MobileBottomNav } from './MobileBottomNav';

interface AppShellProps {
  children: ReactNode;
  currentPage: string;
  onNavChange: (page: string) => void;
  userEmail?: string;
  onLogout?: () => void;
}

export const AppShell = ({
  children,
  currentPage,
  onNavChange,
  userEmail,
  onLogout,
}: AppShellProps) => {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-ivory-50 to-warmWhite-100">
      {/* Main content area with safe-area padding for notch */}
      <main className="pb-24 pt-safe">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav
        currentPage={currentPage}
        onNavChange={onNavChange}
        userEmail={userEmail}
        onLogout={onLogout}
      />
    </div>
  );
};
