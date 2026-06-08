import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { Guest, Stats } from '../types';
import { guestService } from '../services/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface DashboardProps {
  onAddGuest: () => void;
  onViewGuests: () => void;
}

export const Dashboard = ({ onAddGuest, onViewGuests }: DashboardProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = useSupabaseAuth();

  useEffect(() => {
    if (auth.user) {
      loadStats();
    }
  }, [auth.user?.id]);

  const loadStats = async () => {
    if (!auth.user) return;
    try {
      setLoading(true);
      const data = await guestService.getStats(auth.user.id);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-4xl font-bold text-charcoal-900 mb-2">Luma Guests</h1>
        <p className="text-lg text-charcoal-600">Manage your event effortlessly</p>
      </motion.div>

      {/* Stats */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-40 bg-charcoal-100 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-charcoal-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : stats ? (
        <StatsCard stats={stats} />
      ) : null}

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <button
          onClick={onAddGuest}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gold-500 text-white font-semibold hover:bg-gold-600 transition shadow-lg"
        >
          <Plus className="w-6 h-6" />
          Add Guest
        </button>
        <button
          onClick={onViewGuests}
          className="w-full px-6 py-4 rounded-xl border border-charcoal-200 text-charcoal-900 font-semibold hover:bg-charcoal-50 transition"
        >
          View All Guests
        </button>
      </motion.div>
    </div>
  );
};
