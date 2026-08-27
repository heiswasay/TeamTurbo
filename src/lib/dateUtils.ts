export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(isoOrTimeStr?: string): string {
  if (!isoOrTimeStr) return '--:--';
  if (isoOrTimeStr.length === 5 && isoOrTimeStr.includes(':')) {
    const [h, m] = isoOrTimeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }
  try {
    const d = new Date(isoOrTimeStr);
    if (isNaN(d.getTime())) return isoOrTimeStr;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoOrTimeStr;
  }
}

export function formatDuration(minutes: number): string {
  if (!minutes || isNaN(minutes) || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
}

export function getPastDates(daysCount: number = 30): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

export function isPastDate(dateStr: string): boolean {
  return dateStr < getTodayDateString();
}

export function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateString();
}

/**
 * Returns ordinal string (1st, 2nd, 3rd, etc.)
 */
export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Determines the Saturday index within the month (1st, 2nd, 3rd, 4th, or 5th Saturday)
 */
export function getSaturdayIndexInMonth(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  let count = 0;
  for (let d = 1; d <= day; d++) {
    const temp = new Date(year, month - 1, d);
    if (temp.getDay() === 6) {
      count++;
    }
  }
  return count;
}

export type DayScheduleType = 'regular_work' | 'saturday_work' | 'saturday_off' | 'sunday_off';

export interface DaySchedule {
  date: string;
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  expectedHours: number; // default 9 for working days
  expectedMinutes: number; // default 540 for working days
  dayType: DayScheduleType;
  label: string;
  saturdayIndex?: number;
}

/**
 * Calculates whether a date is a required working day (9 hours) or off day.
 * Rules:
 * - Total shift timing of all members is 9 hours a day.
 * - Alternative Saturday OFF:
 *   - 1st Saturday of month: ON (Working Day, 9h)
 *   - 2nd Saturday of month: OFF (Alternate Saturday Off, 0h)
 *   - 3rd Saturday of month: ON (Working Day, 9h)
 *   - 4th Saturday of month: OFF (Alternate Saturday Off, 0h)
 *   - 5th Saturday of month: ON (Working Day, 9h)
 * - Sunday: OFF (0h)
 * - Monday - Friday: ON (Working Day, 9h)
 */
export function getDaySchedule(dateStr: string): DaySchedule {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dow];

  // Sunday = OFF
  if (dow === 0) {
    return {
      date: dateStr,
      dayOfWeek: 0,
      dayName,
      isWorkingDay: false,
      expectedHours: 0,
      expectedMinutes: 0,
      dayType: 'sunday_off',
      label: 'Sunday (Weekend Off)',
    };
  }

  // Mon to Fri = Regular working day (9 hours)
  if (dow >= 1 && dow <= 5) {
    return {
      date: dateStr,
      dayOfWeek: dow,
      dayName,
      isWorkingDay: true,
      expectedHours: 9,
      expectedMinutes: 540,
      dayType: 'regular_work',
      label: 'Regular Working Day (9h)',
    };
  }

  // Saturday (dow === 6): Check alternate Saturday off rule (1st Saturday ON)
  const satIndex = getSaturdayIndexInMonth(dateStr);
  const isSatWorking = satIndex % 2 === 1; // 1st, 3rd, 5th Saturday are ON
  const satLabel = `${getOrdinal(satIndex)} Saturday`;

  if (isSatWorking) {
    return {
      date: dateStr,
      dayOfWeek: 6,
      dayName,
      isWorkingDay: true,
      expectedHours: 9,
      expectedMinutes: 540,
      dayType: 'saturday_work',
      label: `${satLabel} (Working Day - 9h)`,
      saturdayIndex: satIndex,
    };
  } else {
    return {
      date: dateStr,
      dayOfWeek: 6,
      dayName,
      isWorkingDay: false,
      expectedHours: 0,
      expectedMinutes: 0,
      dayType: 'saturday_off',
      label: `${satLabel} (Alternate Off)`,
      saturdayIndex: satIndex,
    };
  }
}

