import React, { useState, useMemo } from 'react';
import { WorkEntry, UserProfile, ReviewStatus } from '../../types';
import { formatDateLabel, getTodayDateString, getPastDates } from '../../lib/dateUtils';
import { AdminEntryReviewCard } from './AdminLiveToday';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  Filter,
  CheckCheck
} from 'lucide-react';

interface AdminDailyReviewProps {
  entries: WorkEntry[];
  teamMembers: UserProfile[];
  onUpdateReview: (entryId: string, review: ReviewStatus, remarks?: string) => Promise<void>;
  onDeleteEntry?: (entryId: string) => Promise<void>;
  adminName: string;
}

export const AdminDailyReview: React.FC<AdminDailyReviewProps> = ({
  entries = [],
  teamMembers = [],
  onUpdateReview,
  onDeleteEntry,
  adminName,
}) => {
  const todayStr = getTodayDateString();
  const pastDatesList = useMemo(() => getPastDates(30).filter((d) => d < todayStr), [todayStr]);
  const yesterdayStr = pastDatesList[0] || todayStr;

  const [selectedDate, setSelectedDate] = useState<string>(yesterdayStr);

  // Filter entries for the selected date
  const dateEntries = useMemo(() => {
    return (entries || []).filter((e) => e.date === selectedDate);
  }, [entries, selectedDate]);

  // Group entries by member for the selected date
  const entriesByMember: { [userId: string]: WorkEntry[] } = {};
  for (const m of (teamMembers || [])) {
    if (m.active !== false) {
      entriesByMember[m.uid] = [];
    }
  }
  for (const entry of dateEntries) {
    if (!entriesByMember[entry.userId]) {
      entriesByMember[entry.userId] = [];
    }
    entriesByMember[entry.userId].push(entry);
  }

  // Calculate review stats for the selected date
  const totalLogs = dateEntries.length;
  const approvedCount = dateEntries.filter((e) => e.review === 'ok').length;
  const reworkCount = dateEntries.filter((e) => e.review === 'needs_rework').length;
  const pendingReviewCount = dateEntries.filter((e) => e.review === 'pending').length;

  return (
    <div className="space-y-6">

      {/* Date Navigation & Stats Top Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Daily Work Review
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {selectedDate}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {selectedDate === yesterdayStr ? 'Yesterday’s Log Review' : formatDateLabel(selectedDate)}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review member accomplishments, mark approval / rework, and provide feedback
            </p>
          </div>

          {/* Quick Date Selector / Picker */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <label className="text-xs text-slate-400 font-medium">Select Date:</label>
            <input
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Date Metrics Pill Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400">Total Entries</span>
            <p className="text-xl font-bold text-white mt-0.5">{totalLogs}</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-xs text-emerald-400">Approved (OK)</span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{approvedCount}</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-xs text-rose-400">Needs Rework</span>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{reworkCount}</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <span className="text-xs text-amber-400">Pending Review</span>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{pendingReviewCount}</p>
          </div>
        </div>

      </div>

      {/* Large Member Cards for Selected Date */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {teamMembers
          .filter((m) => m.active !== false)
          .map((member) => {
            const memberEntries = entriesByMember[member.uid] || [];
            const memberPending = memberEntries.filter((e) => e.review === 'pending').length;

            return (
              <div
                key={member.uid}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between"
              >
                {/* Member Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {member.name}
                        </h3>
                        {memberPending > 0 && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md font-semibold animate-pulse">
                            {memberPending} to review
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {member.designation} • Shift: {member.shiftStart} – {member.shiftEnd}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    memberEntries.length > 0
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-red-950/40 text-red-300 border-red-900/40'
                  }`}>
                    {memberEntries.length > 0 ? `${memberEntries.length} logged` : 'No logs recorded'}
                  </span>
                </div>

                {/* Member entries */}
                <div className="space-y-3 flex-1">
                  {memberEntries.length === 0 ? (
                    <div className="py-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                      <Clock className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-400">No work logged for this date</p>
                    </div>
                  ) : (
                    memberEntries.map((entry) => (
                      <AdminEntryReviewCard
                        key={entry.id}
                        entry={entry}
                        onUpdateReview={onUpdateReview}
                        onDeleteEntry={onDeleteEntry}
                        adminName={adminName}
                      />
                    ))
                  )}
                </div>

              </div>
            );
          })}
      </div>

    </div>
  );
};
