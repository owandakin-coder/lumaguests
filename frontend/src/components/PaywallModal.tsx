import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Zap } from 'lucide-react';

export const FREE_GUEST_LIMIT = 50;

interface PaywallModalProps {
  isOpen: boolean;
  guestCount: number;
  onClose: () => void;
}

export const PaywallModal = ({ isOpen, guestCount, onClose }: PaywallModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          style={{ backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={e => e.stopPropagation()}
            dir="rtl"
            className="bg-white w-full max-w-[430px] rounded-t-3xl p-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
          >
            <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-6" />

            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
                boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
              }}
            >
              <Crown className="w-8 h-8 text-amber-600" />
            </div>

            <h2 className="text-[24px] font-bold text-charcoal-900 text-center mb-1">שדרג לפרו</h2>
            <p className="text-[13px] text-charcoal-500 text-center mb-6 leading-relaxed">
              הגעת למגבלת {FREE_GUEST_LIMIT} מוזמנים בחינם.<br />
              יש לך {guestCount} מוזמנים כרגע. שדרג להוסיף ללא הגבלה.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-charcoal-50">
                <Zap className="w-5 h-5 text-charcoal-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-charcoal-700">חינם</p>
                  <p className="text-[11px] text-charcoal-400">עד {FREE_GUEST_LIMIT} מוזמנים</p>
                </div>
                <span className="text-[12px] font-bold text-charcoal-500">₪0</span>
              </div>

              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: 'linear-gradient(135deg,#FEF3C7,#FFFBEB)', border: '1.5px solid #C9A84C' }}
              >
                <Crown className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-charcoal-900">פרו — לאירוע אחד</p>
                  <p className="text-[11px] text-charcoal-500">מוזמנים ללא הגבלה + כל הפיצ'רים</p>
                </div>
                <span className="text-[14px] font-black text-amber-700">₪149</span>
              </div>
            </div>

            <button
              onClick={() => {
                window.open('mailto:hello@atzma.app?subject=שדרוג%20לפרו', '_blank');
                onClose();
              }}
              className="w-full py-4 rounded-2xl text-white text-[15px] font-bold active:scale-[0.98] transition-transform"
              style={{
                background: 'linear-gradient(135deg,#C9A84C,#A07A2E)',
                boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
              }}
            >
              שדרג עכשיו — ₪149
            </button>

            <button onClick={onClose}
              className="w-full py-3 mt-2 text-[13px] text-charcoal-400 font-medium">
              לא עכשיו
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
