import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Dashboard } from './pages/Dashboard';
import { GuestList } from './pages/GuestList';
import { AddGuest } from './pages/AddGuest';
import { EditGuest } from './pages/EditGuest';
import { GuestDetails } from './pages/GuestDetails';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { Guest } from './types';
import { guestService, authService } from './services/supabase';

type Page = 'dashboard' | 'guests' | 'add' | 'edit' | 'details' | 'settings' | 'messages';
type AuthPage = 'login' | 'register';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [viewingGuest, setViewingGuest] = useState<Guest | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<Guest | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const auth = useSupabaseAuth();

  useEffect(() => {
    if (auth.isAuthenticated && !auth.isLoading && auth.user) {
      loadGuests();
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user?.id]);

  const loadGuests = async () => {
    if (!auth.user) return;
    try {
      setLoading(true);
      const data = await guestService.getAll(auth.user.id);
      setGuests(data);
    } catch {
      addToast('שגיאה בטעינת המוזמנים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuest = () => setCurrentPage('add');
  const handleEditGuest = (guest: Guest) => { setEditingGuest(guest); setCurrentPage('edit'); };
  const handleDeleteGuest = (guest: Guest) => setDeletingGuest(guest);
  const handleViewGuest = (guest: Guest) => { setViewingGuest(guest); setCurrentPage('details'); };

  const handleConfirmDelete = async () => {
    if (!deletingGuest || !auth.user) return;
    try {
      setIsDeleteLoading(true);
      await guestService.delete(deletingGuest.id, auth.user.id);
      setGuests((prev) => prev.filter((g) => g.id !== deletingGuest.id));
      const name = deletingGuest.fullName || deletingGuest.full_name;
      addToast(`${name} נמחק בהצלחה`, 'success');
      setDeletingGuest(null);
      if (currentPage === 'details') setCurrentPage('guests');
    } catch {
      addToast('שגיאה במחיקת המוזמן', 'error');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleAddSuccess = async () => {
    await loadGuests();
    addToast('מוזמן נוסף בהצלחה', 'success');
    setCurrentPage('guests');
  };

  const handleEditSuccess = async () => {
    await loadGuests();
    addToast('מוזמן עודכן בהצלחה', 'success');
    setEditingGuest(null);
    setCurrentPage('guests');
  };

  const handleBackToGuests = () => setCurrentPage('guests');

  const handleLoginSuccess = () => {
    addToast('ברוך הבא!', 'success');
    setCurrentPage('dashboard');
  };

  const handleRegisterSuccess = () => {
    addToast('החשבון נוצר בהצלחה!', 'success');
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setCurrentPage('dashboard');
      addToast('התנתקת בהצלחה', 'success');
    } catch {
      addToast('שגיאה בהתנתקות', 'error');
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            guests={guests}
            loading={loading}
            onAddGuest={handleAddGuest}
            onViewGuests={() => setCurrentPage('guests')}
            onViewGuest={handleViewGuest}
          />
        );
      case 'guests':
        return (
          <GuestList
            guests={guests}
            loading={loading}
            onAddGuest={handleAddGuest}
            onEditGuest={handleEditGuest}
            onDeleteGuest={handleDeleteGuest}
            onViewGuest={handleViewGuest}
          />
        );
      case 'add':
        return <AddGuest onSuccess={handleAddSuccess} onCancel={handleBackToGuests} />;
      case 'edit':
        return editingGuest ? (
          <EditGuest
            guestId={editingGuest.id}
            onSuccess={handleEditSuccess}
            onCancel={handleBackToGuests}
          />
        ) : null;
      case 'details':
        return viewingGuest ? (
          <GuestDetails
            guestId={viewingGuest.id}
            onBack={handleBackToGuests}
            onEdit={handleEditGuest}
            onDelete={handleDeleteGuest}
          />
        ) : null;
      case 'settings':
        return <Settings onLogout={handleLogout} userEmail={auth.user?.email} />;
      case 'messages':
        return (
          <div className="flex flex-col items-center justify-center h-64 text-charcoal-400 gap-3 mt-16">
            <div className="w-16 h-16 rounded-3xl bg-charcoal-100 flex items-center justify-center">
              <span className="text-3xl">💬</span>
            </div>
            <p className="text-base font-semibold text-charcoal-700">הודעות — בקרוב</p>
            <p className="text-sm text-charcoal-400 text-center">אפשרות שליחת הודעות תתווסף בגרסה הבאה</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-ivory-100 flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-gold-200 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div dir="rtl" className="min-h-screen bg-ivory-100 flex items-center justify-center p-5">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {authPage === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Login
                  onSuccess={handleLoginSuccess}
                  onSwitchToRegister={() => setAuthPage('register')}
                  onLogin={auth.login}
                />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Register
                  onSuccess={handleRegisterSuccess}
                  onSwitchToLogin={() => setAuthPage('login')}
                  onRegister={auth.register}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  const isSubPage = ['add', 'edit', 'details'].includes(currentPage);

  return (
    <div dir="rtl" className="min-h-screen bg-ivory-100">
      <main className="max-w-[430px] mx-auto px-5 pb-32" style={{paddingTop:"calc(env(safe-area-inset-top) + 16px)"}}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isSubPage && (
        <MobileBottomNav
          currentPage={currentPage}
          onNavChange={(page) => setCurrentPage(page as Page)}
        />
      )}

      <ConfirmDeleteModal
        guest={deletingGuest}
        isOpen={!!deletingGuest}
        isLoading={isDeleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingGuest(null)}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
