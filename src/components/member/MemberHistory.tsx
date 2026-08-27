import React, { useState, useMemo } from 'react';
import { WorkEntry, TaskStatus, ReviewStatus, CompanyTag, DEFAULT_COMPANIES } from '../../types';
import { formatDateLabel, isToday, getTodayDateString } from '../../lib/dateUtils';
import { 
  Calendar, 
  Lock, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Filter, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface MemberHistoryProps {
  entries: WorkEntry[];
  companies: CompanyTag[];
}

export const MemberHistory: React.FC<MemberHistoryProps> = ({
  entries = [],
  companies = [],
}) => {
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<string>('all');

  const activeCompanies = useMemo(() => {
    const list = (companies && companies.length > 0)
      ? companies.filter((c) => !c.archived).map((c) => c.name)
      : DEFAULT_COMPANIES;
    return Array.from(new Set(list));
  }, [companies]);

  // Filter out today's entries from historical section (since today's entries have their prominent top view)
  const pastEntries = useMemo(() => {
    return (entries || []).filter((e) => e.date < todayStr);
  }, [entries, todayStr]);

  // Apply filters
  const filteredPastEntries = useMemo(() => {
    return pastEntries.filter((entry) => {
      if (selectedCompany !== 'all' && entry.company !== selectedCompany) return false;
      if (selectedStatus !== 'all' && entry.status !== selectedStatus) return false;
      if (selectedReview !== 'all' && entry.review !== selectedReview) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = (entry.taskText || '').toLowerCase().includes(q);
        const remarkMatch = (entry.remarks || '').toLowerCase().includes(q);
        const noteMatch = (entry.followUpNote || '').toLowerCase().includes(q);
        if (!textMatch && !remarkMatch && !noteMatch) return false;
      }
      return true;
    });
  }, [pastEntries, selectedCompany, selectedStatus, selectedReview, searchQuery]);

  // Group filtered entries by date (descending)
  const groupedByDate = useMemo(() => {
    const groups: { [date: string]: WorkEntry[] } = {};
    for (const entry of filteredPastEntries) {
      if (!groups[entry.date]) groups[entry.date] = [];
      groups[entry.date].push(entry);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredPastEntries]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-400" />
            My Work History (Archived & Locked)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Previous days are permanently read-only per team verification policy
          </p>
        </div>

        {/* Search & Filter Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative min-w-[180px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past logs..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          {/* Company filter */}
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option key="filter-comp-all" value="all">All Companies</option>
            {activeCompanies.map((c, idx) => (
              <option key={`filter-comp-${idx}-${c}`} value={c}>{c}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option key="filter-status-all" value="all">All Statuses</option>
            <option key="filter-status-completed" value="completed">Completed</option>
            <option key="filter-status-in_progress" value="in_progress">In Progress</option>
            <option key="filter-status-pending" value="pending">Pending</option>
          </select>

          {/* Review status filter */}
          <select
            value={selectedReview}
            onChange={(e) => setSelectedReview(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option key="filter-review-all" value="all">All Reviews</option>
            <option key="filter-review-ok" value="ok">Review OK</option>
            <option key="filter-review-needs_rework" value="needs_rework">Needs Rework</option>
            <option key="filter-review-pending" value="pending">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Date List View */}
      {groupedByDate.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-400">No past logs found matching criteria</p>
          <p className="text-xs text-slate-600 mt-0.5">As you complete days, historical logs will accumulate here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedByDate.map(([dateStr, dateEntries]) => {
            const isExpanded = selectedDate === dateStr;
            const completedCount = dateEntries.filter((e) => e.status === 'completed').length;
            const reviewedOkCount = dateEntries.filter((e) => e.review === 'ok').length;
            const needsReworkCount = dateEntries.filter((e) => e.review === 'needs_rework').length;

            return (
              <div 
                key={dateStr}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-slate-700"
              >
                {/* Clickable Date Summary Row */}
                <button
                  type="button"
                  onClick={() => setSelectedDate(isExpanded ? null : dateStr)}
                  className="w-full p-4 flex flex-wrap items-center justify-between gap-3 text-left transition-colors hover:bg-slate-900/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {formatDateLabel(dateStr)}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          ({dateStr})
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {dateEntries.length} {dateEntries.length === 1 ? 'task' : 'tasks'} recorded
                      </p>
                    </div>
                  </div>

                  {/* Summary Badges on row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800">
                      {completedCount}/{dateEntries.length} Completed
                    </span>

                    {reviewedOkCount > 0 && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                        {reviewedOkCount} Approved
                      </span>
                    )}

                    {needsReworkCount > 0 && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-950/40 text-rose-300 border border-rose-800/40">
                        {needsReworkCount} Rework
                      </span>
                    )}

                    <div className="p-1 rounded-lg text-slate-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Full Read-Only Entries */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-850 bg-slate-900/40 space-y-3">
                    <div className="pt-3 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px]">
                        <Lock className="w-3 h-3 text-slate-500" />
                        Locked Record
                      </span>
                      <span>Read-only archive</span>
                    </div>

                    {dateEntries.map((entry) => (
                      <div 
                        key={entry.id}
                        className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                              {entry.company}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {entry.timeSpent}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className={`font-semibold capitalize ${
                              entry.status === 'completed' ? 'text-emerald-400' : entry.status === 'in_progress' ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                              {entry.status.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Review badge */}
                          <div>
                            {entry.review === 'ok' && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Review: OK
                              </span>
                            )}
                            {entry.review === 'needs_rework' && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Needs Rework
                              </span>
                            )}
                            {entry.review === 'pending' && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                Pending Review
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Task text */}
                        <div className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                          {entry.taskText}
                        </div>

                        {/* Lead Remarks if any */}
                        {entry.remarks && (
                          <div className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-400">
                                Lead Remarks ({entry.reviewedByName || 'Lead'}):
                              </span>
                              <p className="italic text-slate-200 mt-0.5">"{entry.remarks}"</p>
                            </div>
                          </div>
                        )}

                        {/* Follow up note if any */}
                        {entry.followUpNote && (
                          <div className="text-xs text-emerald-300 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-900/40 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-emerald-400">Submitted Follow-up Note:</span>
                              <p className="mt-0.5">{entry.followUpNote}</p>
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
