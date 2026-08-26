import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Loader2, 
  Ban, 
  Lock, 
  WifiOff, 
  Trash2,
  Check,
  X
} from 'lucide-react';

export type FeedbackType = 
  | 'SUCCESS' 
  | 'ERROR' 
  | 'WARNING' 
  | 'INFO' 
  | 'LOADING' 
  | 'CANCELLED' 
  | 'PERMISSION_DENIED' 
  | 'NETWORK_ERROR'
  | 'VALIDATION_FAILED';

export interface ToastItem {
  id: string;
  type: FeedbackType;
  message: string;
  duration?: number;
  createdAt: number;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning' | 'success';
  isDestructive?: boolean;
  icon?: 'trash' | 'alert' | 'info';
  onConfirm?: () => Promise<void> | void;
  onCancel?: () => void;
}

interface ActionFeedbackContextType {
  toasts: ToastItem[];
  showToast: (type: FeedbackType, message: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  
  // Specific action helpers
  showSuccess: (message: string, duration?: number) => string;
  showError: (message: string, duration?: number) => string;
  showWarning: (message: string, duration?: number) => string;
  showInfo: (message: string, duration?: number) => string;
  showLoading: (message: string) => () => void;
  showCancelled: (message?: string) => string;
  showPermissionDenied: (message?: string) => string;
  showNetworkError: (message?: string) => string;
  showValidationFailed: (message?: string) => string;
  handleError: (error: any, fallbackMessage?: string) => string;

  // Confirm dialog
  confirm: (options: ConfirmDialogOptions | string) => Promise<boolean>;

  // High-level safe async executor with duplicate click prevention & accurate feedback
  executeAction: <T>(options: {
    action: () => Promise<T>;
    loadingMsg?: string;
    successMsg?: string;
    errorMsg?: string;
    onCancel?: () => void;
  }) => Promise<T | null>;
}

const ActionFeedbackContext = createContext<ActionFeedbackContextType | undefined>(undefined);

export const ActionFeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: FeedbackType, message: string, duration = 4000): string => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const newToast: ToastItem = {
      id,
      type,
      message,
      duration,
      createdAt: Date.now()
    };

    setToasts((prev) => {
      // Avoid identical duplicates in rapid succession
      const filtered = prev.filter(
        (t) => !(t.message === message && t.type === type && Date.now() - t.createdAt < 1500)
      );
      // Keep max 5 toasts visible at once
      return [...filtered.slice(-4), newToast];
    });

    if (duration > 0 && type !== 'LOADING') {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  const showSuccess = useCallback((message: string, duration = 3500) => {
    const formatted = message.startsWith('✓') || message.startsWith('✏') || message.startsWith('🗑') 
      ? message 
      : `✓ ${message}`;
    return showToast('SUCCESS', formatted, duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration = 5000) => {
    const formatted = message.startsWith('✕') ? message : `✕ ${message}`;
    return showToast('ERROR', formatted, duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration = 4000) => {
    const formatted = message.startsWith('⚠') ? message : `⚠ ${message}`;
    return showToast('WARNING', formatted, duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration = 3500) => {
    const formatted = message.startsWith('ℹ') ? message : `ℹ ${message}`;
    return showToast('INFO', formatted, duration);
  }, [showToast]);

  const showLoading = useCallback((message: string) => {
    const formatted = message.startsWith('⏳') ? message : message;
    const id = showToast('LOADING', formatted, 0);
    return () => dismissToast(id);
  }, [showToast, dismissToast]);

  const showCancelled = useCallback((message = '🚫 Cancelled') => {
    const formatted = message.startsWith('🚫') ? message : `🚫 ${message}`;
    return showToast('CANCELLED', formatted, 2500);
  }, [showToast]);

  const showPermissionDenied = useCallback((message = '🔒 Permission Denied') => {
    const formatted = message.startsWith('🔒') ? message : `🔒 ${message}`;
    return showToast('PERMISSION_DENIED', formatted, 5000);
  }, [showToast]);

  const showNetworkError = useCallback((message = '📡 Network Error') => {
    const formatted = message.startsWith('📡') ? message : `📡 ${message}`;
    return showToast('NETWORK_ERROR', formatted, 5000);
  }, [showToast]);

  const showValidationFailed = useCallback((message = '⚠ Validation Failed') => {
    const formatted = message.startsWith('⚠') ? message : `⚠ Validation Failed: ${message}`;
    return showToast('VALIDATION_FAILED', formatted, 4000);
  }, [showToast]);

  const handleError = useCallback((error: any, fallbackMessage = 'Operation Failed'): string => {
    console.error('Action execution error:', error);
    const errCode = error?.code || '';
    const errMsg = error?.message || (typeof error === 'string' ? error : fallbackMessage);

    if (
      errCode === 'permission-denied' || 
      errMsg.toLowerCase().includes('permission') || 
      errMsg.toLowerCase().includes('unauthorized') ||
      errMsg.toLowerCase().includes('forbidden')
    ) {
      return showPermissionDenied(`Permission Denied: ${errMsg.replace(/permission[- ]?denied:?/i, '').trim() || 'You do not have permission for this action.'}`);
    }

    if (
      errCode === 'unavailable' || 
      errCode === 'network-request-failed' ||
      errMsg.toLowerCase().includes('network') ||
      errMsg.toLowerCase().includes('offline') ||
      errMsg.toLowerCase().includes('failed to fetch')
    ) {
      return showNetworkError(`Network Error: ${errMsg.replace(/network[- ]?error:?/i, '').trim() || 'Please check your internet connection.'}`);
    }

    if (errMsg.toLowerCase().includes('validation') || errMsg.toLowerCase().includes('required field') || errMsg.toLowerCase().includes('invalid')) {
      return showValidationFailed(errMsg);
    }

    return showError(errMsg || fallbackMessage);
  }, [showPermissionDenied, showNetworkError, showValidationFailed, showError]);

  const confirm = useCallback((options: ConfirmDialogOptions | string): Promise<boolean> => {
    const parsedOptions: ConfirmDialogOptions = typeof options === 'string' 
      ? { message: options } 
      : options;

    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options: parsedOptions,
        resolve
      });
    });
  }, []);

  const handleConfirmClose = useCallback((confirmed: boolean) => {
    if (!confirmState) return;
    const { resolve, options } = confirmState;
    setConfirmState(null);

    if (confirmed) {
      if (options.onConfirm) {
        Promise.resolve(options.onConfirm()).catch((err) => {
          handleError(err);
        });
      }
      resolve(true);
    } else {
      if (options.onCancel) {
        options.onCancel();
      }
      showCancelled('🚫 Cancelled');
      resolve(false);
    }
  }, [confirmState, handleError, showCancelled]);

  const executeAction = useCallback(async <T,>(options: {
    action: () => Promise<T>;
    loadingMsg?: string;
    successMsg?: string;
    errorMsg?: string;
    onCancel?: () => void;
  }): Promise<T | null> => {
    const { action, loadingMsg = 'Processing...', successMsg = '✓ Operation Successful', errorMsg = '✕ Operation Failed' } = options;
    const dismissLoading = showLoading(loadingMsg);
    try {
      const result = await action();
      dismissLoading();
      showSuccess(successMsg);
      return result;
    } catch (err: any) {
      dismissLoading();
      handleError(err, errorMsg);
      return null;
    }
  }, [showLoading, showSuccess, handleError]);

  return (
    <ActionFeedbackContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showLoading,
        showCancelled,
        showPermissionDenied,
        showNetworkError,
        showValidationFailed,
        handleError,
        confirm,
        executeAction
      }}
    >
      {children}

      {/* Global Toast Overlay Container */}
      <FeedbackToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global In-App Confirm Dialog */}
      {confirmState?.isOpen && (
        <ConfirmDialogModal
          options={confirmState.options}
          onConfirm={() => handleConfirmClose(true)}
          onCancel={() => handleConfirmClose(false)}
        />
      )}
    </ActionFeedbackContext.Provider>
  );
};

