import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * Adaptive Overlay:
 * - On mobile (< sm): slides smoothly upward as a native app-style Bottom Sheet.
 * - On desktop (sm+): centers smoothly with spring scale and crisp backdrop dim.
 * Handles Escape key dismissal, backdrop tap dismissal, overscroll-containment,
 * and restores keyboard focus to the trigger control on close.
 */
export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClass = 'sm:max-w-lg',
  children,
}) => {
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // Focus close control neatly after opening frame
      const frame = requestAnimationFrame(() => {
        closeBtnRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
        >
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0E3021]/45 backdrop-blur-[2px] overscroll-contain"
            aria-hidden="true"
          />

          {/* Bottom Sheet (mobile) / Centered Dialog (desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className={`relative w-full ${maxWidthClass} bg-[#FFFFFF] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-[#E2EAE5] flex flex-col max-h-[90dvh] overflow-hidden overscroll-contain`}
          >
            {/* Mobile Drag Handle Visual Affordance */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-[#C7D8CD]" />
            </div>

            {/* Header */}
            <div className="px-5 py-3.5 sm:py-4 border-b border-[#E2EAE5] bg-[#FFFFFF] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                {title && (
                  <h2
                    id={titleId}
                    className="text-base sm:text-lg font-bold text-[#17231C] tracking-tight truncate"
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs text-[#5C6B62] truncate mt-0.5">{subtitle}</p>
                )}
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-10 h-10 -mr-1.5 rounded-xl inline-flex items-center justify-center text-[#5C6B62] hover:text-[#17231C] hover:bg-[#EAF5EE] transition-colors shrink-0 dex-press"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-safe-bottom">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
