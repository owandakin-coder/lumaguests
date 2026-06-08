import { useState, useEffect } from 'react';
import { Home, Users, Settings as SettingsIcon, Menu, X, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

import { Dashboard } from './pages/Dashboard';
import { GuestList } from './pages/GuestList';
import { AddGuest } from './pages/AddGuest';
import { EditGuest } from './pages/EditGuest';
import { GuestDetails } from './pages/GuestDetails';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { Guest } from './types';
import { guestService, authService } from './services/supabase';

type Page = 'dashboard' | 'guests' | 'add' | 'edit' | 'details' | 'settings';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    } catch (error) {
      addToast('Failed to load guests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuest = () => {
    setCurrentPage('add');
    setMobileMenuOpen(false);
  };

  const handleEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setCurrentPage('edit');
    setMobileMenuOpen(false);
  };

  const handleDeleteGuest = (guest: Guest) => {
    setDeletingGuest(guest);
  };

  const handleConfirmDelete = async () => {
    if (!deletingGuest || !auth.user) return;

    try {
      setIsDeleteLoading(true);
      await guestService.delete(deletingGuest.id, auth.user.id);
      setGuests((prev) => prev.filter((g) => g.id !== deletingGuest.id));
      const name = deletingGuest.fullName || deletingGuest.full_name;
      addToast(`${name} deleted successfully`, 'success');
      setDeletingGuest(null);
    } catch (error) {
      addToast('Failed to delete guest', 'error');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleViewGuest = (guest: Guest) => {
    setViewingGuest(guest);
    setCurrentPage('details');
    setMobileMenuOpen(false);
  };

  const handleAddSuccess = async () => {
    await loadGuests();
    addToast('Guest added successfully', 'success');
    setCurrentPage('guests');
  };

  const handleEditSuccess = async () => {
    await loadGuests();
    addToast('Guest updated successfully', 'success');
    setEditingGuest(null);
    setCurrentPage('guests');
  };

  const handleBackToGuests = () => {
    setCurrentPage('guests');
    setMobileMenuOpen(false);
  };

  const handleLoginSuccess = () => {
    addToast(`Welcome!`, 'success');
    setCurrentPage('dashboard');
  };

  const handleRegisterSuccess = () => {
    addToast(`Account created! Welcome!`, 'success');
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setCurrentPage('dashboard');
      addToast('Logged out successfully', 'success');
    } catch (error) {
      addToast('Failed to logout', 'error');
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            onAddGuest={handleAddGuest}
            onViewGuests={() => setCurrentPage('guests')}
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
        return <Settings />;
      default:
        return null;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  // Show loading state
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ivory-50 to-warmWhite-100 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-12 h-12 border-4 border-gold-200 border-t-gold-500 rounded-full" />
        </motion.div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ivory-50 to-warmWhite-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-charcoal-900 mb-2">Luma Guests</h1>
            <p className="text-charcoal-600">Premium guest-list management</p>
          </div>

          {authPage === 'login' ? (
            <Login
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setAuthPage('register')}
              onLogin={auth.login}
            />
          ) : (
            <Register
              onSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => setAuthPage('login')}
              onRegister={auth.register}
            />
          )}

          <div className="mt-8 p-4 bg-gold-50 rounded-lg border border-gold-200">
            <p className="text-xs text-charcoal-600 text-center">
              <strong>Demo Credentials:</strong>
              <br />
              john@example.com / password123
              <br />
              jane@example.com / password456
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show main app when authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-ivory-50 to-warmWhite-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white bg-opacity-95 backdrop-blur border-b border-charcoal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-charcoal-900">Luma Guests</h1>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-charcoal-600">{auth.user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-charcoal-600 hover:bg-charcoal-50 transition"
              title="Logout"
              disabled={loading}
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Logout</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-charcoal-600 hover:text-charcoal-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        {/* Sidebar Navigation */}
        <nav
          className={`lg:w-64 bg-white border-r border-charcoal-100 p-4 space-y-2 transition-all duration-300 ${
            mobileMenuOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setCurrentPage(id as Page);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition ${
                currentPage === id
                  ? 'bg-gold-100 text-gold-700'
                  : 'text-charcoal-600 hover:bg-charcoal-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto max-w-7xl w-full mx-auto">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        guest={deletingGuest}
        isOpen={!!deletingGuest}
        isLoading={isDel