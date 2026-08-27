import React, { useState, useMemo } from 'react';
import { WorkEntry, UserProfile, AssignedTask, Handover, AttendanceRecord, CompanyTag } from '../../types';
import { getTodayDateString, formatDateLabel, getPastDates, getDayOfWeek, formatDuration } from '../../lib/dateUtils';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft, 
  CheckCheck, 
  Search, 
  Eye, 
  X,
  History,
  ShieldCheck,
  Calendar
} from 'lucide-react';

interface AdminTeamOverviewProps {
  teamMembers: UserProfile[];
  entries: WorkEntry[];
  tasks: AssignedTask[];
  handovers: Handover[];
  attendanceRecords: AttendanceRecord[];
  companies: CompanyTag[];
}

export const AdminTeamOverview: React.FC<AdminTeamOverviewProps> = ({
  teamMembers = [],
  entries = [],
  tasks = [],
  handovers = [],
  attendanceRecords = [],
  companies = [],
}) => {
  const todayStr = getTodayDateString();
  const [searchQuery, setSearchQuery] = useState('');
  const [drilldownMember, setDrilldownMember] = useState<UserProfile | null>(null);

  const activeMembers = (teamMembers || []).filter((m) => m.active !== false);

  // Past 7 working days to check for missing logs
  const pastWorkingDays = useMemo(() => {
    return getPastDates(7).filter((d) => {
      if (d >= todayStr) return false;
      const dow = getDayOfWeek(d);
      return dow !== 0 && dow !== 6; // Mon-Fri
    });
  }, [todayStr]);

  // Aggregate stats per member
  const memberSummaries = useMemo(() => {
    return activeMembers.map((member) => {
      // Today entries
      const todayLogs = (entries || []).filter((e) => e.userId === member.uid && e.date === todayStr);

      // Pending reviews
      const pendingReviews = (entries || []).filter((e) => e.userId === member.uid && e.review === 'pending');

      // Open assigned tasks
      const openTasks = (tasks || []).filter((t) => t.assignedTo === member.uid && t.status !== 'done');

      // Unacknowledged handovers sent to this member
      const unackHandovers = (handovers || []).filter((h) => h.toUserId === member.uid && h.status === 'pending');

      // Today attendance record
      const todayAttendance = (attendanceRecords || []).find((a) => a.userId === member.uid && a.date === todayStr);

      // Check missing log days on past working days
      const missingLogDays: string[] = [];
      for (const d of pastWorkingDays) {
        const expectedHours = member.expectedHoursMap?.[getDayOfWeek(d)] ?? 8;
        if (expectedHours > 0) {
          const hasLog = entries.some((e) => e.userId === member.uid && e.date === d);
          if (!hasLog) {
            missingLogDays.push(d);
          }
        }
      }

      return {
        member,
        todayCount: todayLogs.length,
        pendingReviewCount: pendingReviews.length,
        openTasksCount: openTasks.length,
        unackHandoversCount: unackHandovers.length,
        shiftStatus: todayAttendance?.status === 'active' ? 'active' : todayAttendance ? 'closed' : 'none',
        totalTodayMinutes: todayAttendance?.totalMinutes || 0,
        missingLogDays,
      };
    });
  }, [activeMembers, entries, tasks, handovers, attendanceRecords, todayStr, pastWorkingDays]);

  const filteredSummaries = memberSummaries.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.member.name.toLowerCase().includes(q) || s.member.designation.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">

      {/* Header & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-400" />
              Team Operations & Accountability Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live snapshot of daily logs, backlogs, pending shift handovers, and missing-log alerts
            </p>
          </div>

          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team member..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Member Name & Role</th>
                <th className="py-3.5 px-4">Shift State</th>
                <th className="py-3.5 px-4">Logged Today</th>
                <th className="py-3.5 px-4">Pending Review</th>
                <th className="py-3.5 px-4">Open Tasks</th>
                <th className="py-3.5 px-4">Handovers Alert</th>
                <th className="py-3.5 px-4">Missing-Log Indicator</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredSummaries.map(({ member, todayCount, pendingReviewCount, openTasksCount, unackHandoversCount, shiftStatus, totalTodayMinutes, missingLogDays }) => (
                <tr key={member.uid} className="hover:bg-slate-950/40 transition-colors">
                  
                  {/* Name & Designation */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          {member.name}
                          {member.role === 'admin' && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-semibold">
                              Lead
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {member.designation}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Shift State */}
                  <td className="py-4 px-4">
                    {shiftStatus === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active ({formatDuration(totalTodayMinutes)})
                      </span>
                    ) : shiftStatus === 'closed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        Clocked Out ({formatDuration(totalTodayMinutes)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/60 text-slate-500 border border-slate-700/50">
                        Not Clocked In
                      </span>
                    )}
                  </td>

                  {/* Logged Today */}
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      todayCount > 0
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                        : 'bg-slate-800/60 text-slate-500'
                    }`}>
                      {todayCount} {todayCount === 1 ? 'log' : 'logs'}
                    </span>
                  </td>

                  {/* Pending Reviews */}
                  <td className="py-4 px-4">
                    {pendingReviewCount > 0 ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                        {pendingReviewCount} pending
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">0</span>
                    )}
                  </td>

                  {/* Open Tasks */}
                  <td className="py-4 px-4">
                    {openTasksCount > 0 ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                        {openTasksCount} active
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">0</span>
                    )}
                  </td>

                  {/* Unack Handovers */}
                  <td className="py-4 px-4">
                    {unackHandoversCount > 0 ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                        {unackHandoversCount} waiting
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>

                  {/* Missing Log Indicator */}
                  <td className="py-4 px-4">
                    {missingLogDays.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        {missingLogDays.length} past days missing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Up to date
                      </span>
                    )}
                  </td>

                  {/* Actions: Drilldown View */}
                  <td className="py-4 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setDrilldownMember(member)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      View Full History
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Drilldown History Modal */}
      {drilldownMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">
                  {drilldownMember.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{drilldownMember.name}</h3>
                  <p className="text-xs text-slate-400">{drilldownMember.designation} • {drilldownMember.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownMember(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                All Logged Entries ({entries.filter((e) => e.userId === drilldownMember.uid).length})
              </span>

              {entries.filter((e) => e.userId === drilldownMember.uid).length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No entries recorded for this user.</p>
              ) : (
                entries
                  .filter((e) => e.userId === drilldownMember.uid)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((entry) => (
                    <div key={entry.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-300">{entry.company}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{formatDateLabel(entry.date)}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400 font-mono">{entry.timeSpent}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          entry.review === 'ok' ? 'bg-emerald-500/20 text-emerald-300' : entry.review === 'needs_rework' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {entry.review === 'ok' ? 'Review: OK' : entry.review === 'needs_rework' ? 'Needs Rework' : 'Pending Review'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                        {entry.taskText}
                      </p>
                      {entry.remarks && (
                        <p className="text-xs text-slate-400 italic">
                          Remarks: "{entry.remarks}"
                        </p>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDrilldownMember(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close Drilldown
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
