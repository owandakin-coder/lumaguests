import { motion } from 'framer-motion';
import { Users, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Stats } from '../types';

interface StatItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const StatItem = ({ label, value, icon, color }: StatItemProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl p-6 ${color} flex items-start gap-4`}
  >
    <div className="p-3 rounded-xl bg-white bg-opacity-50 flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-white text-opacity-90">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  </motion.div>
);

interface StatsCardProps {
  stats: Stats;
}

export const StatsCard = ({ stats }: StatsCardProps) => {
  return (
    <div className="space-y-6">
      {/* Main hero card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-charcoal-900 to-charcoal-700 rounded-2xl p-8 text-white"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Guest Overview</h2>
          <Users className="w-8 h-8 text-gold-400" />
        </div>
        <p className="text-charcoal-200 mb-6">Total Attendees</p>
        <div className="flex items-baseline gap-2">
          <span className="text-6xl font-bold text-gold-400">{stats.totalPeople}</span>
          <span className="text-lg text-charcoal-300">people</span>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatItem
          label="Total Guests"
          value={stats.totalGuests}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatItem
          label="Confirmed"
          value={stats.confirmedGuests}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatItem
          label="Pending"
          value={stats.pendingGuests}
          icon={<Clock className="w-6 h-6 text-amber-600" />}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <StatItem
          label="Declined"
          value={stats.declinedGuests}
          icon={<XCircle className="w-6 h-6 text-red-600" />}
          color="bg-gradient-to-br from-red-500 to-red-600"
        />
      </div>
    </div>
  );
};
