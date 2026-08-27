import React from 'react';
import { InAppToast } from '../../hooks/useChromeNotifications';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  ListTodo, 
  Zap, 
  RotateCcw,
  X 
} from 'lucide-react';

interface NotificationToastsProps {
  toasts: InAppToast[];
  onDismiss: (id: string) => void;
}

export const NotificationToasts: React.FC<NotificationToastsProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Bell className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
        let borderLeftClass = 'border-l-indigo-500';
        let iconBgClass = 'bg-indigo-50 border-indigo-200/80 text-indigo-600 dark:bg-indigo-950/60 dark:border-indigo-800/60 dark:text-indigo-400';

        if (toast.type === 'task') {
          icon = <ListTodo className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
          borderLeftClass = 'border-l-indigo-500';
          iconBgClass = 'bg-indigo-50 border-indigo-200/80 text-indigo-600 dark:bg-indigo-950/60 dark:border-indigo-800/60 dark:text-indigo-400';
        } else if (toast.type === 'reopen') {
          icon = <RotateCcw className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
          borderLeftClass = 'border-l-sky-500';
          iconBgClass = 'bg-sky-50 border-sky-200/80 text-sky-600 dark:bg-sky-950/60 dark:border-sky-800/60 dark:text-sky-400';
        } else if (toast.type === 'handover') {
          icon = <ArrowRightLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
          borderLeftClass = 'border-l-amber-500';
          iconBgClass = 'bg-amber-50 border-amber-200/80 text-amber-600 dark:bg-amber-950/60 dark:border-amber-800/60 dark:text-amber-400';
        } else if (toast.type === 'rework') {
          icon = <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
          borderLeftClass = 'border-l-rose-500';
          iconBgClass = 'bg-rose-50 border-rose-200/80 text-rose-600 dark:bg-rose-950/60 dark:border-rose-800/60 dark:text-rose-400';
        } else if (toast.type === 'review') {
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
          borderLeftClass = 'border-l-emerald-500';
          iconBgClass = 'bg-emerald-50 border-emerald-200/80 text-emerald-600 dark:bg-emerald-950/60 dark:border-emerald-800/60 dark:text-emerald-400';
        } else if (toast.type === 'log') {
          icon = <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
          borderLeftClass = 'border-l-cyan-500';
          iconBgClass = 'bg-cyan-50 border-cyan-200/80 text-cyan-600 dark:bg-cyan-950/60 dark:border-cyan-800/60 dark:text-cyan-400';
        }

        return (
          <div
            key={toast.id}
            className={`notification-toast-item pointer-events-auto backdrop-blur-md bg-white dark:bg-[#161B27] border border-slate-200 dark:border-slate-700/80 ${borderLeftClass} border-l-4 rounded-2xl p-3.5 shadow-xl shadow-slate-900/10 dark:shadow-black/60 flex items-start gap-3 transition-all transform animate-in fade-in slide-in-from-top-3 duration-200`}
          >
            <div className={`p-2 rounded-xl border shrink-0 ${iconBgClass}`}>
              {icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {toast.title}
                </h4>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                  {toast.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug line-clamp-2">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

