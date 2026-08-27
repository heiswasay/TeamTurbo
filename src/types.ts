export type UserRole = 'member' | 'admin';

export type TaskStatus = 'completed' | 'in_progress' | 'pending';
export type ReviewStatus = 'ok' | 'needs_rework' | 'pending';
export type TaskPriority = 'low' | 'medium' | 'high';
export type AssignedTaskStatus = 'open' | 'in_progress' | 'done';
export type HandoverStatus = 'pending' | 'accepted' | 'completed';
export type AttendanceStatus = 'active' | 'closed';

export interface WeekdayHoursMap {
  [key: number]: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (expected hours)
}

export interface NotificationPreferences {
  newTask: boolean;
  handover: boolean;
  rework: boolean;
  adminNewLog?: boolean;
  soundEnabled?: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  shiftStart?: string; // e.g. "10:30"
  shiftEnd?: string;   // e.g. "18:30"
  expectedHoursMap?: WeekdayHoursMap;
  active: boolean;
  mustChangePassword?: boolean;
  profilePhoto?: string;
  appearance?: 'dark' | 'light';
  notificationPreferences?: NotificationPreferences;
  createdAt?: any;
  updatedAt?: any;
}

export interface WorkEntry {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  company: string;
  taskText: string;
  timeSpent: string; // e.g. "2h 30m" or "1.5h"
  status: TaskStatus;
  review: ReviewStatus;
  remarks?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: any;
  followUpNote?: string;
  followUpAt?: any;
  assignedTaskId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AssignedTask {
  id: string;
  assignedTo: string;
  assignedToName?: string;
  assignedBy: string;
  assignedByName: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  company?: string;
  status: AssignedTaskStatus;
  workEntryId?: string;
  createdAt?: any;
  completedAt?: any;
  updatedAt?: any;
}

export interface Handover {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  title: string;
  message: string;
  relatedCompany: string;
  status: HandoverStatus;
  acknowledgedAt?: any;
  createdAt?: any;
}

export interface AttendanceSession {
  loginAt: string; // ISO string or time string
  logoffAt?: string;
  durationMinutes?: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  sessions: AttendanceSession[];
  totalMinutes: number;
  status: AttendanceStatus;
  isLate?: boolean;
  lateMinutes?: number;
  latePastGraceMinutes?: number;
  firstLoginAt?: string;
  autoClosed?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface CompanyTag {
  id: string;
  name: string;
  archived?: boolean;
  createdAt?: any;
}

export const DEFAULT_COMPANIES = [
  'GuardianFM',
  'Servionsoft',
  'Xtreme',
  'Arabian Grill',
  'Ceres',
  'NextChat',
  'NextFriend',
  'Nutracene',
];

export const INITIAL_DEMO_USERS: Omit<UserProfile, 'uid'>[] = [
  {
    name: 'Abdul Wasay',
    email: 'wasay@teamturbo.com',
    role: 'admin',
    designation: 'Digital Marketing Lead',
    shiftStart: '10:30',
    shiftEnd: '19:30',
    active: true,
    mustChangePassword: true,
    expectedHoursMap: { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 0: 0 },
  },
  {
    name: 'Hurain Nadeem',
    email: 'hurain@teamturbo.com',
    role: 'member',
    designation: 'SEO Specialist',
    shiftStart: '09:30',
    shiftEnd: '18:30',
    active: true,
    mustChangePassword: true,
    expectedHoursMap: { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 0: 0 },
  },
  {
    name: 'Faiza',
    email: 'faiza@teamturbo.com',
    role: 'member',
    designation: 'Graphic Designer / Video Editor',
    shiftStart: '09:30',
    shiftEnd: '18:30',
    active: true,
    mustChangePassword: true,
    expectedHoursMap: { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 0: 0 },
  },
  {
    name: 'Aazmeer',
    email: 'aazmeer@teamturbo.com',
    role: 'member',
    designation: 'Graphic Designer',
    shiftStart: '12:00',
    shiftEnd: '21:00',
    active: true,
    mustChangePassword: true,
    expectedHoursMap: { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 0: 0 },
  },
];
