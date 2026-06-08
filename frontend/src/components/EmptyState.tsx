import { motion } from 'framer-motion';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = ({ emoji, title, description, action }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="text-6xl mb-4">{emoji}</div>
      <h3 className="text-xl font-semibold text-charcoal-900 mb-2">{title}</h3>
      {description && <p className="text-charcoal-600 mb-6 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 rounded-full bg-gold-500 text-white font-semibold hover:bg-gold-600 transition"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
};
