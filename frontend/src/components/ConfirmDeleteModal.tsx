import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Guest } from '../types';

interface ConfirmDeleteModalProps {
  guest: Guest | null;
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal = ({ guest, isOpen, isLoading, onConfirm, onCancel }: ConfirmDeleteModalProps) => {
  const name = guest ? (guest.fullName || guest.full_name) : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0,  opacity: 1 }}
            exit={{ y: 60,  opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-[430px] rounded-t-3xl p-6 pb-10"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-6" />

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>

            <h3 className="text-[20px] font-bold text-charcoal-900 text-center mb-2">מחיקת מוזמן</h3>
            <p className="text-[14px] text-charcoal-500 text-center leading-relaxed mb-6">
              האם למחוק את <span className="font-bold text-charcoal-800">{name}</span> מרשימת המוזמנים?
              <br />לא ניתן לשחזר פעולה זו.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-red-500 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                style={{ boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}
              >
                {isLoading ? 'מוחק...' : 'כן, מחק'}
              </button>
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-charcoal-100 text-charcoal-700 text-[15px] font-bold active:scale-[0.98] transition-transform"
              >
                ביטול
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
