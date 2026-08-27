import React, { useState } from 'react';
import { WorkEntry } from '../../types';
import { formatDateLabel } from '../../lib/dateUtils';
import { AlertCircle, Send, CheckCircle2, MessageSquare, CornerDownRight } from 'lucide-react';

interface NeedsReworkAlertProps {
  reworkEntries: WorkEntry[];
  onAddFollowUpNote: (entryId: string, note: string) => Promise<void>;
}

export const NeedsReworkAlert: React.FC<NeedsReworkAlertProps> = ({
  reworkEntries = [],
  onAddFollowUpNote,
}) => {
  const [activeNotes, setActiveNotes] = useState<{ [id: string]: string }>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  if (!reworkEntries || reworkEntries.length === 0) return null;

  const handleSubmitNote = async (entryId: string) => {
    const note = activeNotes[entryId];
    if (!note || !note.trim()) return;

    setSubmittingId(entryId);
    try {
      await onAddFollowUpNote(entryId, note.trim());
      setActiveNotes((prev) => ({ ...prev, [entryId]: '' }));
    } catch (err) {
      console.error('Failed to submit follow-up note:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="bg-[#161B27] border-2 border-rose-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-3.5 mb-5">
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl animate-pulse">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Action Required: Rework Requested ({reworkEntries.length})
          </h3>
          <p className="text-xs text-rose-200/80 mt-0.5">
            The team lead has requested adjustments on the following tasks. Please review remarks and submit a follow-up note.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {reworkEntries.map((entry) => (
          <div 
            key={entry.id}
            className="bg-[#1F2636] border border-rose-900/40 rounded-2xl p-5 space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-300">
                  {entry.company}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 font-medium">
                  {formatDateLabel(entry.date)}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 font-medium">{entry.timeSpent}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                Needs Rework
              </span>
            </div>

            {/* Original Task */}
            <div className="text-xs text-slate-200 bg-[#161B27] p-3.5 rounded-xl border border-slate-700/60 leading-relaxed">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Original Log:</span>
              {entry.taskText}
            </div>

            {/* Lead's Remarks */}
            <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex items-start gap-2.5 leading-relaxed">
              <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 text-[11px] uppercase tracking-wider">
                  Remarks ({entry.reviewedByName || 'Lead'}):
                </span>
                <p className="mt-1">{entry.remarks || 'Please revise this task and clarify deliverable.'}</p>
              </div>
            </div>

            {/* Previous Follow-up note if already submitted */}
            {entry.followUpNote && (
              <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300 text-[11px] uppercase tracking-wider">Your Submitted Follow-up:</span>
                  <p className="mt-1">{entry.followUpNote}</p>
                </div>
              </div>
            )}

            {/* Follow-up Note Form */}
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1 uppercase tracking-wider">
                <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" />
                {entry.followUpNote ? 'Update Follow-up Note / Progress' : 'Submit Resolution / Follow-up Note'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activeNotes[entry.id] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveNotes((prev) => ({ ...prev, [entry.id]: val }));
                  }}
                  placeholder="e.g. Revised copy uploaded to drive and sent for review..."
                  className="flex-1 bg-[#161B27] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => handleSubmitNote(entry.id)}
                  disabled={submittingId === entry.id || !(activeNotes[entry.id] || '').trim()}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 shadow-lg shadow-rose-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingId === entry.id ? 'Submitting...' : 'Submit Note'}
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};
