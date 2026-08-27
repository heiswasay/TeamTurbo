import React, { useState, useMemo } from 'react';
import { AttendanceRecord, UserProfile } from '../../types';
import { 
  getTodayDateString, 
  formatDateLabel, 
  formatDuration, 
  formatTime, 
  getDayOfWeek, 
  getPastDates 
} from '../../lib/dateUtils';
import { exportAttendanceToCSV } from '../../lib/exportUtils';
import { 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  History, 
  User, 
  Search, 
  Sparkles,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface AdminAttendanceTabProps {
  attendanceRecords: AttendanceRecord[];
  teamMembers: UserProfile[];
}

export const AdminAttendanceTab: React.FC<AdminAttendanceTabProps> = ({
  attendanceRecords = [],
  teamMembers = [],
}) => {
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'monthly'>('daily');

  // Filter records for the selected date
  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of (attendanceRecords || [])) {
      if (rec.date === selectedDate) {
        map.set(rec.userId, rec);
      }
    }
    return map;
  }, [attendanceRecords, selectedDate]);

  // Today live records map
  const todayRecordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of (attendanceRecords || [])) {
      if (rec.date === todayStr) {
        map.set(rec.userId, rec);
      }
    }
    return map;
  }, [attendanceRecords, todayStr]);

  const activeMembers = (teamMembers || []).filter((m) => m.active !== false);

  // Day of week calculation for expected hours
  const selectedDayOfWeek = getDayOfWeek(selectedDate);

  // Export handler
  const handleExportCSV = () => {
    exportAttendanceToCSV(
      attendanceRecords,
      teamMembers,
      selectedDate,
      selectedDate,
      `attendance_report_${selectedDate}.csv`
    );
  };

  // Monthly Analytics Calculations
  const monthlyStats = useMemo(() => {
    const stats: {
      [userId: string]: {
        user: UserProfile;
        totalMinutes: number;
        daysPresent: number;
        daysShortfall: number;
        daysMissing: number;
      };
    } = {};

    // Get last 30 days excluding weekends where expected hours = 0
    const past30Days = getPastDates(30).filter((d) => d <= todayStr);

    for (const member of activeMembers) {
      stats[member.uid] = {
        user: member,
        totalMinutes: 0,
        daysPresent: 0,
        daysShortfall: 0,
        daysMissing: 0,
      };

      for (const date of past30Days) {
        const dow = getDayOfWeek(date);
        const expectedH = member.expectedHoursMap?.[dow] ?? (dow === 0 || dow === 6 ? 0 : 8);
        const isWorkingDay = expectedH > 0;

        const record = attendanceRecords.find((r) => r.userId === member.uid && r.date === date);

        if (record && record.totalMinutes > 0) {
          stats[member.uid].totalMinutes += record.totalMinutes;
          stats[member.uid].daysPresent += 1;

          if (isWorkingDay && record.totalMinutes < expectedH * 60) {
            stats[member.uid].daysShortfall += 1;
          }
        } else if (isWorkingDay && date < todayStr) {
          stats[member.uid].daysMissing += 1;
        }
      }
    }

    return Object.values(stats);
  }, [attendanceRecords, activeMembers, todayStr]);

  return (
    <div className="space-y-6">

      {/* Header & Sub-Tab Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6 text-emerald-400" />
              Attendance & Shift Clock Monitoring
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Track real-time shift clocks, session durations, expected hours shortfalls, and HR exports
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('daily')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSubTab === 'daily'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Daily Shift Log
            </button>
            <button
              onClick={() => setActiveSubTab('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSubTab === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              30-Day HR Summary
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              Export HR CSV
            </button>
          </div>
        </div>

        {/* Date Selector for Daily View */}
        {activeSubTab === 'daily' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Inspecting Date:</span>
              <input
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400 font-medium">
                ({formatDateLabel(selectedDate)})
              </span>
            </div>

            {selectedDate === todayStr && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Today Shift Status
              </span>
            )}
          </div>
        )}

      </div>

      {/* Daily Shift Table */}
      {activeSubTab === 'daily' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Team Member</th>
                  <th className="py-3.5 px-4">Shift Schedule</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Sessions Detail</th>
                  <th className="py-3.5 px-4">Total Worked</th>
                  <th className="py-3.5 px-4">Expected</th>
                  <th className="py-3.5 px-4">Compliance / Shortfall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {activeMembers.map((member) => {
                  const record = recordsMap.get(member.uid);
                  const expectedHours = member.expectedHoursMap?.[selectedDayOfWeek] ?? (selectedDayOfWeek === 0 || selectedDayOfWeek === 6 ? 0 : 8);
                  const isWorkingDay = expectedHours > 0;
                  
                  const totalMinutes = record?.totalMinutes || 0;
                  const workedHours = (totalMinutes / 60);
                  const shortfallMinutes = (expectedHours * 60) - totalMinutes;
                  const isShortfall = isWorkingDay && shortfallMinutes > 0 && selectedDate < todayStr;
                  const isNeverStarted = !record && isWorkingDay && selectedDate < todayStr;

                  return (
                    <tr 
                      key={member.uid}
                      className="hover:bg-slate-950/40 transition-colors"
                    >
                      {/* Member Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">
                              {member.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {member.designation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shift Schedule */}
                      <td className="py-4 px-4 text-slate-300 font-mono text-xs">
                        {member.shiftStart || '10:30'} – {member.shiftEnd || '18:30'} PKT
                      </td>

                      {/* Current Status */}
                      <td className="py-4 px-4">
                        {selectedDate === todayStr ? (
                          record?.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Logged In (Clock Active)
                            </span>
                          ) : record ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              Logged Off
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/60 text-slate-500 border border-slate-700/50">
                              Not Clocked In Yet
                            </span>
                          )
                        ) : (
                          record ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              Closed ({record.sessions?.length || 0} sessions)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/40">
                              Absent / No Clock
                            </span>
                          )
                        )}
                      </td>

                      {/* Sessions Detail */}
                      <td className="py-4 px-4">
                        {record && record.sessions && record.sessions.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {record.sessions.map((s, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300"
                              >
                                {formatTime(s.loginAt)} → {s.logoffAt ? formatTime(s.logoffAt) : 'Active'} ({formatDuration(s.durationMinutes || 0)})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Total Worked */}
                      <td className="py-4 px-4 font-bold text-white text-xs">
                        {formatDuration(totalMinutes)}
                      </td>

                      {/* Expected */}
                      <td className="py-4 px-4 text-slate-400 text-xs">
                        {expectedHours}h
                      </td>

                      {/* Compliance / Shortfall Flag */}
                      <td className="py-4 px-4">
                        {isNeverStarted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            Missing Attendance
                          </span>
                        ) : isShortfall ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
                            <TrendingDown className="w-3 h-3 text-amber-400" />
                            Shortfall (-{formatDuration(shortfallMinutes)})
                          </span>
                        ) : totalMinutes >= expectedHours * 60 && isWorkingDay ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Target Met
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Off / Non-working</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 30-Day Monthly HR Summary View */}
      {activeSubTab === 'monthly' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">
                30-Day Shift Compliance Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Aggregated shift hours, presence days, and deficit reports per employee
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Total Worked Time</th>
                  <th className="py-3 px-4">Days Present</th>
                  <th className="py-3 px-4">Days Missing (Unlogged)</th>
                  <th className="py-3 px-4">Shortfall Days</th>
                  <th className="py-3 px-4">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {monthlyStats.map((item) => {
                  const hoursTotal = (item.totalMinutes / 60).toFixed(1);
                  const isHealthy = item.daysMissing === 0 && item.daysShortfall <= 2;

                  return (
                    <tr key={item.user.uid} className="hover:bg-slate-950/40">
                      <td className="py-3.5 px-4 font-bold text-white">
                        {item.user.name}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {item.user.designation}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-300 text-xs">
                        {hoursTotal}h ({formatDuration(item.totalMinutes)})
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-400">
                        {item.daysPresent} days
                      </td>
                      <td className="py-3.5 px-4">
                        {item.daysMissing > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 border border-rose-800 font-bold">
                            {item.daysMissing} missing
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.daysShortfall > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800 font-semibold">
                            {item.daysShortfall} days
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isHealthy ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Excellent
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Needs Review
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
