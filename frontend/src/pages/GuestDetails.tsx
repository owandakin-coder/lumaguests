import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, MessageCircle, Edit2, Trash2 } from 'lucide-react';
import { Guest } from '../types';
import { guestService } from '../services/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface GuestDetailsProps {
  guestId: string;
  onBack: () => void;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
}

const categoryColors: Record<string, string> = {
  GROOM: 'bg-gold-100 text-gold-700',
  BRIDE: 'bg-pink-100 text-pink-700',
  FAMILY: 'bg-blue-100 text-blue-700',
  FRIENDS: 'bg-purple-100 text-purple-700',
  WORK: 'bg-slate-100 text-slate-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const rsvpColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  DECLINED: 'bg-red-100 text-red-700',
};

export const GuestDetails = ({ guestId, onBack, onEdit, onDelete }: GuestDetailsProps) => {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = useSupabaseAuth();

  useEffect(() => {
    if (auth.user) {
      loadGuest();
    }
  }, [guestId, auth.user]);

  const loadGuest = async () => {
    if (!auth.user) return;
    try {
      setLoading(true);
      const data = await guestService.getById(guestId, auth.user.id);
      setGuest(data);
    } catch (error) {
      console.error('Failed to load guest:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gold-600 hover:text-gold-700 mb-6 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="h-96 bg-charcoal-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-charcoal-900">Guest not found</h2>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 text-gold-600 hover:text-gold-700 font-semibold"
        >
          Go back
        </button>
      </div>
    );
  }

  const fullName = guest.fullName || guest.full_name;
  const rsvpStatus = guest.rsvpStatus || guest.rsvp_status;

  const handleCall = () => {
    window.location.href = `tel:${guest.phone}`;
  };

  const handleWhatsApp = () => {
    const message = `Hello ${fullName}! I wanted to reach out regarding the event.`;
    const encodedMessage = encodeURIComponent(message);
    const phone = guest.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gold-600 hover:text-gold-700 mb-6 font-semibold"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      {/* Main Card */}
      <div className="bg-white rounded-2xl p-8 border border-charcoal-100">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-charcoal-900">{fullName}</h1>
            <p className="text-charcoal-600 mt-2">{guest.phone}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(guest)}
              className="p-3 rounded-lg hover:bg-gold-100 transition text-gold-600"
              title="Edit"
            >
              <Edit2 className="w-6 h-6" />
            </button>
            <button
              onClick={() => onDelete(guest)}
              className="p-3 rounded-lg hover:bg-red-100 transition text-red-600"
              title="Delete"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <span className={`inline-block text-sm font-medium px-4 py-2 rounded-full ${categoryColors[guest.category]}`}>
            {guest.category}
          </span>
          <span className={`inline-block text-sm font-medium px-4 py-2 rounded-full ${rsvpColors[rsvpStatus]}`}>
            {rsvpStatus}
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 pb-8 border-b border-charcoal-100">
          <div>
            <p className="text-xs text-charcoal-500 font-medium uppercase tracking-wide">Companions</p>
            <p className="text-2xl font-bold text-charcoal-900 mt-2">{guest.companions}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-500 font-medium uppercase tracking-wide">Total People</p>
            <p className="text-2xl font-bold text-charcoal-900 mt-2">{1 + guest.companions}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-500 font-medium uppercase tracking-wide">Added</p>
            <p className="text-sm font-semibold text-charcoal-900 mt-2">
              {new Date(guest.createdAt || guest.created_at || new Date()).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-charcoal-500 font-medium uppercase tracking-wide">Updated</p>
            <p className="text-sm font-semibold text-charcoal-900 mt-2">
              {new Date(guest.updatedAt || guest.updated_at || new Date()).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Notes */}
        {guest.notes && (
          <div className="mb-8">
            <p className="text-xs text-charcoal-500 font-medium uppercase tracking-wide mb-3">Notes</p>
            <p className="text-charcoal-700 leading-relaxed bg-charcoal-50 p-4 rounded-lg">{guest.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCall}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-charcoal-900 text-white hover:bg-charcoal-800 transition font-medium"
          >
            <Phone className="w-5 h-5" />
            Call
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp
          </button>
        </div>
      </div>
    </motion.div>
  );
};
