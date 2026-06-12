import { motion } from 'framer-motion';
import { Phone, MessageCircle, Link } from 'lucide-react';
import { Guest, RsvpStatus, Event } from '../types';
import { rsvpService, toWaPhone } from '../services/supabase';

interface GuestCardProps {
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onView: (guest: Guest) => void;
  event?: Pick<Event, 'event_name' | 'event_date' | 'venue_name' | 'cover_image_url'> | null;
}

const rsvpCfg: Record<RsvpStatus, { label: string; dot: string; bg: string; text: string }> = {
  CONFIRMED: { label: 'אישר', dot: '#10B981', bg: '#ECFDF5', text: '#065F46' },
  PENDING: { label: 'ממתין', dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
  DECLINED: { label: 'לא מגיע', dot: '#F87171', bg: '#FFF1F2', text: '#9F1239' },
};

const catLabel: Record<string, string> = {
  GROOM: 'חתן',
  BRIDE: 'כלה',
  FAMILY: 'משפחה',
  FRIENDS: 'חברים',
  WORK: 'עבודה',
  OTHER: 'אחר',
};

const catAccent: Record<string, string> = {
  GROOM: '#C9A84C',
  BRIDE: '#F9A8D4',
  FAMILY: '#93C5FD',
  FRIENDS: '#C4B5FD',
  WORK: '#94A3B8',
  OTHER: '#D1D5DB',
};

const catBg: Record<string, string> = {
  GROOM: '#FEF3C7',
  BRIDE: '#FDF2F8',
  FAMILY: '#EFF6FF',
  FRIENDS: '#F5F3FF',
  WORK: '#F1F5F9',
  OTHER: '#F9FAFB',
};

const catTextColor: Record<string, string> = {
  GROOM: '#92400E',
  BRIDE: '#9D174D',
  FAMILY: '#1E40AF',
  FRIENDS: '#5B21B6',
  WORK: '#374151',
  OTHER: '#6B7280',
};

const avBgs = [
  ['#FDE68A', '#92400E'],
  ['#BFDBFE', '#1E40AF'],
  ['#DDD6FE', '#5B21B6'],
  ['#A7F3D0', '#065F46'],
  ['#FBCFE8', '#9D174D'],
  ['#FED7AA', '#9A3412'],
];

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function avBg(name: string) {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return avBgs[Math.abs(h) % avBgs.length];
}

export const GuestCard = ({ guest, onView, event }: GuestCardProps) => {
  const name = guest.fullName || guest.full_name;
  const status = (guest.rsvpStatus || guest.rsvp_status) as RsvpStatus;
  const r = rsvpCfg[status];
  const accent = catAccent[guest.category];
  const cBg   = catBg[guest.category] || '#F9FAFB';
  const cText = catTextColor[guest.category] || '#6B7280';
  const [abg, afg] = avBg(name);
  const viaLink = guest.rsvp_via_link;

  const handleWA = (e: React.MouseEvent) => {
    e.stopPropagation();
    const personalRsvpLink = rsvpService.buildPersonalRsvpLink(guest);
    const url = personalRsvpLink && guest.rsvp_token
      ? rsvpService.buildWhatsAppUrl(guest.phone, name, guest.rsvp_token, event)
      : `https://wa.me/${toWaPhone(guest.phone)}?text=${encodeURIComponent(`שלום ${name}! רצינו ליצור איתך קשר לגבי האירוע.`)}`;
    window.open(url, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${guest.phone}`;
  };

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={() => onView(guest)}
      className="bg-white rounded-2xl cursor-pointer overflow-hidden"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
    >
      <div className="flex">
        <div className="w-[3px] flex-shrink-0" style={{ background: accent }} />

        <div className="flex items-center gap-3.5 px-4 py-4 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ background: abg, color: afg }}
          >
            {initials(name)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-charcoal-900 truncate leading-tight mb-1">{name}</p>
            <p className="text-[12px] text-charcoal-400 mb-1.5" dir="ltr">{guest.phone}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: r.bg }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.dot }} />
                <span className="text-[10px] font-bold" style={{ color: r.text }}>{r.label}</span>
                {viaLink && (
                  <Link className="w-2.5 h-2.5 mr-0.5" style={{ color: '#A855F7' }} strokeWidth={2.5} />
                )}
              </div>
              <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full" style={{ background: cBg }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                <span className="text-[10px] font-bold" style={{ color: cText }}>{catLabel[guest.category] || 'אחר'}</span>
              </div>
              {guest.companions > 0 && (
                <span className="text-[10px] text-charcoal-400">+{guest.companions}</span>
              )}
            </div>
            {guest.notes ? (
              <p className="text-[11px] text-charcoal-400 truncate mt-1.5 italic">{guest.notes}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={handleWA}
              className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: '#ECFDF5' }}
            >
              <MessageCircle className="w-3.5 h-3.5" style={{ color: '#059669' }} strokeWidth={2.2} />
            </button>
            <button
              onClick={handleCall}
              className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: '#EFF6FF' }}
            >
              <Phone className="w-3.5 h-3.5" style={{ color: '#2563EB' }} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
