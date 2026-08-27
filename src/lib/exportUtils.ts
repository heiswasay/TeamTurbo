import { WorkEntry, AttendanceRecord, UserProfile } from '../types';
import { 
  formatDuration, 
  getDayOfWeek, 
  getDaySchedule, 
  checkPunctuality, 
  getDaysInMonth,
  getTodayDateString,
  formatTime
} from './dateUtils';

export function exportWorkEntriesToCSV(entries: WorkEntry[], filename = 'work_entries_export.csv') {
  const headers = [
    'Date',
    'User Name',
    'User ID',
    'Company / Project',
    'Task Description',
    'Time Spent',
    'Status',
    'Review Status',
    'Remarks',
    'Reviewed By',
    'Follow-up Note',
  ];

  const rows = entries.map((entry) => [
    `"${entry.date}"`,
    `"${(entry.userName || '').replace(/"/g, '""')}"`,
    `"${entry.userId}"`,
    `"${(entry.company || '').replace(/"/g, '""')}"`,
    `"${(entry.taskText || '').replace(/"/g, '""')}"`,
    `"${entry.timeSpent || ''}"`,
    `"${entry.status}"`,
    `"${entry.review}"`,
    `"${(entry.remarks || '').replace(/"/g, '""')}"`,
    `"${(entry.reviewedByName || '').replace(/"/g, '""')}"`,
    `"${(entry.followUpNote || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csvContent, filename);
}

export function exportAttendanceToCSV(
  attendanceRecords: AttendanceRecord[],
  users: UserProfile[],
  startDate: string,
  endDate: string,
  filename = 'attendance_daily_report.csv'
) {
  const userMap = new Map(users.map((u) => [u.uid, u]));
  const todayStr = getTodayDateString();

  const headers = [
    'Date',
    'Day',
    'Schedule Type',
    'Employee Name',
    'Email',
    'Designation',
    'Scheduled Shift',
    'First Clock-In',
    'Last Clock-Out',
    'Punctuality (>30m Grace)',
    'Attendance Status',
    'Total Worked Time',
    'Expected Hours',
    'Missing Hours / Shortfall',
    'Sessions Count',
  ];

  const rows = attendanceRecords.map((record) => {
    const user = userMap.get(record.userId);
    const sched = getDaySchedule(record.date);
    const sessions = record.sessions || [];
    const firstLogin = sessions[0]?.loginAt;
    const lastLogoff = sessions[sessions.length - 1]?.logoffAt;
    const punct = checkPunctuality(user?.shiftStart || '09:30', firstLogin);
    
    const workedMin = record.totalMinutes || 0;
    const expectedMin = sched.expectedMinutes;
    const missingMin = Math.max(0, expectedMin - workedMin);

    return [
      `"${record.date}"`,
      `"${sched.dayName}"`,
      `"${sched.label}"`,
      `"${(record.userName || user?.name || '').replace(/"/g, '""')}"`,
      `"${user?.email || ''}"`,
      `"${(user?.designation || '').replace(/"/g, '""')}"`,
      `"${user?.shiftStart || '09:30'} - ${user?.shiftEnd || '18:30'}"`,
      `"${firstLogin ? formatTime(firstLogin) : '--:--'}"`,
      `"${lastLogoff ? formatTime(lastLogoff) : record.status === 'active' ? 'Active' : '--:--'}"`,
      `"${punct.label}"`,
      `"${record.totalMinutes > 0 ? 'Present' : 'Absent'}"`,
      `"${formatDuration(workedMin)}"`,
      `"${sched.expectedHours}h"`,
      `"${missingMin > 0 ? `-${formatDuration(missingMin)}` : '0m (Target Met)'}"`,
      `"${sessions.length}"`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csvContent, filename);
}

/**
 * Full Month HR Report CSV Export
 */
export function exportMonthlyHRReportToCSV(
  year: number,
  month: number,
  users: UserProfile[],
  records: AttendanceRecord[],
  filename?: string
) {
  const dates = getDaysInMonth(year, month);
  const todayStr = getTodayDateString();
  const file = filename || `HR_Full_Month_Report_${year}_${String(month).padStart(2, '0')}.csv`;

  const headers = [
    'Date',
    'Day Name',
    'Schedule Rule',
    'Employee Name',
    'Email',
    'Designation',
    'Assigned Shift',
    'First Clock-In',
    'Last Clock-Out',
    'Punctuality Status',
    'Attendance Status',
    'Hours Worked',
    'Expected Shift Hours',
    'Missing Hours (Deficit/Absent)',
    'Sessions Details',
  ];

  const rows: string[][] = [];

  for (const date of dates) {
    const isPast = date < todayStr;
    const isCurToday = date === todayStr;
    const sched = getDaySchedule(date);

    for (const user of users) {
      if (user.active === false) continue;

      const userRecord = records.find((r) => r.userId === user.uid && r.date === date);
      const sessions = userRecord?.sessions || [];
      const firstLogin = sessions[0]?.loginAt;
      const lastLogoff = sessions[sessions.length - 1]?.logoffAt;
      const punct = checkPunctuality(user.shiftStart || '09:30', firstLogin);
      const workedMin = userRecord?.totalMinutes || 0;

      let attendanceStatus = 'Off (Rest Day)';
      let missingMin = 0;
      let punctualityLabel = 'Off';

      if (sched.isWorkingDay) {
        if (workedMin > 0 || (isCurToday && userRecord?.status === 'active')) {
          attendanceStatus = punct.isLate ? 'Present (Late Arrival)' : 'Present (On Time)';
          punctualityLabel = punct.label;
          missingMin = Math.max(0, sched.expectedMinutes - workedMin);
        } else if (isPast) {
          attendanceStatus = 'ABSENT (No Clock-In)';
          punctualityLabel = 'Absent';
          missingMin = sched.expectedMinutes; // Full 9 hours missing
        } else if (isCurToday) {
          attendanceStatus = 'Pending Clock-In';
          punctualityLabel = 'Awaiting Start';
          missingMin = 0;
        } else {
          attendanceStatus = 'Upcoming Working Day';
          punctualityLabel = 'Upcoming';
          missingMin = 0;
        }
      }

      const sessionsStr = sessions
        .map((s, idx) => `[S${idx + 1}: ${s.loginAt?.slice(11, 16) || '--'} - ${s.logoffAt?.slice(11, 16) || 'Active'} (${s.durationMinutes || 0}m)]`)
        .join('; ');

      rows.push([
        `"${date}"`,
        `"${sched.dayName}"`,
        `"${sched.label}"`,
        `"${user.name.replace(/"/g, '""')}"`,
        `"${user.email}"`,
        `"${user.designation.replace(/"/g, '""')}"`,
        `"${user.shiftStart || '09:30'} - ${user.shiftEnd || '18:30'} (9h)"`,
        `"${firstLogin ? formatTime(firstLogin) : '--:--'}"`,
        `"${lastLogoff ? formatTime(lastLogoff) : userRecord?.status === 'active' ? 'Active' : '--:--'}"`,
        `"${punctualityLabel}"`,
        `"${attendanceStatus}"`,
        `"${(workedMin / 60).toFixed(2)}h (${formatDuration(workedMin)})"`,
        `"${sched.expectedHours}h"`,
        `"${missingMin > 0 ? `-${(missingMin / 60).toFixed(2)}h (-${formatDuration(missingMin)})` : '0h (Complete)'}"`,
        `"${sessionsStr.replace(/"/g, '""')}"`,
      ]);
    }
  }

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csvContent, file);
}

function downloadCSV(csvString: string, filename: string) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
