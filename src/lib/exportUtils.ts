import { WorkEntry, AttendanceRecord, UserProfile } from '../types';
import { formatDuration, getDayOfWeek } from './dateUtils';

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
  filename = 'attendance_hr_report.csv'
) {
  const userMap = new Map(users.map((u) => [u.uid, u]));

  const headers = [
    'Date',
    'Day',
    'Employee Name',
    'Email',
    'Designation',
    'Sessions Count',
    'Session Details',
    'Total Worked Time',
    'Total Minutes',
    'Expected Hours',
    'Shift Deficit / Overtime',
    'Status',
    'Auto-Closed Flag',
  ];

  const rows = attendanceRecords.map((record) => {
    const user = userMap.get(record.userId);
    const dayOfWeek = getDayOfWeek(record.date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const expectedHours = user?.expectedHoursMap?.[dayOfWeek] ?? (dayOfWeek === 0 || dayOfWeek === 6 ? 0 : 8);
    const workedHours = record.totalMinutes / 60;
    const diffHours = (workedHours - expectedHours).toFixed(2);
    const diffStr = Number(diffHours) >= 0 ? `+${diffHours}h` : `${diffHours}h (Shortfall)`;

    const sessionsList = record.sessions || [];
    const sessionsStr = sessionsList
      .map((s, idx) => `[S${idx + 1}: ${s.loginAt?.slice(11, 16) || '--'} to ${s.logoffAt?.slice(11, 16) || 'Active'} (${s.durationMinutes || 0}m)]`)
      .join('; ');

    return [
      `"${record.date}"`,
      `"${dayNames[dayOfWeek]}"`,
      `"${(record.userName || user?.name || '').replace(/"/g, '""')}"`,
      `"${user?.email || ''}"`,
      `"${(user?.designation || '').replace(/"/g, '""')}"`,
      `"${sessionsList.length}"`,
      `"${sessionsStr.replace(/"/g, '""')}"`,
      `"${formatDuration(record.totalMinutes)}"`,
      `"${record.totalMinutes}"`,
      `"${expectedHours}h"`,
      `"${diffStr}"`,
      `"${record.status}"`,
      `"${record.autoClosed ? 'YES' : 'NO'}"`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csvContent, filename);
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
