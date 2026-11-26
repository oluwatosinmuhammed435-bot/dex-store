import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, ShoppingBag, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'cart';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, durationMs: number) => {
      if (durationMs <= 0) return;
      const existingTimer = timersRef.current.get(id);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  const pauseTimer = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const variant: ToastVariant = options.variant ?? 'success';
      const durationMs = options.durationMs ?? 3600;

      setToasts((prev) => {
        const next = [...prev, { ...options, id, variant }];
        // Keep stack compact and crisp (max 3 simultaneous notifications)
        return next.slice(-3);
      });

      scheduleDismiss(id, durationMs);
      return id;
    },
    [scheduleDismiss]
  );

  const iconMap: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0" aria-hidden="true" />,
    cart: <ShoppingBag className="w-4 h-4 text-[#176B45] shrink-0" aria-hidden="true" />,
    info: <Info className="w-4 h-4 text-[#123D2A] shrink-0" aria-hidden="true" />,
    error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />,
  };

  const accentBorder: Record<ToastVariant, string> = {
    success: 'border-[#B8DCC5] bg-[#FFFFFF]',
    cart: 'border-[#A7D7BA] bg-[#FFFFFF]',
    info: 'border-[#DCE5DF] bg-[#FFFFFF]',
    error: 'border-red-200 bg-[#FFFFFF]',
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      {/* Accessible Non-Blocking Toast Region */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="fixed top-[4.5rem] right-3 left-3 sm:left-auto sm:right-5 sm:w-[360px] z-50 flex flex-col gap-2 pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onMouseEnter={() => pauseTimer(toast.id)}
              onMouseLeave={() => scheduleDismiss(toast.id, toast.durationMs ?? 3000)}
              onFocus={() => pauseTimer(toast.id)}
              onBlur={() => scheduleDismiss(toast.id, toast.durationMs ?? 3000)}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg ${accentBorder[toast.variant]}`}
            >
              <div
                className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  toast.variant === 'error' ? 'bg-red-50' : 'bg-[#EAF5EE]'
                }`}
              >
                {iconMap[toast.variant]}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-[#17231C] leading-snug">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-xs text-[#5C6B62] mt-0.5 line-clamp-2">{toast.description}</p>
                )}
                {toast.actionLabel && toast.onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onAction?.();
                      dismissToast(toast.id);
                    }}
                    className="mt-1.5 inline-flex items-center text-xs font-semibold text-[#176B45] hover:text-[#123D2A] underline underline-offset-2 dex-press"
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="p-1.5 -mr-1 -mt-1 rounded-lg text-[#7B8A80] hover:text-[#17231C] hover:bg-[#F2F6F3] transition-colors shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
