import React from 'react';
import { WorkEntry, ReviewStatus } from '../../types';
import { formatDateLabel } from '../../lib/dateUtils';
import { AdminEntryReviewCard } from './AdminLiveToday';
import { Clock, CheckCircle2, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface AdminUnreviewedQueueProps {
  entries: WorkEntry[];
  onUpdateReview: (entryId: string, review: ReviewStatus, remarks?: string) => Promise<void>;
  onDeleteEntry?: (entryId: string) => Promise<void>;
  adminName: string;
}

export const AdminUnreviewedQueue: React.FC<AdminUnreviewedQueueProps> = ({
  entries = [],
  onUpdateReview,
  onDeleteEntry,
  adminName,
}) => {
  // Pending entries sorted oldest first
  const pendingEntries = (entries || [])
    .filter((e) => e.review === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Backlog Queue
            </span>
            <span className="text-xs text-slate-400">
              Oldest First
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Unreviewed Queue ({pendingEntries.length} Pending)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Clear pending entries across all dates to ensure no team accomplishment is left unreviewed
          </p>
        </div>

        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
          Pending Total: <strong className="text-amber-400">{pendingEntries.length}</strong>
        </div>
      </div>

      {pendingEntries.length === 0 ? (
        <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Queue is clear!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All logged accomplishments have been reviewed and acknowledged.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {pendingEntries.map((entry) => (
            <div 
              key={entry.id}
              className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  {entry.userName}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatDateLabel(entry.date)}
                </span>
              </div>

              <AdminEntryReviewCard
                entry={entry}
                onUpdateReview={onUpdateReview}
                onDeleteEntry={onDeleteEntry}
                adminName={adminName}
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
