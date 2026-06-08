import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { HE } from '../constants/he';

interface FloatingAddButtonProps {
  onClick: () => void;
}

export const FloatingAddButton = ({ onClick }: FloatingAddButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-28 left-6 right-6 flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 text-white font-semibold shadow-lg hover:shadow-xl transition z-30"
      title={HE.actions.addGuest}
    >
      <Plus className="w-5 h-5" />
      <span>{HE.actions.addGuest}</span>
    </motion.button>
  );
};
