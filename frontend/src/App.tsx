import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Dashboard } from './pages/Dashboard';
import { GuestList } from './pages/GuestList';
import { AddGuest } from './pages/AddGuest';
import { EditGuest } from './pages/EditGuest';
import { GuestDetails } from './pages/GuestDetails';
import { Settings } from './pages/Settings';
import { EventManager } from './pages/EventManager';
import { Messages } from './pages/Messages';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { EventProvider, useEvent } from './hooks/useEvent';
import { Guest, RsvpStatus } from './types';
import { guestService, authService, supabase } from './services/supabase';

type Page = 'dashboard' | 'guests' | 'add' | 'edit' | 'details' | 'settings' | 'eventManager' | 'messages';
type AuthPage = 'login' | 'register';

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [viewingGuest, setViewingGuest] = useState<Guest | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<Guest | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [guestStatusFilter, setGuestStatusFilter] = useState<RsvpStatus | 'ALL'>('ALL');
  const [messagesInitialFilter, setMessagesInitialFilter] = useState<RsvpStatus | 'ALL'>('ALL');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const auth = useSupabaseAuth();
  const {
    event,
    archivedEvents,
    loading: eventLoading,
    update: updateEvent,
    createEvent,
    activateEvent,
    archiveEvent,
    deleteEvent,
  } = useEvent();

  const loadGuests = useCallback(async () => {
    if (!auth.user || !event?.id) {
      setGuests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await guestService.getAll(auth.user.id, event.id);
      setGuests(data);
    } catch {
      addToast('שגיאה בטעינת המוזמנים', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, auth.user, event?.id]);

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !localStorage.getItem('luma_onboarding_done')) {
      setShowOnboarding(true);
    }
  }, [auth.isAuthenticated, auth.isLoading]);

  useEffect(() => {
    void loadGuests();
  }, [loadGuests]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && auth.isAuthenticated && auth.user && event?.id) {
        void loadGuests();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [auth.isAuthenticated, auth.user, event?.id, loadGuests]);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user || !event?.id) return;

    const channel = supabase
      .channel(`guests-${event.id}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'guests', filter: `event_id=eq.${event.id}` },
        (payload: any) => {
          const newRow = payload.new;
          const oldRow = payload.old;

          if (payload.eventType === 'INSERT') {
            setGuests((prev) => [newRow, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setGuests((prev) => prev.map((guest) => (guest.id === newRow.id ? { ...guest, ...newRow } : guest)));
            if (newRow.rsvp_via_link && !oldRow?.rsvp_via_link) {
              const name = newRow.full_name;
              if (newRow.rsvp_status === 'CONFIRMED') {
                addToast(`🎉 ${name} אישר/ה הגעה!`, 'success');
              } else if (newRow.rsvp_status === 'DECLINED') {
                addToast(`${name} לא יוכל/תוכל להגיע`, 'info');
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setGuests((prev) => prev.filter((guest) => guest.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addToast, auth.isAuthenticated, auth.user, event?.id]);

  const handleConfirmDelete = async () => {
    if (!deletingGuest || !auth.user || !event?.id) return;

    try {
      setIsDeleteLoading(true);
      await guestService.delete(deletingGuest.id, auth.user.id, event.id);
      setGuests((prev) => prev.filter((guest) => guest.id !== deletingGuest.id));
      const name = deletingGuest.fullName || deletingGuest.full_name;
      addToast(`${name} נמחק בהצלחה`, 'success');
      setDeletingGuest(null);
      if (currentPage === 'details') {
        setCurrentPage('guests');
      }
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

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setCurrentPage('dashboard');
      addToast('התנתקת בהצלחה', 'success');
    } catch {
      addToast('שגיאה בהתנתקות', 'error');
    }
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-ivory-100 flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-gold-200 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            guests={guests}
            loading={loading}
            event={event}
            events={archivedEvents.length > 0 ? [event, ...archivedEvents].filter(Boolean) as import('./types').Event[] : undefined}
            onAddGuest={() => setCurrentPage('add')}
            onViewGuests={() => setCurrentPage('guests')}
            onViewGuest={(guest) => {
              setViewingGuest(guest);
              setCurrentPage('details');
            }}
            onViewGuestsFiltered={(status) => {
              setGuestStatusFilter(status);
              setCurrentPage('guests');
            }}
            onSetupEvent={() => setCurrentPage('settings')}
            onSwitchEvent={activateEvent}
          />
        );
      case 'guests':
        return (
          <GuestList
            guests={guests}
            loading={loading}
            userId={auth.user!.id}
            event={event}
            onAddGuest={() => setCurrentPage('add')}
            onEditGuest={(guest) => {
              setEditingGuest(guest);
              setCurrentPage('edit');
            }}
            onDeleteGuest={setDeletingGuest}
            onViewGuest={(guest) => {
              setViewingGuest(guest);
              setCurrentPage('details');
            }}
            onGuestsImported={loadGuests}
            initialStatusFilter={guestStatusFilter}
          />
        );
      case 'messages':
        return <Messages guests={guests} userId={auth.user!.id} initialFilter={messagesInitialFilter} />;
      case 'add':
        return <AddGuest onSuccess={handleAddSuccess} onCancel={() => setCurrentPage('guests')} />;
      case 'edit':
        return editingGuest ? (
          <EditGuest
            guestId={editingGuest.id}
            onSuccess={handleEditSuccess}
            onCancel={() => setCurrentPage('guests')}
          />
        ) : null;
      case 'details':
        return viewingGuest ? (
          <GuestDetails
            guestId={viewingGuest.id}
            onBack={() => setCurrentPage('guests')}
            onEdit={(guest) => {
              setEditingGuest(guest);
              setCurrentPage('edit');
            }}
            onDelete={setDeletingGuest}
          />
        ) : null;
      case 'settings':
        return (
          <Settings
            onLogout={handleLogout}
            userEmail={auth.user?.email}
            event={event}
            onOpenEventManager={() => setCurrentPage('eventManager')}
          />
        );
      case 'eventManager':
        return (
          <EventManager
            event={event}
            archivedEvents={archivedEvents}
            onBack={() => setCurrentPage('settings')}
            onEventUpdate={updateEvent}
            onCreateEvent={createEvent}
            onActivateEvent={activateEvent}
            onArchiveEvent={archiveEvent}
            onDeleteEvent={deleteEvent}
          />
        );
      default:
        return null;
    }
  };

  const isSubPage = ['add', 'edit', 'details', 'eventManager'].includes(currentPage);

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
          onNavChange={(page) => {
            if (page === 'messages') {
              setMessagesInitialFilter('ALL');
            }
            setCurrentPage(page as Page);
          }}
        />
      )}

      <ConfirmDeleteModal
        guest={deletingGuest}
        isOpen={!!deletingGuest}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingGuest(null)}
        isLoading={isDeleteLoading}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function App() {
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const { toasts, addToast, removeToast } = useToast();
  const auth = useSupabaseAuth();

  const handleLoginSuccess = () => {
    addToast('ברוך הבא!', 'success');
  };

  const handleRegisterSuccess = () => {
    addToast('החשבון נוצר בהצלחה!', 'success');
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

  return (
    <EventProvider>
      <AuthenticatedApp />
    </EventProvider>
  );
}

export default App;
