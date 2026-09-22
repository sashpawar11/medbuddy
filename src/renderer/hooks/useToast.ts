import { useState, useCallback } from 'react';
import type { ToastMessage } from '../components/common/Toast';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    dismissToast,
    showSuccess: (title: string, message?: string) => addToast({ type: 'success', title, message }),
    showError: (title: string, message?: string) => addToast({ type: 'error', title, message }),
    showInfo: (title: string, message?: string) => addToast({ type: 'info', title, message }),
  };
}
