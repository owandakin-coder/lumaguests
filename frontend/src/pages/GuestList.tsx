import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { GuestCard } from '../components/GuestCard';
import { SearchBar } from '../components/SearchBar';
import { FilterTabs } from '../components/FilterTabs';
import { Guest, Category, RsvpStatus } from '../types';

interface GuestListProps {
  guests: Guest[];
  loading: boolean;
  onAddGuest: () => void;
  onEditGuest: (guest: Guest) => void;
  onDeleteGuest: (guest: Guest) => void;
  onViewGuest: (guest: Guest) => void;
}

export const GuestList = ({
  guests,
  loading,
  onAddGuest,
  onEditGuest,
  onDeleteGuest,
  onViewGuest,
}: GuestListProps) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<RsvpStatus | 'ALL'>('ALL');

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const fullName = guest.fullName || guest.full_name;
      const rsvpStatus = guest.rsvpStatus || guest.rsvp_status;

      const matchesSearch =
        fullName.toLowerCase().includes(search.toLowerCase()) ||
        guest.phone.includes(search);

      const matchesCategory = categoryFilter === 'ALL' || guest.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || rsvpStatus === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [guests, search, categoryFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-charcoal-900">Guests</h1>
          <p className="text-charcoal-600 text-sm mt-1">
            {filteredGuests.length} of {guests.length} guests
          </p>
        </div>
        <button
          onClick={onAddGuest}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gold-500 text-white font-semibold hover:bg-gold-600 transition"
        >
          <Plus className="w-5 h-5" />
          Add
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <SearchBar value={search} onChange={setSearch} />
        <FilterTabs
          activeCategory={categoryFilter}
          activeStatus={statusFilter}
          onCategoryChange={setCategoryFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* Guest List */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-charcoal-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredGuests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-charcoal-900 mb-1">
            {guests.length === 0 ? 'No guests yet' : 'No matching guests'}
          </h3>
          <p className="text-charcoal-600 mb-6">
            {guests.length === 0
              ? 'Start by adding your first guest'
              : 'Try adjusting your search or filters'}
          </p>
          <button
            onClick={onAddGuest}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gold-500 text-white font-semibold hover:bg-gold-600 transition"
          >
            <Plus className="w-5 h-5" />
            Add Guest
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredGuests.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              onEdit={onEditGuest}
              onDelete={onDeleteGuest}
              onView={onViewGuest}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
};
