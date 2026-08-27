import React from 'react';
import { InAppToast } from '../../hooks/useChromeNotifications';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  ListTodo, 
  Zap, 
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
        let icon = <Bell className="w-4 h-4 text-indigo-400" />;
        let borderClass = 'border-slate-700/80';
        let bgClass = 'bg-[#161B27]/95';

        if (toast.type === 'task') {
          icon = <ListTodo className="w-4 h-4 text-indigo-400" />;
          borderClass = 'border-indigo-500/40';
          bgClass = 'bg-indigo-950/90';
        } else if (toast.type === 'handover') {
          icon = <ArrowRightLeft className="w-4 h-4 text-amber-400" />;
          borderClass = 'border-amber-500/40';
          bgClass = 'bg-amber-950/90';
        } else if (toast.type === 'rework') {
          icon = <AlertTriangle className="w-4 h-4 text-rose-400" />;
          borderClass = 'border-rose-500/40';
          bgClass = 'bg-rose-950/90';
        } else if (toast.type === 'review') {
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
          borderClass = 'border-emerald-500/40';
          bgClass = 'bg-emerald-950/90';
        } else if (toast.type === 'log') {
          icon = <Zap className="w-4 h-4 text-cyan-400" />;
          borderClass = 'border-cyan-500/40';
          bgClass = 'bg-cyan-950/90';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto backdrop-blur-md border ${borderClass} ${bgClass} rounded-2xl p-3.5 shadow-2xl shadow-black/40 flex items-start gap-3 transition-all transform animate-in fade-in slide-in-from-top-3 duration-200`}
          >
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 shrink-0">
              {icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white truncate">
                  {toast.title}
                </h4>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {toast.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug line-clamp-2">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
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
