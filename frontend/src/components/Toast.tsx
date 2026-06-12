import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Toast as ToastType } from '../types';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const config = {
  success: { accent: '#10B981', icon: CheckCircle },
  error:   { accent: '#F87171', icon: AlertCircle },
  info:    { accent: '#60A5FA', icon: Info        },
};

export const Toast = ({ toast, onRemove }: ToastProps) => {
  const { accent, icon: Icon } = config[toast.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      exit={{    opacity: 0, y: -8, scale: 0.96  }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[220px] max-w-[320px]"
      style={{
        background: '#1A1916',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        border: `1px solid rgba(255,255,255,0.08)`,
      }}
    >
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}20` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} strokeWidth={2.5} />
      </div>
      <p className="text-[13px] font-semibold text-white flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="opacity-40 hover:opacity-70 active:opacity-100 transition-opacity flex-shrink-0"
      >
        <X className="w-3.5 h-3.5 text-white" />
      </button>
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => (
  <div
    className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pt-4"
    style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
  >
    <AnimatePresence>
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </AnimatePresence>
  </div>
);
