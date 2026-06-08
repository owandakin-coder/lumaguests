import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Toast as ToastType } from '../types';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const config = {
  success: { bg: 'bg-emerald-600', icon: CheckCircle },
  error:   { bg: 'bg-red-500',     icon: AlertCircle },
  info:    { bg: 'bg-blue-500',    icon: Info        },
};

export const Toast = ({ toast, onRemove }: ToastProps) => {
  const { bg, icon: Icon } = config[toast.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      exit={{    opacity: 0, y: 12, scale: 0.96  }}
      className={`${bg} text-white rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-lg min-w-[220px] max-w-[320px]`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => (
  <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
    <AnimatePresence>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </AnimatePresence>
  </div>
);
