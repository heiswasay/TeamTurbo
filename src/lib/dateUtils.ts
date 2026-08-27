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
    return isoOrTimeStr;
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