/**
 * Checks punctuality against a 30-minute relaxation / grace period from shift start time.
 * If user clocks in > 30 minutes after start time, they are marked Late.
 */
export function checkPunctuality(
  shiftStart: string = '09:30',
  firstLoginAt?: string
): {
  isLate: boolean;
  minutesFromStart: number;
  minutesPastGrace: number;
  shiftStartTimeFormatted: string;
  relaxationLimitTime: string;
  clockInTimeFormatted: string;
  label: string;
  shortBadge: string;
  badgeClass: string;
} {
  // Parse shiftStart into hours and minutes
  let startH = 9;
  let startM = 30;
  if (shiftStart) {
    const parts = shiftStart.split(':').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      startH = parts[0];
      startM = parts[1];
    }
  }

  const shiftStartMinutes = startH * 60 + startM;
  const relaxationLimitMinutes = shiftStartMinutes + 30; // 30 minutes relaxation window
  const limitH = Math.floor(relaxationLimitMinutes / 60) % 24;
  const limitM = relaxationLimitMinutes % 60;
  const relaxationLimitStr = `${limitH % 12 === 0 ? 12 : limitH % 12}:${String(limitM).padStart(2, '0')} ${limitH >= 12 ? 'PM' : 'AM'}`;
  const shiftStartFormatted = `${startH % 12 === 0 ? 12 : startH % 12}:${String(startM).padStart(2, '0')} ${startH >= 12 ? 'PM' : 'AM'}`;

  if (!firstLoginAt) {
    return {
      isLate: false,
      minutesFromStart: 0,
      minutesPastGrace: 0,
      shiftStartTimeFormatted: shiftStartFormatted,
      relaxationLimitTime: relaxationLimitStr,
      clockInTimeFormatted: '--:--',
      label: 'No Clock In',
      shortBadge: 'OFF CLOCK',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    };
  }

  // Parse firstLoginAt
  let loginMinutes = 0;
  let clockInTimeFormatted = '--:--';
  if (firstLoginAt.includes('T')) {
    // ISO string
    const d = new Date(firstLoginAt);
    loginMinutes = d.getHours() * 60 + d.getMinutes();
    clockInTimeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } else if (firstLoginAt.includes(':')) {
    const parts = firstLoginAt.split(':').map(Number);
    loginMinutes = parts[0] * 60 + parts[1];
    const h = parts[0];
    const m = parts[1];
    clockInTimeFormatted = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  const minutesFromStart = loginMinutes - shiftStartMinutes;
  const minutesPastGrace = loginMinutes - relaxationLimitMinutes;

  if (loginMinutes > relaxationLimitMinutes) {
    return {
      isLate: true,
      minutesFromStart,
      minutesPastGrace,
      shiftStartTimeFormatted: shiftStartFormatted,
      relaxationLimitTime: relaxationLimitStr,
      clockInTimeFormatted,
      label: `Late by ${minutesFromStart}m (${minutesPastGrace}m past 30m relaxation)`,
      shortBadge: `LATE (+${minutesFromStart}m)`,
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700 shadow-sm shadow-rose-950/50',
    };
  } else if (minutesFromStart > 0) {
    return {
      isLate: false,
      minutesFromStart,
      minutesPastGrace: 0,
      shiftStartTimeFormatted: shiftStartFormatted,
      relaxationLimitTime: relaxationLimitStr,
      clockInTimeFormatted,
      label: `On Time (${minutesFromStart}m grace used)`,
      shortBadge: 'ON TIME',
      badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70',
    };
  } else {
    return {
      isLate: false,
      minutesFromStart,
      minutesPastGrace: 0,
      shiftStartTimeFormatted: shiftStartFormatted,
      relaxationLimitTime: relaxationLimitStr,
      clockInTimeFormatted,
      label: 'Early / On Time',
      shortBadge: 'ON TIME',
      badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70',
    };
  }
}

/**
 * Checks live arrival status of a user today in real time.
 * If user hasn't clocked in and current time is past 30m relaxation on a working day, marks them overdue late.
 */
