import React, { useState, useMemo } from 'react';
import { AttendanceRecord, UserProfile, AttendanceSession } from '../../types';
import { 
  getTodayDateString, 
  formatDateLabel, 
  formatDuration, 
  formatTime, 
  getDayOfWeek, 
  getDaySchedule,
  checkPunctuality,
  checkLiveArrivalStatus,
  getDaysInMonth,
  formatMonthYearLabel,
  isPastDate,
  isToday
} from '../../lib/dateUtils';
import { exportAttendanceToCSV, exportMonthlyHRReportToCSV } from '../../lib/exportUtils';
import { AdminShiftModal } from './AdminShiftModal';
import { 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  User, 
  Search, 
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Edit3,
  CalendarDays,
  UserX,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Timer,
  Info
} from 'lucide-react';

interface AdminAttendanceTabProps {
  attendanceRecords: AttendanceRecord[];
  teamMembers: UserProfile[];
  onUpdateUser?: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
}

export const AdminAttendanceTab: React.FC<AdminAttendanceTabProps> = ({
  attendanceRecords = [],
  teamMembers = [],
  onUpdateUser,
}) => {
  const todayStr = getTodayDateString();
  const todayDateObj = new Date();
  
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'monthly' | 'roster'>('daily');
  
  // Month selection for Full Month Report
  const [selectedYear, setSelectedYear] = useState<number>(todayDateObj.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(todayDateObj.getMonth() + 1); // 1-12
  
  // Drilldown filter for full month view
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Shift Edit Modal State
  const [shiftEditMember, setShiftEditMember] = useState<UserProfile | null>(null);

  const activeMembers = useMemo(() => {
    return (teamMembers || []).filter((m) => m.active !== false);
  }, [teamMembers]);

  // Handle saving shift timings
  const handleSaveShift = async (uid: string, shiftStart: string, shiftEnd: string) => {
    if (onUpdateUser) {
      await onUpdateUser(uid, {
        shiftStart,
        shiftEnd,
        // All members have 9h expected hours per working day (Mon-Sat, with alternate Sat calculated dynamically)
        expectedHoursMap: { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 0: 0 },
      });
    }
  };

  // Daily records map for the selected date
  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of (attendanceRecords || [])) {
      if (rec.date === selectedDate) {
        map.set(rec.userId, rec);
      }
    }
    return map;
  }, [attendanceRecords, selectedDate]);

  const selectedDateSchedule = useMemo(() => {
    return getDaySchedule(selectedDate);
  }, [selectedDate]);

  // --- FULL MONTH CALCULATIONS ---
  const monthDays = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const monthlyReportData = useMemo(() => {
    const memberReports = activeMembers.map((member) => {
      let totalMinutesWorked = 0;
      let totalExpectedMinutes = 0;
      let daysPresent = 0;
      let daysAbsent = 0;
      let daysLate = 0;
      let daysOnTime = 0;
      let totalWorkingDays = 0;
      let shortfallMinutes = 0;

      const dailyBreakdown = monthDays.map((dateStr) => {
        const isPast = isPastDate(dateStr);
        const isCurToday = isToday(dateStr);
        const sched = getDaySchedule(dateStr);
        const record = attendanceRecords.find((r) => r.userId === member.uid && r.date === dateStr);
        
        const sessions = record?.sessions || [];
        const firstLogin = sessions[0]?.loginAt;
        const lastLogoff = sessions[sessions.length - 1]?.logoffAt;
        const punctuality = checkPunctuality(member.shiftStart || '09:30', firstLogin);
        const workedMinutes = record?.totalMinutes || 0;

        let status: 'present' | 'absent' | 'pending' | 'off' | 'upcoming' = 'off';
        let dayMissingMinutes = 0;

        if (sched.isWorkingDay) {
          totalWorkingDays++;
          totalExpectedMinutes += sched.expectedMinutes;

          if (workedMinutes > 0 || (isCurToday && record?.status === 'active')) {
            status = 'present';
            daysPresent++;
            totalMinutesWorked += workedMinutes;

            if (punctuality.isLate) {
              daysLate++;
            } else {
              daysOnTime++;
            }

            if (workedMinutes < sched.expectedMinutes) {
              const deficit = sched.expectedMinutes - workedMinutes;
              shortfallMinutes += deficit;
              dayMissingMinutes = deficit;
            }
          } else if (isPast) {
            // Absent on past working day!
            status = 'absent';
            daysAbsent++;
            dayMissingMinutes = sched.expectedMinutes; // 9 hours missing
            shortfallMinutes += sched.expectedMinutes;
          } else if (isCurToday) {
            status = 'pending';
            dayMissingMinutes = 0;
          } else {
            status = 'upcoming';
            dayMissingMinutes = 0;
          }
        } else {
          status = 'off';
          totalMinutesWorked += workedMinutes;
        }

        return {
          date: dateStr,
          schedule: sched,
          record,
          sessions,
          firstLogin,
          lastLogoff,
          punctuality,
          workedMinutes,
          expectedMinutes: sched.expectedMinutes,
          missingMinutes: dayMissingMinutes,
          status,
        };
      });

      const totalMissingMinutes = Math.max(0, totalExpectedMinutes - totalMinutesWorked);
      const attendanceScore = totalExpectedMinutes > 0
        ? Math.min(100, Math.round((totalMinutesWorked / totalExpectedMinutes) * 100))
        : 100;

      return {
        member,
        totalWorkingDays,
        daysPresent,
        daysAbsent,
        daysLate,
        daysOnTime,
        totalMinutesWorked,
        totalExpectedMinutes,
        totalMissingMinutes,
        shortfallMinutes,
        attendanceScore,
        dailyBreakdown,
      };
    });

    // High level summary for the month
    const totalTeamExpectedMin = memberReports.reduce((acc, m) => acc + m.totalExpectedMinutes, 0);
    const totalTeamWorkedMin = memberReports.reduce((acc, m) => acc + m.totalMinutesWorked, 0);
    const totalTeamMissingMin = memberReports.reduce((acc, m) => acc + m.totalMissingMinutes, 0);
    const totalTeamAbsences = memberReports.reduce((acc, m) => acc + m.daysAbsent, 0);
    const totalTeamLateArrivals = memberReports.reduce((acc, m) => acc + m.daysLate, 0);
    const totalTeamPresents = memberReports.reduce((acc, m) => acc + m.daysPresent, 0);
    const punctualityRate = (totalTeamPresents > 0)
      ? Math.round(((totalTeamPresents - totalTeamLateArrivals) / totalTeamPresents) * 100)
      : 100;

    return {
      memberReports,
      totalTeamExpectedMin,
      totalTeamWorkedMin,
      totalTeamMissingMin,
      totalTeamAbsences,
      totalTeamLateArrivals,
      totalTeamPresents,
      punctualityRate,
    };
  }, [activeMembers, monthDays, attendanceRecords]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Export Daily CSV
  const handleExportDailyCSV = () => {
    exportAttendanceToCSV(
      attendanceRecords,
      teamMembers,
      selectedDate,
      selectedDate,
      `attendance_daily_${selectedDate}.csv`
    );
  };

  // Export Monthly HR CSV
  const handleExportMonthlyCSV = () => {
    exportMonthlyHRReportToCSV(
      selectedYear,
      selectedMonth,
      activeMembers,
      attendanceRecords
    );
  };

  return (
    <div className="space-y-6">

      {/* Header Banner & Sub-Tabs Navigation */}
      <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Clock className="w-6 h-6 text-emerald-400" />
              HR & Shift Attendance Center
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              9-hour daily shifts • Alternate Saturday off • Automatic absence marking & 30-minute late grace tracking
            </p>
          </div>

          {/* Sub-Tab Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('daily')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'daily'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-[#1F2636] text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Daily Shift Log
            </button>
            <button
              onClick={() => setActiveSubTab('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-[#1F2636] text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Full Month HR Report
            </button>
            <button
              onClick={() => setActiveSubTab('roster')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'roster'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-[#1F2636] text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Shift Timings Roster
            </button>

            {/* CSV Export Button */}
            <button
              onClick={activeSubTab === 'monthly' ? handleExportMonthlyCSV : handleExportDailyCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              {activeSubTab === 'monthly' ? 'Export Month CSV' : 'Export Day CSV'}
            </button>
          </div>
        </div>

        {/* Date Selector Bar for Daily View */}
        {activeSubTab === 'daily' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-medium text-slate-400">Selected Date:</span>
              <input
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-300 font-semibold">
                {formatDateLabel(selectedDate)}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                selectedDateSchedule.isWorkingDay
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {selectedDateSchedule.label}
              </span>
            </div>

            {selectedDate === todayStr ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Active Shift Clock
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                Past Date Record (Absences & Deficits Computed)
              </span>
            )}
          </div>
        )}

        {/* Month Selector for Full Month View */}
        {activeSubTab === 'monthly' && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl bg-[#1F2636] text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="px-4 py-1.5 rounded-xl bg-[#1F2636] border border-slate-700 text-sm font-bold text-white tracking-wide">
                {formatMonthYearLabel(selectedYear, selectedMonth)}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl bg-[#1F2636] text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Filter by Employee */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">Employee:</span>
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Team Members ({activeMembers.length})</option>
                {activeMembers.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.name} ({m.shiftStart || '09:30'} - {m.shiftEnd || '18:30'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

      </div>

      {/* VIEW 1: DAILY SHIFT LOG */}
      {activeSubTab === 'daily' && (
        <div className="bg-[#161B27] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 bg-[#1F2636]/40 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Daily Shift Roster & Punctuality Matrix ({selectedDate})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Standard: <strong>9h Working Shift</strong> • Grace Limit: <strong>30 mins from start</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#1F2636] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Shift Timings</th>
                  <th className="py-3.5 px-4">First Clock-In</th>
                  <th className="py-3.5 px-4">Punctuality (30m Grace)</th>
                  <th className="py-3.5 px-4">Clock Sessions</th>
                  <th className="py-3.5 px-4">Worked</th>
                  <th className="py-3.5 px-4">Expected</th>
                  <th className="py-3.5 px-4">HR Status & Missing Hours</th>
                  <th className="py-3.5 px-4 text-right">Shift Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {activeMembers.map((member) => {
                  const record = recordsMap.get(member.uid);
                  const isWorkingDay = selectedDateSchedule.isWorkingDay;
                  const expectedHours = isWorkingDay ? 9 : 0;
                  const expectedMinutes = isWorkingDay ? 540 : 0;

                  const sessions = record?.sessions || [];
                  const firstLogin = sessions[0]?.loginAt;
                  const lastLogoff = sessions[sessions.length - 1]?.logoffAt;
                  const punctuality = checkPunctuality(member.shiftStart || '09:30', firstLogin);

                  const totalMinutes = record?.totalMinutes || 0;
                  const missingMinutes = Math.max(0, expectedMinutes - totalMinutes);

                  const isPast = selectedDate < todayStr;
                  const isCurToday = selectedDate === todayStr;

                  // Absence status determination:
                  // If person didn't clock in on past working day -> ABSENT!
                  // If today and not clocked in -> Pending Clock-In (Absent until clocked in)
                  const isAbsent = isWorkingDay && isPast && (!record || totalMinutes === 0);
                  const isPendingToday = isWorkingDay && isCurToday && (!record || record.status !== 'active' && totalMinutes === 0);
                  const isShortfall = isWorkingDay && isPast && totalMinutes > 0 && totalMinutes < expectedMinutes;

                  return (
                    <tr key={member.uid} className="hover:bg-[#1F2636]/50 transition-colors">
                      {/* Employee Column */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
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

                      {/* Shift Timings */}
                      <td className="py-4 px-4 font-mono text-xs">
                        <span className="text-slate-200 font-semibold">
                          {member.shiftStart || '09:30'} – {member.shiftEnd || '18:30'}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          (9h Duration PKT)
                        </span>
                      </td>

                      {/* First Clock-In */}
                      <td className="py-4 px-4 font-mono text-xs">
                        {firstLogin ? (
                          <span className="text-slate-200 font-bold">
                            {formatTime(firstLogin)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Punctuality */}
                      <td className="py-4 px-4">
                        {firstLogin ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${punctuality.badgeClass}`}>
                            {punctuality.isLate ? (
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            )}
                            {punctuality.label}
                          </span>
                        ) : isWorkingDay && isPast ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                            <UserX className="w-3 h-3 text-rose-400" />
                            Did Not Clock In
                          </span>
                        ) : isWorkingDay && isCurToday ? (() => {
                          const liveArr = checkLiveArrivalStatus(member.shiftStart || '09:30', null, isWorkingDay);
                          if (liveArr.isLate) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/90 text-rose-300 border border-rose-700 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                Overdue Late (+{liveArr.minutesPastGrace}m)
                              </span>
                            );
                          }
                          return (
                            <span className="text-slate-400 text-[11px]">
                              Pending (Cutoff: {punctuality.relaxationLimitTime})
                            </span>
                          );
                        })() : (
                          <span className="text-slate-500 text-xs">Rest Day</span>
                        )}
                      </td>

                      {/* Sessions Detail */}
                      <td className="py-4 px-4">
                        {sessions.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {sessions.map((s, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-[#1F2636] border border-slate-700 text-[10px] text-slate-300"
                              >
                                #{idx + 1}: {formatTime(s.loginAt)} → {s.logoffAt ? formatTime(s.logoffAt) : 'Active'} ({formatDuration(s.durationMinutes || 0)})
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

                      {/* Expected Hours */}
                      <td className="py-4 px-4 text-slate-400 text-xs font-semibold">
                        {expectedHours}h
                      </td>

                      {/* HR Status & Missing Hours */}
                      <td className="py-4 px-4">
                        {!isWorkingDay ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {selectedDateSchedule.label}
                          </span>
                        ) : isAbsent ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              <UserX className="w-3.5 h-3.5 text-rose-400" />
                              ABSENT (Unlogged)
                            </span>
                            <span className="block text-[10px] text-rose-400 font-bold">
                              Missing: -9h 00m
                            </span>
                          </div>
                        ) : isPendingToday ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/80">
                              <Timer className="w-3.5 h-3.5 text-amber-400" />
                              Absent (Pending Clock-in)
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              Awaiting shift start
                            </span>
                          </div>
                        ) : isShortfall ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800">
                              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                              Deficit / Shortfall
                            </span>
                            <span className="block text-[10px] text-amber-400 font-bold">
                              Missing: -{formatDuration(missingMinutes)}
                            </span>
                          </div>
                        ) : totalMinutes >= expectedMinutes && isWorkingDay ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Target Met (9h Complete)
                          </span>
                        ) : record?.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Clock Active ({formatDuration(totalMinutes)})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Logged Off</span>
                        )}
                      </td>

                      {/* Quick Shift Edit Action */}
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setShiftEditMember(member)}
                          className="px-2.5 py-1.5 bg-[#1F2636] hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-xl transition-all border border-slate-700 inline-flex items-center gap-1 hover:border-indigo-500"
                        >
                          <Edit3 className="w-3 h-3 text-indigo-400" />
                          Change Shift
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL MONTH HR REPORT */}
      {activeSubTab === 'monthly' && (
        <div className="space-y-6">

          {/* Monthly KPI Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            <div className="bg-[#161B27] border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Team Target
              </span>
              <div className="text-xl font-black text-white font-mono">
                {(monthlyReportData.totalTeamExpectedMin / 60).toFixed(0)}h
              </div>
              <p className="text-[10px] text-slate-500">9h / working day</p>
            </div>

            <div className="bg-[#161B27] border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Worked Time
              </span>
              <div className="text-xl font-black text-indigo-400 font-mono">
                {(monthlyReportData.totalTeamWorkedMin / 60).toFixed(1)}h
              </div>
              <p className="text-[10px] text-slate-500">{formatDuration(monthlyReportData.totalTeamWorkedMin)}</p>
            </div>

            <div className="bg-[#161B27] border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Total Missing Hours
              </span>
              <div className="text-xl font-black text-rose-400 font-mono">
                -{(monthlyReportData.totalTeamMissingMin / 60).toFixed(1)}h
              </div>
              <p className="text-[10px] text-slate-500">Absences & Deficits</p>
            </div>

            <div className="bg-[#161B27] border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                Absent Days
              </span>
              <div className="text-xl font-black text-rose-300 font-mono">
                {monthlyReportData.totalTeamAbsences}
              </div>
              <p className="text-[10px] text-slate-500">Unlogged past days</p>
            </div>

            <div className="bg-[#161B27] border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Late Clock-Ins
              </span>
              <div className="text-xl font-black text-amber-300 font-mono">
                {monthlyReportData.totalTeamLateArrivals}
              </div>
              <p className="text-[10px] text-slate-500">&gt;30m grace overage</p>
            </div>

            <div className="bg-[#161B27] border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Punctuality Rate
              </span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {monthlyReportData.punctualityRate}%
              </div>
              <p className="text-[10px] text-slate-500">On-time adherence</p>
            </div>

          </div>

          {/* Monthly Employee Summary Matrix Table */}
          <div className="bg-[#161B27] border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-400" />
                  Monthly Team Attendance & Deficit Summary
                </h3>
                <p className="text-xs text-slate-400">
                  {formatMonthYearLabel(selectedYear, selectedMonth)} • Full breakdown of missing hours, unlogged absent days, and shift compliance
                </p>
              </div>

              <div className="text-xs text-slate-400">
                Click <strong>"Change Shift"</strong> to adjust official 9-hour shift schedule
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#1F2636] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Shift Timings</th>
                    <th className="py-3 px-4">Working Days</th>
                    <th className="py-3 px-4">Present</th>
                    <th className="py-3 px-4">Absent Days</th>
                    <th className="py-3 px-4">Late Days (&gt;30m)</th>
                    <th className="py-3 px-4">Worked Time</th>
                    <th className="py-3 px-4">Expected (9h/d)</th>
                    <th className="py-3 px-4">Total Missing Hours</th>
                    <th className="py-3 px-4">Health Rate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {monthlyReportData.memberReports.map((report) => {
                    const workedH = (report.totalMinutesWorked / 60).toFixed(1);
                    const expectedH = (report.totalExpectedMinutes / 60).toFixed(1);
                    const missingH = (report.totalMissingMinutes / 60).toFixed(1);

                    return (
                      <tr key={report.member.uid} className="hover:bg-[#1F2636]/50 transition-colors">
                        {/* Member */}
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                              {report.member.name.charAt(0)}
                            </div>
                            <div>
                              <span>{report.member.name}</span>
                              <span className="block text-[11px] font-normal text-slate-400">
                                {report.member.designation}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Shift Timing */}
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span className="text-slate-200 font-semibold">
                            {report.member.shiftStart || '09:30'} – {report.member.shiftEnd || '18:30'}
                          </span>
                        </td>

                        {/* Working Days */}
                        <td className="py-3.5 px-4 font-semibold text-slate-300">
                          {report.totalWorkingDays} days
                        </td>

                        {/* Present Days */}
                        <td className="py-3.5 px-4 font-bold text-emerald-400">
                          {report.daysPresent} days
                        </td>

                        {/* Absent Days */}
                        <td className="py-3.5 px-4">
                          {report.daysAbsent > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800 font-bold">
                              {report.daysAbsent} absent
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">0</span>
                          )}
                        </td>

                        {/* Late Days */}
                        <td className="py-3.5 px-4">
                          {report.daysLate > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold">
                              {report.daysLate} late
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">0</span>
                          )}
                        </td>

                        {/* Total Worked */}
                        <td className="py-3.5 px-4 font-bold text-indigo-300">
                          {workedH}h ({formatDuration(report.totalMinutesWorked)})
                        </td>

                        {/* Total Expected */}
                        <td className="py-3.5 px-4 text-slate-400 font-semibold">
                          {expectedH}h
                        </td>

                        {/* Missing Hours */}
                        <td className="py-3.5 px-4">
                          {report.totalMissingMinutes > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 font-bold inline-flex items-center gap-1">
                              <TrendingDown className="w-3 h-3 text-rose-400" />
                              -{missingH}h (-{formatDuration(report.totalMissingMinutes)})
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-semibold">
                              0h (Complete)
                            </span>
                          )}
                        </td>

                        {/* Health Score */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            report.attendanceScore >= 95
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : report.attendanceScore >= 80
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {report.attendanceScore}%
                          </span>
                        </td>

                        {/* Change Shift & Drilldown */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShiftEditMember(report.member)}
                              className="px-2.5 py-1 bg-[#1F2636] hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg transition-colors border border-slate-700"
                            >
                              Edit Shift
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedMemberFilter(report.member.uid)}
                              className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold rounded-lg transition-colors border border-indigo-500/30"
                            >
                              Daily Log
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Day-by-Day Calendar Breakdown */}
          <div className="bg-[#161B27] border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  Day-by-Day Attendance Matrix
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedMemberFilter === 'all'
                    ? 'Showing all active employees across all days of the month'
                    : `Showing full month log for ${activeMembers.find((m) => m.uid === selectedMemberFilter)?.name || 'selected employee'}`}
                </p>
              </div>

              {selectedMemberFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberFilter('all')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  ← Show All Team Members
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#1F2636] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Schedule Rule</th>
                    {selectedMemberFilter === 'all' && <th className="py-3 px-3">Employee</th>}
                    <th className="py-3 px-3">Assigned Shift</th>
                    <th className="py-3 px-3">Clock-In</th>
                    <th className="py-3 px-3">Clock-Out</th>
                    <th className="py-3 px-3">Punctuality (&gt;30m)</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Worked</th>
                    <th className="py-3 px-3">Expected</th>
                    <th className="py-3 px-3">Missing Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {monthDays.flatMap((dateStr) => {
                    const sched = getDaySchedule(dateStr);
                    const isPast = isPastDate(dateStr);
                    const isCurToday = isToday(dateStr);

                    const targetMembers = selectedMemberFilter === 'all'
                      ? activeMembers
                      : activeMembers.filter((m) => m.uid === selectedMemberFilter);

                    return targetMembers.map((member) => {
                      const record = attendanceRecords.find((r) => r.userId === member.uid && r.date === dateStr);
                      const sessions = record?.sessions || [];
                      const firstLogin = sessions[0]?.loginAt;
                      const lastLogoff = sessions[sessions.length - 1]?.logoffAt;
                      const punctuality = checkPunctuality(member.shiftStart || '09:30', firstLogin);
                      const workedMin = record?.totalMinutes || 0;
                      const expectedMin = sched.expectedMinutes;

                      let statusBadge = null;
                      let missingHoursDisplay = null;

                      if (!sched.isWorkingDay) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            {sched.label}
                          </span>
                        );
                        missingHoursDisplay = <span className="text-slate-500">—</span>;
                      } else if (workedMin > 0 || (isCurToday && record?.status === 'active')) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                            Present
                          </span>
                        );
                        const diff = expectedMin - workedMin;
                        if (diff > 0) {
                          missingHoursDisplay = (
                            <span className="text-amber-400 font-semibold font-mono">
                              -{formatDuration(diff)}
                            </span>
                          );
                        } else {
                          missingHoursDisplay = (
                            <span className="text-emerald-400 font-medium">0m (Done)</span>
                          );
                        }
                      } else if (isPast) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            ABSENT
                          </span>
                        );
                        missingHoursDisplay = (
                          <span className="text-rose-400 font-bold font-mono">
                            -9h 00m
                          </span>
                        );
                      } else if (isCurToday) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800">
                            Pending Clock-In
                          </span>
                        );
                        missingHoursDisplay = <span className="text-slate-500">Today</span>;
                      } else {
                        statusBadge = (
                          <span className="text-slate-500 text-[11px]">Upcoming</span>
                        );
                        missingHoursDisplay = <span className="text-slate-500">—</span>;
                      }

                      return (
                        <tr key={`${dateStr}_${member.uid}`} className="hover:bg-[#1F2636]/40 transition-colors">
                          {/* Date */}
                          <td className="py-2.5 px-3 font-mono text-xs text-white">
                            {dateStr}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {sched.dayName.slice(0, 3)}
                            </span>
                          </td>

                          {/* Schedule Rule */}
                          <td className="py-2.5 px-3 text-[11px]">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              sched.dayType === 'regular_work'
                                ? 'bg-indigo-950/60 text-indigo-300'
                                : sched.dayType === 'saturday_work'
                                ? 'bg-emerald-950/60 text-emerald-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {sched.label}
                            </span>
                          </td>

                          {/* Employee (if all) */}
                          {selectedMemberFilter === 'all' && (
                            <td className="py-2.5 px-3 font-medium text-white">
                              {member.name}
                            </td>
                          )}

                          {/* Assigned Shift */}
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                            {member.shiftStart || '09:30'} – {member.shiftEnd || '18:30'}
                          </td>

                          {/* Clock In */}
                          <td className="py-2.5 px-3 font-mono text-xs">
                            {firstLogin ? (
                              <span className="text-slate-200 font-bold">{formatTime(firstLogin)}</span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>

                          {/* Clock Out */}
                          <td className="py-2.5 px-3 font-mono text-xs">
                            {lastLogoff ? (
                              <span className="text-slate-300">{formatTime(lastLogoff)}</span>
                            ) : record?.status === 'active' ? (
                              <span className="text-emerald-400 font-bold">Active</span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>

                          {/* Punctuality */}
                          <td className="py-2.5 px-3">
                            {firstLogin ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${punctuality.badgeClass}`}>
                                {punctuality.isLate ? `Late (${punctuality.minutesFromStart}m)` : 'On Time'}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3">
                            {statusBadge}
                          </td>

                          {/* Worked */}
                          <td className="py-2.5 px-3 font-bold text-white font-mono text-xs">
                            {formatDuration(workedMin)}
                          </td>

                          {/* Expected */}
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-xs">
                            {sched.expectedHours}h
                          </td>

                          {/* Missing Hours */}
                          <td className="py-2.5 px-3">
                            {missingHoursDisplay}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: SHIFT TIMINGS & ROSTER */}
      {activeSubTab === 'roster' && (
        <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                Team Member Shift Schedules & Grace Cutoffs
              </h3>
              <p className="text-xs text-slate-400">
                Official 9-hour shifts with 30-minute grace period before late penalties
              </p>
            </div>
          </div>

          {/* Quick Schedule Explainer Card */}
          <div className="p-4 rounded-2xl bg-[#1F2636] border border-slate-700/80 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Total 9-Hour Shift Timing
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                All team members are scheduled for 9 full working hours every working day (e.g. 09:30 AM - 06:30 PM or 12:00 PM - 09:00 PM).
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-amber-400" />
                30-Minute Grace Cutoff
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Employees are marked <strong>Late</strong> if they do not clock in within 30 minutes of their shift start time.
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Alternate Saturday Off
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Every 1st, 3rd, and 5th Saturday of the month is <strong>ON (9h)</strong>. Every 2nd and 4th Saturday is <strong>OFF</strong>. Sundays are always <strong>OFF</strong>.
              </p>
            </div>
          </div>

          {/* Member Roster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {activeMembers.map((member) => {
              const start = member.shiftStart || '09:30';
              const end = member.shiftEnd || '18:30';
              const punct = checkPunctuality(start, undefined);

              return (
                <div 
                  key={member.uid}
                  className="bg-[#1F2636] border border-slate-700/80 hover:border-slate-600 rounded-2xl p-5 space-y-4 transition-all shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{member.name}</h4>
                        <p className="text-xs text-slate-400">{member.designation}</p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      9h Shift
                    </span>
                  </div>

                  <div className="p-3 bg-[#161B27] rounded-xl border border-slate-700/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Shift Timings:</span>
                      <strong className="text-white font-mono text-xs">{start} – {end} PKT</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">30m Grace Limit:</span>
                      <strong className="text-amber-400 font-mono text-xs">{punct.relaxationLimitTime}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Late Cutoff:</span>
                      <span className="text-rose-400 font-medium text-[11px]">After {punct.relaxationLimitTime}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShiftEditMember(member)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Change {member.name.split(' ')[0]}'s Shift
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SHIFT EDIT MODAL */}
      {shiftEditMember && (
        <AdminShiftModal
          member={shiftEditMember}
          isOpen={true}
          onClose={() => setShiftEditMember(null)}
          onSaveShift={handleSaveShift}
        />
      )}

    </div>
  );
};
