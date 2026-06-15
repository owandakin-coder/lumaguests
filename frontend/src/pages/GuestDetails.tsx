import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Phone, MessageCircle, Edit2, Trash2, ChevronRight,
  Users, Tag, StickyNote, Calendar, Link, CheckCircle,
} from 'lucide-react';
import { RsvpShareModal } from '../components/RsvpShareModal';
import { Guest, RsvpStatus } from '../types';
import { guestService, rsvpService } from '../services/supabase';
import { buildGuestRsvpMessage, buildGuestRsvpWhatsAppUrl } from '../utils/rsvpShare';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useEvent } from '../hooks/useEvent';

interface GuestDetailsProps {
  guestId: string;
  onBack: () => void;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
}

const rsvpConfig: Record<RsvpStatus, { label: string; dot: string; bg: string; text: string }> = {
  CONFIRMED: { label: 'אישר הגעה',    dot: '#10B981', bg: '#ECFDF5', text: '#065F46' },
  PENDING:   { label: 'ממתין לתשובה', dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
  DECLINED:  { label: 'לא מגיע',      dot: '#F87171', bg: '#FFF1F2', text: '#9F1239' },
};

const categoryLabel: Record<string, string> = {
  GROOM:'חתן', BRIDE:'כלה', FAMILY:'משפחה', FRIENDS:'חברים', WORK:'עבודה', OTHER:'אחר',
};
const categoryAccent: Record<string, string> = {
  GROOM:'#C9A84C', BRIDE:'#F9A8D4', FAMILY:'#93C5FD',
  FRIENDS:'#C4B5FD', WORK:'#94A3B8', OTHER:'#D1D5DB',
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

export const GuestDetails = ({ guestId, onBack, onEdit, onDelete }: GuestDetailsProps) => {
  const [guest, setGuest]     = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const auth = useSupabaseAuth();
  const { event } = useEvent();

  useEffect(() => { if (auth.user && event?.id) load(); }, [guestId, auth.user, event?.id]);

  const load = async () => {
    if (!auth.user || !event?.id) return;
    try { setLoading(true); setGuest(await guestService.getById(guestId, event.owner_user_id || auth.user.id, event.id)); }
    catch { /* silent */ } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="animate-pulse space-y-4 pt-2">
      <div className="h-9 w-9 bg-charcoal-100 rounded-xl" />
      <div className="h-48 bg-white rounded-3xl" />
      <div className="h-40 bg-white rounded-2xl" />
    </div>
  );

  if (!guest) return (
    <div className="flex flex-col items-center py-20">
      <p className="text-charcoal-500 mb-4">מוזמן לא נמצא</p>
      <button onClick={onBack} className="text-gold-600 font-bold text-sm">חזרה</button>
    </div>
  );

  const name    = guest.fullName || guest.full_name;
  const rsvp    = (guest.rsvpStatus || guest.rsvp_status) as RsvpStatus;
  const cfg     = rsvpConfig[rsvp];
  const accent  = categoryAccent[guest.category];
  const [abg, afg] = avatarBg(name);
  const created = new Date(guest.createdAt || guest.created_at || '').toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const respondedAt = guest.rsvp_responded_at
    ? new Date(guest.rsvp_responded_at).toLocaleDateString('he-IL', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const ensureRsvpToken = async () => {
    if (guest.rsvp_token) {
      return guest.rsvp_token;
    }

    if (!auth.user) {
      return null;
    }

    const token = rsvpService.generateToken();

    try {
      await guestService.update(guest.id, { rsvp_token: token }, event?.owner_user_id || auth.user.id, event?.id);
      setGuest((prev) => (prev ? { ...prev, rsvp_token: token } : prev));
      return token;
    } catch {
      return null;
    }
  };

  const ensureRsvpTokenReady = async () => {
    const token = await ensureRsvpToken();
    if (!token) {
      return null;
    }

    try {
      const isReady = await rsvpService.verifyToken(token);
      return isReady ? token : null;
    } catch {
      return null;
    }
  };

  const handleCall     = () => { window.location.href = `tel:${guest.phone}`; };
  const handleWhatsApp = async () => {
    const token = await ensureRsvpTokenReady();
    const personalLink = token ? rsvpService.buildPersonalRsvpLink({ rsvp_token: token }) : null;
    const url = token && personalLink
      ? buildGuestRsvpWhatsAppUrl(guest.phone, buildGuestRsvpMessage(name, event, personalLink))
      : `https://wa.me/${guest.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`שלום ${name}! רצינו ליצור איתך קשר לגבי האירוע.`)}`;
    window.open(url, '_blank');
  };
  const handleCopyLink = async () => {
    const token = await ensureRsvpTokenReady();
    if (!token) {
      window.alert('קישור ה-RSVP האישי לא זמין כרגע. צריך להריץ את RSVP_MIGRATION.sql ב-Supabase.');
      return;
    }
    try {
      const personalLink = rsvpService.buildPersonalRsvpLink({ rsvp_token: token });
      if (!personalLink) {
        return;
      }
      await navigator.clipboard.writeText(personalLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };
  const handleOpenShare = async () => {
    const token = await ensureRsvpTokenReady();
    if (!token) {
      window.alert('קישור ה-RSVP האישי לא זמין כרגע. צריך להריץ את RSVP_MIGRATION.sql ב-Supabase.');
      return;
    }

    setShareOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-1">

      {/* Back */}
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-xl bg-white flex items-center justify-center active:scale-90 transition-transform"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}
      >
        <ChevronRight className="w-5 h-5 text-charcoal-600" />
      </button>

      {/* Hero card — dark */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#1A1916 0%,#2D2A26 100%)', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
      >
        <div className="h-1.5 w-full" style={{ background: accent }} />

        <div className="p-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ background: abg, color: afg }}
            >
              {initials(name)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-bold text-white truncate">{name}</h1>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                <span className="text-[13px] font-semibold" style={{ color: cfg.dot }}>{cfg.label}</span>
                {guest.rsvp_via_link && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(168,85,247,0.2)' }}>
                    <Link className="w-3 h-3" style={{ color: '#A855F7' }} />
                    <span className="text-[10px] font-bold" style={{ color: '#A855F7' }}>דרך קישור</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleWhatsApp}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-transform"
              style={{ background: 'rgba(16,185,129,0.15)' }}
            >
              <MessageCircle className="w-5 h-5" style={{ color: '#10B981' }} strokeWidth={2} />
              <span className="text-[10px] font-bold" style={{ color: '#10B981' }}>וואטסאפ</span>
            </button>
            <button
              onClick={handleCall}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-transform"
              style={{ background: 'rgba(96,165,250,0.15)' }}
            >
              <Phone className="w-5 h-5" style={{ color: '#60A5FA' }} strokeWidth={2} />
              <span className="text-[10px] font-bold" style={{ color: '#60A5FA' }}>שיחה</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-transform"
              style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(168,85,247,0.12)' }}
            >
              <Link className="w-5 h-5" style={{ color: copied ? '#10B981' : '#A855F7' }} strokeWidth={2} />
              <span className="text-[10px] font-bold" style={{ color: copied ? '#10B981' : '#A855F7' }}>
                {copied ? 'הועתק!' : 'קישור'}
              </span>
            </button>
            <button
              onClick={() => onEdit(guest)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-transform"
              style={{ background: 'rgba(201,168,76,0.15)' }}
            >
              <Edit2 className="w-5 h-5" style={{ color: '#C9A84C' }} strokeWidth={2} />
              <span className="text-[10px] font-bold" style={{ color: '#C9A84C' }}>עריכה</span>
            </button>
          </div>

            <button
              onClick={handleOpenShare}
            className="w-full mt-3 py-3 rounded-2xl bg-white/8 text-white text-[13px] font-bold border border-white/10 active:scale-[0.98] transition-transform"
          >
            שלח בקשת אישור הגעה
          </button>
        </div>
      </div>

      {/* Info rows */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        {[
          { icon: Phone,    label: 'טלפון',       value: guest.phone,                              dir: 'ltr' as const },
          { icon: Tag,      label: 'קטגוריה',     value: categoryLabel[guest.category],            dir: 'rtl' as const },
          { icon: Users,    label: 'מלווים',      value: `${guest.companions} (${1+guest.companions} אנשים סך הכל)`, dir: 'rtl' as const },
          { icon: Calendar, label: 'תאריך הוספה', value: created,                                  dir: 'rtl' as const },
        ].map(({ icon: Icon, label, value, dir }, idx, arr) => (
          <div
            key={label}
            className={`flex items-center gap-3 px-4 py-3.5 ${idx < arr.length-1 ? 'border-b border-charcoal-100/60' : ''}`}
          >
            <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-charcoal-500" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-charcoal-400 font-medium">{label}</p>
              <p className="text-[14px] font-semibold text-charcoal-900 truncate" dir={dir}>{value}</p>
            </div>
          </div>
        ))}

        {guest.notes && (
          <div className="border-t border-charcoal-100/60 flex items-start gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <StickyNote className="w-4 h-4 text-charcoal-500" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-400 font-medium mb-0.5">הערות</p>
              <p className="text-[14px] text-charcoal-700 leading-relaxed">{guest.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* RSVP response info — shown when guest responded via link */}
      {guest.rsvp_via_link && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-3 border-b border-charcoal-100/60 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: '#A855F7' }} strokeWidth={2} />
            <p className="text-[12px] font-bold text-charcoal-700 uppercase tracking-wide">תגובה דרך קישור</p>
          </div>

          {respondedAt && (
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-charcoal-100/60">
              <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-charcoal-500" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[11px] text-charcoal-400 font-medium">תאריך תגובה</p>
                <p className="text-[14px] font-semibold text-charcoal-900">{respondedAt}</p>
              </div>
            </div>
          )}

          {guest.rsvp_public_note && (
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(168,85,247,0.1)' }}>
                <StickyNote className="w-4 h-4" style={{ color: '#A855F7' }} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[11px] font-medium mb-0.5" style={{ color: '#A855F7' }}>הודעה מהמוזמן</p>
                <p className="text-[14px] text-charcoal-700 leading-relaxed">{guest.rsvp_public_note}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(guest)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-200 bg-red-50 text-red-500 text-[14px] font-bold active:scale-[0.98] transition-transform"
      >
        <Trash2 className="w-4 h-4" />
        מחיקת מוזמן
      </button>

      <RsvpShareModal
        open={shareOpen}
        guest={guest}
        event={event}
        isLoading={false}
        onClose={() => setShareOpen(false)}
      />

    </motion.div>
  );
};
