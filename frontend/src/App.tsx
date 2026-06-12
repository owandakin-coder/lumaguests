import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Dashboard }          from './pages/Dashboard';
import { GuestList }          from './pages/GuestList';
import { AddGuest }           from './pages/AddGuest';
import { EditGuest }          from './pages/EditGuest';
import { GuestDetails }       from './pages/GuestDetails';
import { Settings }           from './pages/Settings';
import { Messages }           from './pages/Messages';
import { Login }              from './pages/Login';
import { Register }           from './pages/Register';
import { Onboarding }         from './pages/Onboarding';
import { MobileBottomNav }    from './components/MobileBottomNav';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ToastContainer }     from './components/Toast';
import { useToast }           from './hooks/useToast';
import { useSupabaseAuth }    from './hooks/useSupabaseAuth';
import { Guest, RsvpStatus }  from './types';
import { guestService, authService, supabase } from './services/supabase';
import { useEvent } from './hooks/useEvent';

type Page     = 'dashboard' | 'guests' | 'add' | 'edit' | 'details' | 'settings' | 'messages';
type AuthPage = 'login' | 'register';

function App() {
  const [currentPage,  setCurrentPage]  = useState<Page>('dashboard');
  const [authPage,     setAuthPage]     = useState<AuthPage>('login');
  const [guests,       setGuests]       = useState<Guest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [viewingGuest, setViewingGuest] = useState<Guest | null>(null);
  const [deletingGuest,setDeletingGuest]= useState<Guest | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [guestStatusFilter, setGuestStatusFilter] = useState<RsvpStatus | 'ALL'>('ALL');
  const [messagesInitialFilter, setMessagesInitialFilter] = useState<RsvpStatus | 'ALL'>('ALL');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const auth  = useSupabaseAuth();
  const { event, update: updateEvent } = useEvent();

  // Show onboarding for new users
  useEffect(() => {
    if (auth.isAuthenticated && !auth.isLoading) {
      if (!localStorage.getItem('luma_onboarding_done')) {
        setShowOnboarding(true);
      }
    }
  }, [auth.isAuthenticated, auth.isLoading]);

  useEffect(() => {
    if (auth.isAuthenticated && !auth.isLoading && auth.user) {
      loadGuests();
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user?.id]);

  // Refresh guests when user returns to the tab (e.g. from RSVP link in another tab)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && auth.isAuthenticated && auth.user) {
        loadGuests();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [auth.isAuthenticated, auth.user?.id]);

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

  // Realtime subscription — live RSVP notifications
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) return;
    const userId = auth.user.id;

    const channel = supabase
      .channel(`guests-${userId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'guests', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const newRow = payload.new;
          const oldRow = payload.old;

          if (payload.eventType === 'INSERT') {
            setGuests(prev => [newRow, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setGuests(prev => prev.map(g => g.id === newRow.id ? { ...g, ...newRow } : g));
            if (newRow.rsvp_via_link && !oldRow?.rsvp_via_link) {
              const name = newRow.full_name;
              if (newRow.rsvp_status === 'CONFIRMED') {
                addToast(`🎉 ${name} אישר/ה הגעה!`, 'success');
              } else if (newRow.rsvp_status === 'DECLINED') {
                addToast(`${name} לא יוכל/תוכל להגיע`, 'info');
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setGuests(prev => prev.filter(g => g.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [auth.isAuthenticated, auth.user?.id]);

  const handleAddGuest = () => setCurrentPage('add');

  const handleEditGuest   = (guest: Guest) => { setEditingGuest(guest); setCurrentPage('edit'); };
  const handleDeleteGuest = (guest: Guest) => setDeletingGuest(guest);
  const handleViewGuest   = (guest: Guest) => { setViewingGuest(guest); setCurrentPage('details'); };

  const handleSetupEvent    = () => setCurrentPage('settings');
  const handleSendReminders = () => { setGuestStatusFilter('PENDING'); setMessagesInitialFilter('PENDING'); setCurrentPage('messages'); };

  const handleConfirmDelete = async () => {
    if (!deletingGuest || !auth.user) return;
    try {
      setIsDeleteLoading(true);
      await guestService.delete(deletingGuest.id, auth.user.id);
      setGuests(prev => prev.filter(g => g.id !== deletingGuest.id));
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
            event={event}
            onAddGuest={handleAddGuest}
            onViewGuests={() => setCurrentPage('guests')}
            onViewGuest={handleViewGuest}
            onViewGuestsFiltered={(s) => { setGuestStatusFilter(s); setCurrentPage('guests'); }}
            onSetupEvent={handleSetupEvent}
            onSendReminders={handleSendReminders}
          />
        );
      case 'guests':
        return (
          <GuestList
            guests={guests}
            loading={loading}
            userId={auth.user!.id}
            event={event}
            onAddGuest={handleAddGuest}
            onEditGuest={handleEditGuest}
            onDeleteGuest={handleDeleteGuest}
            onViewGuest={handleViewGuest}
            onGuestsImported={loadGuests}
            initialStatusFilter={guestStatusFilter}
          />
        );
      case 'messages':
        return <Messages guests={guests} userId={auth.user!.id} initialFilter={messagesInitialFilter} />;
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
        return (
          <Settings
            onLogout={handleLogout}
            userEmail={auth.user?.email}
            event={event}
            onEventUpdate={updateEvent}
          />
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
      <div dir="rtl">
        <AnimatePresence mode="wait">
          {authPage === 'login' ? (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Login
                onSuccess={handleLoginSuccess}
                onSwitchToRegister={() => setAuthPage('register')}
                onLogin={auth.login}
              />
            </motion.div>
          ) : (
            <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Register
                onSuccess={handleRegisterSuccess}
                onSwitchToLogin={() => setAuthPage('login')}
                onRegister={auth.register}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  // Onboarding screen for new users
  if (showOnboarding) {
    return (
      <div dir="rtl">
        <Onboarding
          onComplete={() => setShowOnboarding(false)}
          onUpdateEvent={updateEvent}
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  const isSubPage = ['add', 'edit', 'details'].includes(currentPage);

  return (
    <div dir="rtl" className="bg-ivory-100" style={{ height: '100dvh', overflow: 'hidden' }}>
      <main
        className="max-w-[430px] mx-auto px-5 overflow-y-auto h-full"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 120px)',
          WebkitOverflowScrolling: 'touch' as any,
        }}
      >
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
          onNavChange={page => {
            if (page === 'messages') setMessagesInitialFilter('ALL');
            setCurrentPage(page as Page);
          }}
          pendingCount={0}
          messageCount={0}
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
