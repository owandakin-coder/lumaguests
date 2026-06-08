import { ReactNode } from 'react';
import { MobileBottomNav } from './MobileBottomNav';

interface AppShellProps {
  children: ReactNode;
  currentPage: string;
  onNavChange: (page: string) => void;
}

export const AppShell = ({ children, currentPage, onNavChange }: AppShellProps) => (
  <div dir="rtl" className="min-h-screen bg-ivory-100">
    <main className="pb-32">{children}</main>
    <MobileBottomNav currentPage={currentPage} onNavChange={onNavChange} />
  </div>
);
