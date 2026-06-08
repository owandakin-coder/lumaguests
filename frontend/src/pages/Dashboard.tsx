import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StatsCard } from '../components/StatsCard';
import { PremiumCard } from '../components/PremiumCard';
import { Stats } from '../types';
import { guestService } from '../services/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { HE } from '../constants/he';

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
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-4xl font-bold text-charcoal-900 mb-2">{HE.pages.dashboard}</h1>
        <p className="text-lg text-charcoal-600">{HE.app.description}</p>
      </motion.div>

      {/* Stats Cards */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-4">
          {/* Hero Stat */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <PremiumCard className="bg-gradient-to-br from-gold-50 to-warmWhite-100 border-gold-200">
              <div className="text-center py-6">
                <div className="text-5xl font-bold text-gold-600 mb-2">{stats.totalGuests}</div>
                <p className="text-charcoal-600 font-medium">{HE.stats.totalGuests}</p>
              </div>
            </PremiumCard>
          </motion.div>

          {/* Status Stats Grid */}
          <div className="grid grid-cols-1 gap-4">
            <StatsCard
              label={HE.stats.confirmedGuests}
              value={stats.confirmedGuests}
              color="green