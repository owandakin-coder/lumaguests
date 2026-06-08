import { motion } from 'framer-motion';
import { Phone, MessageCircle, ChevronLeft } from 'lucide-react';
import { Guest, RsvpStatus } from '../types';

interface GuestCardProps {
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onView: (guest: Guest) => void;
}

const rsvpBadge: Record<RsvpStatus, { label: string; cls: string }> = {
  CONFIRMED: { label: 'אישר',      cls: 'bg-emerald-100 text-emerald-700' },
  PENDING:   { label: 'ממתין',     cls: 'bg-amber-100 text-amber-700'     },
  DECLINED:  { label: 'לא מגיע',  cls: 'bg-red-50 text-red-500'          },
};

const categoryLabels: Record<string, string> = {
  GROOM: 'חתן', BRIDE: 'כלה', FAMILY: 'משפחה',
  FRIENDS: 'חברים', WORK: 'עבודה', OTHER: 'אחר',
};

const avatarColors = [
  'bg-gold-200 text-gold-800',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-pink-100 text-pink-700',
];

function getInitials(name: string) {
  return name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export const GuestCard = ({ guest, onView }: GuestCardProps) => {
  const fullName = guest.fullName || guest.full_name;
  const rsvpStatus = guest.rsvpStatus || guest.rsvp_status;
  const badge = rsvpBadge[rsvpStatus];
  const initials = getInitials(fullName);
  const ac = avatarColor(fullName);

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = encodeURIComponent(`שלום ${fullName}! רצינו ליצור איתך קשר לגבי האירוע.`);
    const phone = guest.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${guest.phone}`;
  };

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={() => onView(guest)}
      className="bg-white rounded-2xl px-4 py-3.5 cursor-pointer active:bg-charcoal-50 transition-colors"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-2xl ${ac} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-charcoal-900 truncate">{fullName}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal-400" dir="ltr">{guest.phone}</span>
            <span className="text-charcoal-200">·</span>
            <span className="text-xs text-charcoal-400">{categoryLabels[guest.category]}</span>
            <span className="text-charcoal-200">·</span>
            <span className="text-xs text-charcoal-400">{1 + guest.companions} איש</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleWhatsApp}
            className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center active:scale-90 transition-transform"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" strokeWidth={2} />
          </button>
          <button
            onClick={handleCall}
            className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Phone className="w-4 h-4 text-blue-600" strokeWidth={2} />
          </button>
          <ChevronLeft className="w-4 h-4 text-charcoal-300" />
        </div>
      </div>
    </motion.div>
  );
};
