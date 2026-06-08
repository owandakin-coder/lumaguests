import { motion } from 'framer-motion';
import { Phone, MessageCircle, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { Guest, RsvpStatus } from '../types';

interface GuestCardProps {
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onView: (guest: Guest) => void;
}

const rsvpColors: Record<RsvpStatus, { badge: string; text: string }> = {
  CONFIRMED: { badge: 'bg-green-100 text-green-700', text: 'text-green-600' },
  PENDING: { badge: 'bg-amber-100 text-amber-700', text: 'text-amber-600' },
  DECLINED: { badge: 'bg-gray-100 text-gray-700', text: 'text-gray-600' },
};

const categoryColors: Record<string, string> = {
  GROOM: 'bg-gold-100 text-gold-700',
  BRIDE: 'bg-pink-100 text-pink-700',
  FAMILY: 'bg-blue-100 text-blue-700',
  FRIENDS: 'bg-purple-100 text-purple-700',
  WORK: 'bg-slate-100 text-slate-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export const GuestCard = ({ guest, onEdit, onDelete, onView }: GuestCardProps) => {
  const fullName = guest.fullName || guest.full_name;
  const rsvpStatus = guest.rsvpStatus || guest.rsvp_status;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = `Hello ${fullName}! I wanted to reach out regarding the event.`;
    const encodedMessage = encodeURIComponent(message);
    const phone = guest.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${guest.phone}`;
  };

  const rsvpColor = rsvpColors[rsvpStatus];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={() => onView(guest)}
      className="bg-white border border-charcoal-200 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-charcoal-900">{fullName}</h3>
          <p className="text-sm text-charcoal-600 mt-1">{guest.phone}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-charcoal-400 group-hover:text-gold-500 transition" />
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[guest.category]}`}>
          {guest.category}
        </span>
        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${rsvpColor.badge}`}>
          {rsvpStatus}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-charcoal-100">
        <div>
          <p className="text-xs text-charcoal-500 font-medium">Companions</p>
          <p className="text-sm font-semibold text-charcoal-900 mt-1">{guest.companions}</p>
        </div>
        <div>
          <p className="text-xs text-charcoal-500 font-medium">Total People</p>
          <p className="text-sm font-semibold text-charcoal-900 mt-1">{1 + guest.companions}</p>
        </div>
      </div>

      {/* Notes */}
      {guest.notes && (
        <p className="text-sm text-charcoal-600 mb-4 line-clamp-2 italic">"{guest.notes}"</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-charcoal-900 text-white hover:bg-charcoal-800 transition text-sm font-medium"
          title="Call"
        >
          <Phone className="w-4 h-4" />
          <span className="hidden sm:inline">Call</span>
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition text-sm font-medium"
          title="WhatsApp"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(guest);
          }}
          className="p-2 rounded-lg hover:bg-gold-100 transition text-gold-600"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(guest);
          }}
          className="p-2 rounded-lg hover:bg-red-100 transition text-red-600"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