export function checkLiveArrivalStatus(
  shiftStart: string = '09:30',
  firstLoginAt?: string,
  isWorkingDay: boolean = true
): {
  isLate: boolean;
  isOverdue: boolean;
  hasClockedIn: boolean;
  minutesFromStart: number;
  minutesPastGrace: number;
  shiftStartTimeFormatted: string;
  relaxationLimitTime: string;
  clockInTimeFormatted: string;
  label: string;
  shortBadge: string;
  badgeClass: string;
} {
  if (firstLoginAt) {
    const punct = checkPunctuality(shiftStart, firstLoginAt);
    return {
      ...punct,
      isOverdue: false,
      hasClockedIn: true,
    };
  }

  // Parse shiftStart into hours and minutes
  let startH = 9;
  let startM = 30;
  if (shiftStart) {
    const parts = shiftStart.split(':').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      startH = parts[0];
      startM = parts[1];
    }
  }

  const shiftStartMinutes = startH * 60 + startM;
  const relaxationLimitMinutes = shiftStartMinutes + 30;
  const limitH = Math.floor(relaxationLimitMinutes / 60) % 24;
  const limitM = relaxationLimitMinutes % 60;
  const relaxationLimitStr = `${limitH % 12 === 0 ? 12 : limitH % 12}:${String(limitM).padStart(2, '0')} ${limitH >= 12 ? 'PM' : 'AM'}`;
  const shiftStartFormatted = `${startH % 12 === 0 ? 12 : startH % 12}:${String(startM).padStart(2, '0')} ${startH >= 12 ? 'PM' : 'AM'}`;

  if (!isWorkingDay) {
    return {
      isLate: false,
      isOverdue: false,
      hasClockedIn: false,
      minutesFromStart: 0,
      minutesPastGrace: 0,
      shiftStartTimeFormatted: shiftStartFormatted,
      relaxationLimitTime: relaxationLimitStr,
      clockInTimeFormatted: '--:--',
      label: 'Off Day',
      shortBadge: 'OFF DAY',
      badgeClass: 'bg-slate-800/80 text-slate-400 border-slate-700',
    };
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const minutesFromStart = nowMinutes - shiftStartMinutes;
  const minutesPastGrace = nowMinutes - relaxationLimitMinutes;

  if (nowMinutes > relaxationLimitMinutes) {
    return {
      isLate: true,
      isOverdue: true,
      hasClockedIn: false,
      minutesFromStart,
      minutesPastGrace,
      shiftStartTimeFormatted: shiftStartFormatted,
      relaxationLimitTime: relaxationLimitStr,
      clockInTimeFormatted: 'Not Arrived',
      label: `Overdue by ${minutesFromStart}m (${minutesPastGrace}m past 30m relaxation)`,
      shortBadge: `LATE (${minutesPastGrace}m OVERDUE)`,
      badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-700 shadow-sm shadow-rose-950/50 animate-pulse',
    };
  }

  return {
    isLate: false,
    isOverdue: false,
    hasClockedIn: false,
    minutesFromStart: Math.max(0, minutesFromStart),
    minutesPastGrace: 0,
    shiftStartTimeFormatted: shiftStartFormatted,
    relaxationLimitTime: relaxationLimitStr,
    clockInTimeFormatted: 'Not Clocked In',
    label: nowMinutes >= shiftStartMinutes ? `Within 30m Grace (Relaxation ends ${relaxationLimitStr})` : `Shift starts at ${shiftStartFormatted}`,
    shortBadge: 'PENDING ARRIVAL',
    badgeClass: 'bg-amber-950/50 text-amber-300 border-amber-800/50',
  };
}

/**
 * Returns all dates for a given month (YYYY-MM-DD)
 */
export function getDaysInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysCount = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysCount; d++) {
    const mStr = String(month).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    dates.push(`${year}-${mStr}-${dStr}`);
  }
  return dates;
}

/**
 * Format month label (e.g. August 2026)
 */
export function formatMonthYearLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
