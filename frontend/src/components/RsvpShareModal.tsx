import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Link2, MessageCircle, X } from 'lucide-react';
import { Event, Guest } from '../types';
import { rsvpService, storageService } from '../services/supabase';
import {
  buildGuestRsvpMessage,
  buildGuestRsvpWhatsAppUrl,
} from '../utils/rsvpShare';

interface RsvpShareModalProps {
  open: boolean;
  guest: Guest | null;
  event: Event | null;
  isLoading?: boolean;
  onClose: () => void;
}

export const RsvpShareModal = ({
  open,
  guest,
  event,
  isLoading = false,
  onClose,
}: RsvpShareModalProps) => {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [signedCoverUrl, setSignedCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    const raw = event?.cover_image_url;
    if (!raw) { setSignedCoverUrl(null); return; }
    let cancelled = false;
    storageService.getSignedCoverUrl(raw)
      .then(url => { if (!cancelled) setSignedCoverUrl(url); })
      .catch(() => { if (!cancelled) setSignedCoverUrl(raw); });
    return () => { cancelled = true; };
  }, [event?.cover_image_url]);

  const guestName = guest ? guest.fullName || guest.full_name : '';
  const rsvpLink = useMemo(
    () => rsvpService.buildPersonalRsvpLink(guest),
    [guest]
  );

  const message = useMemo(() => {
    if (!guest || !rsvpLink) {
      return '';
    }

    return buildGuestRsvpMessage(guestName, event, rsvpLink);
  }, [event, guest, guestName, rsvpLink]);

  const previewMessage = useMemo(() => {
    if (!message || !rsvpLink) {
      return '';
    }

    return message.replace(rsvpLink, 'קישור אישי לאישור הגעה');
  }, [message, rsvpLink]);

  const displayLink = useMemo(() => {
    if (!rsvpLink) {
      return '';
    }

    try {
      const url = new URL(rsvpLink);
      return `${url.origin}${url.pathname}`;
    } catch {
      return rsvpLink;
    }
  }, [rsvpLink]);

  const copyMessage = async () => {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const copyLink = async () => {
    if (!rsvpLink) return;
    await navigator.clipboard.writeText(rsvpLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openWhatsApp = () => {
    if (!guest || !message) return;
    window.open(buildGuestRsvpWhatsAppUrl(guest.phone, message), '_blank');
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-white"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="border-b border-charcoal-100 px-5 pt-5 pb-4">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-charcoal-200" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[18px] font-bold text-charcoal-900">שלח בקשת אישור הגעה</h3>
                  {guestName ? (
                    <p className="mt-1 text-[13px] text-charcoal-500 truncate">{guestName}</p>
                  ) : null}
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-charcoal-100 transition-transform active:scale-90"
                >
                  <X className="h-4 w-4 text-charcoal-600" />
                </button>
              </div>
            </div>

            <div className="max-h-[75dvh] space-y-4 overflow-y-auto px-5 py-5">
              {(signedCoverUrl || event?.cover_image_url) ? (
                <div
                  className="overflow-hidden rounded-2xl bg-charcoal-100"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
                >
                  <img
                    src={signedCoverUrl || event?.cover_image_url || ''}
                    alt={event?.event_name || 'Event cover'}
                    className="h-44 w-full object-cover"
                  />
                </div>
              ) : null}

              {isLoading ? (
                <div className="rounded-2xl bg-charcoal-50 px-4 py-6 text-center text-[13px] font-medium text-charcoal-500">
                  טוען את פרטי האירוע...
                </div>
              ) : !rsvpLink ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-[13px] font-medium leading-relaxed text-red-600">
                    לא הצלחנו ליצור קישור RSVP אישי למוזמן הזה.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-charcoal-50 px-4 py-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-charcoal-400">
                      תצוגה מקדימה
                    </p>
                    <p className="whitespace-pre-line text-[14px] leading-relaxed text-charcoal-800">
                      {previewMessage}
                    </p>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-charcoal-50 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-charcoal-100 bg-white">
                      <Link2 className="h-4 w-4 text-charcoal-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-charcoal-700">קישור RSVP אישי</p>
                      <p className="mt-1 text-[12px] text-charcoal-500">
                        בוואטסאפ יישלח הקישור המלא, כאן מוצגת תצוגה קצרה ונקייה.
                      </p>
                      <p className="mt-2 truncate font-mono text-[12px] text-charcoal-700" dir="ltr">
                        {displayLink}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <button
                  onClick={openWhatsApp}
                  disabled={!rsvpLink || isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 text-[15px] font-bold text-white transition-transform disabled:opacity-50 active:scale-[0.98]"
                  style={{ boxShadow: '0 4px 16px rgba(16,185,129,0.25)' }}
                >
                  <MessageCircle className="h-4 w-4" />
                  פתח WhatsApp
                </button>

                <button
                  onClick={copyMessage}
                  disabled={!rsvpLink || isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-charcoal-900 py-4 text-[15px] font-bold text-white transition-transform disabled:opacity-50 active:scale-[0.98]"
                >
                  <Copy className="h-4 w-4" />
                  {copiedMessage ? 'ההודעה הועתקה' : 'העתק הודעה'}
                </button>

                <button
                  onClick={copyLink}
                  disabled={!rsvpLink || isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-charcoal-200 bg-white py-4 text-[15px] font-bold text-charcoal-700 transition-transform disabled:opacity-50 active:scale-[0.98]"
                >
                  <Link2 className="h-4 w-4" />
                  {copiedLink ? 'קישור RSVP הועתק' : 'העתק קישור RSVP'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