export const useFeedback = (): ActionFeedbackContextType => {
  const context = useContext(ActionFeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within an ActionFeedbackProvider');
  }
  return context;
};

// Subcomponent: Feedback Toast Notification Overlay
const FeedbackToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <aside 
      aria-label="Notifications and alerts"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        let bgClass = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 shadow-xl';
        let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;

        switch (toast.type) {
          case 'SUCCESS':
            bgClass = 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700 shadow-emerald-500/10 shadow-lg';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
            break;
          case 'ERROR':
            bgClass = 'bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-100 border-rose-300 dark:border-rose-700 shadow-rose-500/10 shadow-lg';
            icon = <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
            break;
          case 'WARNING':
          case 'VALIDATION_FAILED':
            bgClass = 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 shadow-amber-500/10 shadow-lg';
            icon = <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />;
            break;
          case 'LOADING':
            bgClass = 'bg-indigo-50 dark:bg-slate-900 text-indigo-900 dark:text-indigo-100 border-indigo-300 dark:border-indigo-700 shadow-indigo-500/10 shadow-lg';
            icon = <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />;
            break;
          case 'CANCELLED':
            bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 shadow-lg';
            icon = <Ban className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />;
            break;
          case 'PERMISSION_DENIED':
            bgClass = 'bg-red-50 dark:bg-red-950/80 text-red-900 dark:text-red-100 border-red-400 dark:border-red-700 shadow-red-500/10 shadow-lg';
            icon = <Lock className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />;
            break;
          case 'NETWORK_ERROR':
            bgClass = 'bg-orange-50 dark:bg-orange-950/80 text-orange-900 dark:text-orange-100 border-orange-300 dark:border-orange-700 shadow-orange-500/10 shadow-lg';
            icon = <WifiOff className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />;
            break;
          default:
            break;
        }

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-bottom-2 ${bgClass}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {icon}
              <p className="text-sm font-medium leading-snug break-words">{toast.message}</p>
            </div>
            {toast.type !== 'LOADING' && (
              <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 text-current opacity-70 hover:opacity-100"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </aside>
  );
};

// Subcomponent: In-App Accessible Confirmation Modal
const ConfirmDialogModal: React.FC<{
  options: ConfirmDialogOptions;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ options, onConfirm, onCancel }) => {
  const {
    title = 'Confirm Action',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmVariant = options.isDestructive ? 'danger' : 'primary',
    icon = options.isDestructive ? 'trash' : 'alert'
  } = options;

  let confirmBtnClass = 'bg-indigo-600 hover:bg-indigo-700 text-white';
  let iconComp = <AlertTriangle className="w-6 h-6 text-amber-500" />;

  if (confirmVariant === 'danger') {
    confirmBtnClass = 'bg-rose-600 hover:bg-rose-700 text-white';
    iconComp = <Trash2 className="w-6 h-6 text-rose-500" />;
  } else if (confirmVariant === 'warning') {
    confirmBtnClass = 'bg-amber-600 hover:bg-amber-700 text-white';
    iconComp = <AlertTriangle className="w-6 h-6 text-amber-500" />;
  } else if (confirmVariant === 'success') {
    confirmBtnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white';
    iconComp = <Check className="w-6 h-6 text-emerald-500" />;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
            {iconComp}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded-xl shadow-sm transition-colors ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
