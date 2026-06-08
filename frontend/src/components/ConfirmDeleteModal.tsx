import { motion } from 'framer-motion';
import { Guest } from '../types';

interface ConfirmDeleteModalProps {
  guest: Guest | null;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const ConfirmDeleteModal = ({
  guest,
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) => {
  if (!isOpen || !guest) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-charcoal-900 mb-2">Delete Guest?</h2>
        <p className="text-charcoal-600 mb-6">
          Are you sure you want to delete <span className="font-semibold">{guest.fullName}</span>? This action
          cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-lg border border-charcoal-200 text-charcoal-900 font-semibold hover:bg-charcoal-50 transition disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
