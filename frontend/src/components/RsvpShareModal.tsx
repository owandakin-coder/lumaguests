import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Copy, Image as ImageIcon, Link2, MessageCircle, X } from 'lucide-react';
import { Event, Guest } from '../types';
import {
  buildPublicRsvpLink,
  buildPublicRsvpMessage,
  buildPublicRsvpWhatsAppUrl,
  validatePublicRsvpShare,
} from '../utils/rsvpShare';

interface RsvpShareModalProps {
  open: boolean;
  guest: Guest | null;
  event: Event | null;
  isLoading?: boolean;
  onClose: () => void;
}

export const RsvpShareModal = ({ open, guest, event, isLoading = false, onClose }: RsvpShareModalProps) => {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const guestName = guest ? guest.fullName || guest.full_name : '';
  const error = useMemo(() => {
    if (isLoading) {
      return null;
    }

    return validatePublicRsvpShare(event);
  }, [event, isLoading]);
  const rsvpLink = useMemo(() => buildPublicRsvpLink(event), [event]);
  const message = useMemo(() => {
    if (!event || !guest || error) {
      return '';
    }

    return buildPublicRsvpMessage(guestName, event);
  }, [error, event, guest, guestName]);

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
    window.open(buildPublicRsvpWhatsAppUrl(guest.phone, message), '_blank');
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-[430px] rounded-t-3xl overflow-hidden"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="px-5 pt-5 pb-4 border-b border-charcoal-100">
              <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-bold text-charcoal-900">שלח בקשת אישור הגעה</h3>
                  {guestName && (
                    <p className="text-[12px] text-charcoal-400 mt-1">{guestName}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-charcoal-100 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-charcoal-600" />
                </button>
              </div>
            </div>

            <div className="px-5 py-5 space-y-4 max-h-[75dvh] overflow-y-auto">
              {event?.cover_image_url ? (
                <div className="rounded-2xl overflow-hidden bg-charcoal-100" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                  <img
                    src={event.cover_image_url}
                    alt={event.event_name || 'Event cover'}
                    className="w-full h-44 object-cover"
                  />
                </div>
              ) : (
                <div
                  className="rounded-2xl border border-dashed border-charcoal-200 bg-charcoal-50 h-28 flex items-center justify-center gap-2 text-charcoal-400"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-[12px] font-medium">אין תמונת אירוע לתצוגה מקדימה</span>
                </div>
              )}

              {isLoading ? (
                <div className="rounded-2xl bg-charcoal-50 px-4 py-6 text-center text-[13px] font-medium text-charcoal-500">
                  טוען את פרטי האירוע...
                </div>
              ) : error ? (
                <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] font-medium text-red-600 leading-relaxed">{error}</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-charcoal-50 px-4 py-4">
                    <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wide mb-2">תצוגה מקדימה</p>
                    <p className="text-[14px] text-charcoal-800 leading-relaxed whitespace-pre-line">{message}</p>
                  </div>

                  <div className="rounded-2xl bg-charcoal-50 px-4 py-3">
                    <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wide mb-1">קישור RSVP ציבורי</p>
                    <p className="text-[12px] text-charcoal-700 font-mono break-all" dir="ltr">{rsvpLink}</p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <button
                  onClick={openWhatsApp}
                  disabled={!!error || isLoading}
                  className="w-full py-4 rounded-2xl bg-green-500 text-white text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                  style={{ boxShadow: '0 4px 16px rgba(16,185,129,0.25)' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  פתח WhatsApp
                </button>

                <button
                  onClick={copyMessage}
                  disabled={!!error || isLoading}
                  className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  <Copy className="w-4 h-4" />
                  {copiedMessage ? 'ההודעה הועתקה' : 'העתק הודעה'}
                </button>

                <button
                  onClick={copyLink}
                  disabled={!!error || isLoading}
                  className="w-full py-4 rounded-2xl bg-white border border-charcoal-200 text-charcoal-700 text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  <Link2 className="w-4 h-4" />
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
