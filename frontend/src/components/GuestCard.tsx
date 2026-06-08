import { motion } from 'framer-motion';
import { Phone, MessageCircle } from 'lucide-react';
import { Guest, RsvpStatus } from '../types';

interface GuestCardProps {
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onView: (guest: Guest) => void;
}

const rsvp = {
  CONFIRMED: { label: 'אישר',     dot: '#10B981', bg: '#ECFDF5', text: '#065F46' },
  PENDING:   { label: 'ממתין',    dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
  DECLINED:  { label: 'לא מגיע', dot: '#F87171', bg: '#FFF1F2', text: '#9F1239' },
} satisfies Record<RsvpStatus, { label: string; dot: string; bg: string; text: string }>;

const categoryAccent: Record<string, string> = {
  GROOM:   '#C9A84C', // gold
  BRIDE:   '#F9A8D4', // pink
  FAMILY:  '#93C5FD', // blue
  FRIENDS: '#C4B5FD', // purple
  WORK:    '#94A3B8', // slate
  OTHER:   '#D1D5DB', // gray
};
const categoryLabel: Record<string, string> = {
  GROOM:'חתן', BRIDE:'כלה', FAMILY:'משפחה', FRIENDS:'חברים', WORK:'עבודה', OTHER:'אחר',
};

const avatarBgs = [
  ['#FDE68A','#92400E'],['#BFDBFE','#1E40AF'],
  ['#DDD6FE','#5B21B6'],['#A7F3D0','#065F46'],
  ['#FBCFE8','#9D174D'],['#FED7AA','#9A3412'],
];
function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return p.length===1 ? p[0][0].toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase();
}
function avatarBg(name: string) {
  let h=0; for(const c of name) h=c.charCodeAt(0)+((h<<5)-h);
  return avatarBgs[Math.abs(h)%avatarBgs.length];
}

export const GuestCard = ({ guest, onView }: GuestCardProps) => {
  const name   = guest.fullName || guest.full_name;
  const status = (guest.rsvpStatus || guest.rsvp_status) as RsvpStatus;
  const r      = rsvp[status];
  const accent = categoryAccent[guest.category];
  const [abg, afg] = avatarBg(name);

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = encodeURIComponent(`שלום ${name}! רצינו ליצור איתך קשר לגבי האירוע.`);
    window.open(`https://wa.me/${guest.phone.replace(/\D/g,'')}?text=${msg}`,'_blank');
  };
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${guest.phone}`;
  };

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={() => onView(guest)}
      className="bg-white rounded-2xl cursor-pointer active:bg-charcoal-50/30 transition-colors overflow-hidden"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Category accent bar — right side (RTL start) */}
      <div className="flex">
        <div className="w-1 flex-shrink-0 rounded-r-2xl" style={{ background: accent }} />

        <div className="flex items-center gap-3 px-3.5 py-3.5 flex-1 min-w-0">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ background: abg, color: afg }}
          >
            {initials(name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[15px] font-bold text-charcoal-900 truncate leading-tight">{name}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Status badge */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: r.bg }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.dot }} />
                <span className="text-[10px] font-bold" style={{ color: r.text }}>{r.label}</span>
              </div>
              <span className="text-[11px] text-charcoal-400">·</span>
              <span className="text-[11px] text-charcoal-400">{categoryLabel[guest.category]}</span>
              <span className="text-[11px] text-charcoal-400">·</span>
              <span className="text-[11px] text-charcoal-400">{1+guest.companions} איש</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleWhatsApp}
              className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: '#ECFDF5' }}
            >
              <MessageCircle className="w-3.5 h-3.5" style={{ color: '#059669' }} strokeWidth={2.2}/>
            </button>
            <button
              onClick={handleCall}
              className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: '#EFF6FF' }}
            >
              <Phone className="w-3.5 h-3.5" style={{ color: '#2563EB' }} strokeWidth={2.2}/>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
