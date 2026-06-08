import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PremiumCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export const PremiumCard = ({ children, onClick, className = '' }: PremiumCardProps) => {
  return (
    <motion.div
      whileHover={onClick ? { y: -2 } : {}}
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 border border-charcoal-100 shadow-xs hover:shadow-sm transition ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};
