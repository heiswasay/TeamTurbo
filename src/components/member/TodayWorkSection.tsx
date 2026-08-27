import React, { useState, useMemo } from 'react';
import { 
  WorkEntry, 
  TaskStatus, 
  ReviewStatus, 
  DEFAULT_COMPANIES, 
  CompanyTag 
} from '../../types';
import { 
  formatDateLabel, 
  getTodayDateString 
} from '../../lib/dateUtils';
import { 
  Plus, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Clock3, 
  Sparkles, 
  Trash2, 
  MessageSquare, 
  ShieldCheck, 
  Lock,
  ChevronDown
} from 'lucide-react';

interface TodayWorkSectionProps {
  entries: WorkEntry[];
  companies: CompanyTag[];
  onAddEntry: (entry: Omit<WorkEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateEntry: (id: string, updates: Partial<WorkEntry>) => Promise<void>;
  onDeleteEntry?: (id: string) => Promise<void>;
  currentUserId: string;
  currentUserName: string;
}

export const TodayWorkSection: React.FC<TodayWorkSectionProps> = ({
  entries = [],
  companies = [],
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  currentUserId,
  currentUserName,
}) => {
  const todayStr = getTodayDateString();
  const [isAdding, setIsAdding] = useState(false);
  const [company, setCompany] = useState(companies?.[0]?.name || DEFAULT_COMPANIES[0]);
  const [taskText, setTaskText] = useState('');
  const [timeSpent, setTimeSpent] = useState('1h 30m');
  const [status, setStatus] = useState<TaskStatus>('completed');
  const [submitting, setSubmitting] = useState(false);

  // Available companies merge default list with managed company tags
  const activeCompanies = useMemo(() => {
    const list = (companies && companies.length > 0)
      ? companies.filter((c) => !c.archived).map((c) => c.name)
      : DEFAULT_COMPANIES;
    return Array.from(new Set(list));
  }, [companies]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;

    setSubmitting(true);
    try {
      await onAddEntry({
        userId: currentUserId,
        userName: currentUserName,
        date: todayStr,
        company,
        taskText: taskText.trim(),
        timeSpent: timeSpent.trim() || '1h',
        status,
        review: 'pending',
      });
      setTaskText('');
      setTimeSpent('1h 30m');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create entry:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (st: TaskStatus) => {
    switch (st) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock3 className="w-3.5 h-3.5" />
            In Progress
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Pending / Blocked
          </span>
        );
    }
  };

  const getReviewBadge = (rv: ReviewStatus) => {
    switch (rv) {
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Review OK
          </span>
        );
      case 'needs_rework':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            Needs Rework
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Prominent Bento Header Banner for Today */}
      <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-black tracking-widest uppercase">
                Active Workday
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {todayStr}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              Today's Live Work Logs
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {formatDateLabel(todayStr)} • {entries.length} {entries.length === 1 ? 'task recorded' : 'tasks recorded'}
            </p>
          </div>

          {!isAdding && (
            <button
              id="add-work-entry-btn"
              onClick={() => setIsAdding(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Work Entry
            </button>
          )}
        </div>

        {/* Inline Add Form */}
        {isAdding && (
          <form 
            onSubmit={handleCreateSubmit}
            className="mt-6 pt-6 border-t border-slate-800 bg-[#1F2636] rounded-2xl p-5 border border-slate-700/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                New Task Accomplishment
              </h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Company / Project
                </label>
                <div className="relative">
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-[#161B27] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8 font-medium"
                  >
                    {activeCompanies.map((c, idx) => (
                      <option key={`add-comp-${idx}-${c}`} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Time Spent
                </label>
                <input
                  type="text"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(e.target.value)}
                  placeholder="e.g. 2h 30m, 45m"
                  className="w-full bg-[#161B27] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Task Status
                </label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full bg-[#161B27] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8 font-semibold"
                  >
                    <option key="status-completed" value="completed">Completed</option>
                    <option key="status-in_progress" value="in_progress">In Progress</option>
                    <option key="status-pending" value="pending">Pending / Blocked</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Task Details & Deliverables
              </label>
              <textarea
                rows={3}
                required
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="Describe specific milestones, updates, deliveries or issues encountered..."
                className="w-full bg-[#161B27] border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-[#161B27] hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !taskText.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                {submitting ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* List of Today's Editable Cards */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="bg-[#161B27] border border-dashed border-slate-800 rounded-3xl p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No tasks logged yet for today</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
              Click the button above to log your first task. Entries can be edited directly with auto-save anytime throughout today!
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
            >
              Add First Task
            </button>
          </div>
        ) : (
          entries.map((entry) => (
            <TodayEntryCard
              key={entry.id}
              entry={entry}
              activeCompanies={activeCompanies}
              onUpdateEntry={onUpdateEntry}
            />
          ))
        )}
      </div>

    </div>
  );
};

// Sub-component for individual editable card with auto-save on blur
interface TodayEntryCardProps {
  entry: WorkEntry;
  activeCompanies: string[];
  onUpdateEntry: (id: string, updates: Partial<WorkEntry>) => Promise<void>;
}

const TodayEntryCard: React.FC<TodayEntryCardProps> = ({
  entry,
  activeCompanies,
  onUpdateEntry,
}) => {
  const [taskText, setTaskText] = useState(entry.taskText);
  const [timeSpent, setTimeSpent] = useState(entry.timeSpent);
  const [company, setCompany] = useState(entry.company);
  const [status, setStatus] = useState<TaskStatus>(entry.status);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleBlurOrChange = async (updates: Partial<WorkEntry>) => {
    setIsSaving(true);
    try {
      await onUpdateEntry(entry.id, updates);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl relative group transition-all hover:border-slate-700">
      
      {/* Top Bar: Company Pill, Time, Status Selector, and Admin Review Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Company dropdown */}
          <div className="relative">
            <select
              value={company}
              onChange={(e) => {
                const val = e.target.value;
                setCompany(val);
                handleBlurOrChange({ company: val });
              }}
              className="bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-indigo-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none pr-7 appearance-none"
            >
              {activeCompanies.map((c, idx) => (
                <option key={`card-${entry.id}-comp-${idx}-${c}`} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
          </div>

          {/* Time input */}
          <div className="flex items-center gap-1.5 bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <input
              type="text"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              onBlur={() => {
                if (timeSpent !== entry.timeSpent) {
                  handleBlurOrChange({ timeSpent });
                }
              }}
              placeholder="1h"
              className="bg-transparent border-none focus:outline-none w-16 text-xs text-white font-medium"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => {
                const val = e.target.value as TaskStatus;
                setStatus(val);
                handleBlurOrChange({ status: val });
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none pr-7 appearance-none border ${
                status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : status === 'in_progress'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              <option key="card-completed" value="completed">Completed</option>
              <option key="card-in_progress" value="in_progress">In Progress</option>
              <option key="card-pending" value="pending">Pending / Blocked</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Right Status Badges & Auto-save indicator */}
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-[11px] text-slate-400 animate-pulse font-medium">
              Saving...
            </span>
          )}
          {savedSuccess && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}

          {/* Admin Review Badge */}
          {entry.review === 'ok' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              REVIEW OK
            </span>
          )}
          {entry.review === 'needs_rework' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              NEEDS REWORK
            </span>
          )}
          {entry.review === 'pending' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800/80 text-slate-400 border border-slate-700">
              PENDING REVIEW
            </span>
          )}
        </div>

      </div>

      {/* Main Task Description — Inline editable textarea with Bento look */}
      <div className="mt-4">
        <textarea
          rows={2}
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          onBlur={() => {
            if (taskText !== entry.taskText) {
              handleBlurOrChange({ taskText });
            }
          }}
          className="w-full bg-[#1F2636] hover:bg-[#252E42] focus:bg-[#1F2636] border border-slate-700/60 focus:border-indigo-500 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-y leading-relaxed"
          placeholder="Click here to edit task text (auto-saves on blur)..."
        />
      </div>

      {/* Admin Remarks Section (Read-only for member) */}
      {entry.remarks && (
        <div className="mt-3 p-3.5 rounded-2xl bg-[#1F2636] border border-amber-500/20 text-xs flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-300 text-[11px] uppercase tracking-wider">
              Lead Remarks ({entry.reviewedByName || 'Team Lead'}):
            </span>
            <p className="text-slate-300 mt-1 italic leading-relaxed">"{entry.remarks}"</p>
          </div>
        </div>
      )}

    </div>
  );
};
