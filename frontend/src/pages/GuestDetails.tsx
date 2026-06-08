import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Phone, MessageCircle, Edit2, Trash2, Users, Tag, StickyNote, Calendar } from 'lucide-react';
import { Guest, RsvpStatus } from '../types';
import { guestService } from '../services/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface GuestDetailsProps {
  guestId: string;
  onBack: () => void;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
}

const rsvpConfig: Record<RsvpStatus, { label: string; cls: string }> = {
  CONFIRMED: { label: 'אישר הגעה',  cls: 'bg-emerald-100 text-emerald-700' },
  PENDING:   { label: 'ממתין לתשובה', cls: 'bg-amber-100 text-amber-700'  },
  DECLINED:  { label: 'לא מגיע',    cls: 'bg-red-50 text-red-500'          },
};

const categoryLabels: Record<string, string> = {
  GROOM: 'חתן', BRIDE: 'כלה', FAMILY: 'משפחה',
  FRIENDS: 'חברים', WORK: 'עבודה', OTHER: 'אחר',
};

const avatarColors = [
  'bg-gold-200 text-gold-800', 'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700', 'bg-pink-100 text-pink-700',
];

function getInitials(name: string) {
  return name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

export const GuestDetails = ({ guestId, onBack, onEdit, onDelete }: GuestDetailsProps) => {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = useSupabaseAuth();

  useEffect(() => {
    if (auth.user) loadGuest();
  }, [guestId, auth.user]);

  const loadGuest = async () => {
    if (!auth.user) return;
    try {
      setLoading(true);
      const data = await guestService.getById(guestId, auth.user.id);
      setGuest(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-9 w-9 bg-charcoal-100 rounded-xl" />
        <div className="h-32 bg-white rounded-3xl" />
        <div className="h-48 bg-white rounded-3xl" />
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="text-center py-16">
        <p className="text-charcoal-500">מוזמן לא נמצא</p>
        <button onClick={onBack} className="mt-4 text-gold-600 font-semibold text-sm">חזרה</button>
      </div>
    );
  }

  const name    = guest.fullName || guest.full_name;
  const rsvp    = guest.rsvpStatus || guest.rsvp_status;
  const badge   = rsvpConfig[rsvp];
  const initials = getInitials(name);
  const ac      = avatarColor(name);
  const created = new Date(guest.createdAt || guest.created_at || '').toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const handleCall      = () => { window.location.href = `tel:${guest.phone}`; };
  const handleWhatsApp  = () => {
    const msg = encodeURIComponent(`שלום ${name}! רצינו ליצור איתך קשר לגבי האירוע.`);
    const phone = guest.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Back */}
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-transform">
        <ChevronRight className="w-5 h-5 text-charcoal-600" />
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-3xl p-5" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-3xl ${ac} flex items-center justify-center text-xl font-bold flex-shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-charcoal-900 truncate">{name}</h1>
            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-emerald-50 active:scale-95 transition-transform"
          >
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-[10px] font-semibold text-emerald-700">וואטסאפ</span>
          </button>
          <button
            onClick={handleCall}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-blue-50 active:scale-95 transition-transform"
          >
            <Phone className="w-5 h-5 text-blue-600" />
            <span className="text-[10px] font-semibold text-blue-700">שיחה</span>
          </button>
          <button
            onClick={() => onEdit(guest)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gold-50 active:scale-95 transition-transform"
          >
            <Edit2 className="w-5 h-5 text-gold-600" />
            <span className="text-[10px] font-semibold text-gold-700">עריכה</span>
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        {[
          { icon: Phone,     label: 'טלפון',      value: guest.phone,                   dir: 'ltr' as const },
          { icon: Tag,       label: 'קטגוריה',    value: categoryLabels[guest.category], dir: 'rtl' as const },
          { icon: Users,     label: 'מלווים',     value: `${guest.companions} (סך הכל ${1 + guest.companions} אנשים)`, dir: 'rtl' as const },
          { icon: Calendar,  label: 'תאריך הוספה', value: created,                       dir: 'rtl' as const },
        ].map(({ icon: Icon, label, value, dir }, idx, arr) => (
          <div
            key={label}
            className={`flex items-center gap-3 px-4 py-3.5 ${idx < arr.length - 1 ? 'border-b border-charcoal-100/60' : ''}`}
          >
            <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-charcoal-500" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-charcoal-400 font-medium">{label}</p>
              <p className="text-sm font-semibold text-charcoal-900 truncate" dir={dir}>{value}</p>
            </div>
          </div>
        ))}

        {/* Notes */}
        {guest.notes && (
          <div className="border-t border-charcoal-100/60 px-4 py-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <StickyNote className="w-4 h-4 text-charcoal-500" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-400 font-medium mb-0.5">הערות</p>
              <p className="text-sm text-charcoal-700 leading-relaxed">{guest.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Timeline placeholder */}
      <div className="bg-white rounded-3xl p-4 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <p className="text-xs text-charcoal-400">היסטוריית תקשורת — בקרוב</p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(guest)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold active:scale-[0.98] transition-transform"
      >
        <Trash2 className="w-4 h-4" />
        מחיקת מוזמן
      </button>
    </motion.div>
  );
};
