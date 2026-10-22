import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Bell, X, Sparkles, Clock } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'alert';
  details?: {
    foodName?: string;
    quantity?: number;
    unit?: string;
    status?: string;
  };
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [newToast, ...prev]);

    // Auto dismiss after 7 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 7000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}

      {/* Floating Popup Notification Container */}
      <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-blue-500/30 ring-4 ring-blue-500/10 flex flex-col gap-2 animate-in slide-in-from-top-3 fade-in duration-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
                  {toast.type === 'alert' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : toast.type === 'info' ? (
                    <Bell className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {toast.title}
                  </h4>
                  <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" /> Just now in Receiver Board
                  </span>
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pl-10">
              {toast.message}
            </p>

            {toast.details && (
              <div className="ml-10 mt-1 p-2 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 flex items-center justify-between">
                <span>
                  <strong>{toast.details.quantity}</strong> {toast.details.unit || 'units'}
                </span>
                <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded-md text-[10px] uppercase tracking-wider">
                  {toast.details.status || 'Requested'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
