import React, { useState, useEffect, useMemo } from 'react';
import { WorkEntry, UserProfile, ReviewStatus, AttendanceRecord, ItemChatMessage } from '../../types';
import { 
  formatDateLabel, 
  getTodayDateString, 
  getDayOfWeek,
  getDaySchedule,
  checkPunctuality,
  checkLiveArrivalStatus,
  formatTime
} from '../../lib/dateUtils';
import { AttendanceWidget } from '../member/AttendanceWidget';
import { ItemFeedbackChat } from '../common/ItemFeedbackChat';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Clock3, 
  User, 
  Building2, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles,
  Send,
  Timer,
  PlayCircle,
  StopCircle,
  AlertTriangle,
  ShieldAlert,
  UserX,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AdminLiveTodayProps {
  entries: WorkEntry[];
  teamMembers: UserProfile[];
  attendanceRecords?: AttendanceRecord[];
  chatMessages?: ItemChatMessage[];
  onSendMessage?: (targetId: string, targetType: 'work_entry' | 'assigned_task', text: string) => Promise<any>;
  onDeleteChatMessage?: (messageId: string) => Promise<any>;
  onUpdateReview: (entryId: string, review: ReviewStatus, remarks?: string) => Promise<void>;
  onDeleteEntry?: (entryId: string) => Promise<void>;
  adminId?: string;
  adminName: string;
}

// Format seconds into HH:MM:SS
function formatDurationClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Format minutes into Xh Ym
function formatHoursMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.floor(totalMinutes));
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

// Small Live Clock Pill for a member
const MemberLiveClockBadge: React.FC<{
  member: UserProfile;
  attendance?: AttendanceRecord | null;
}> = ({ member, attendance }) => {
  const [now, setNow] = useState<number>(Date.now());

  const isActive = attendance?.status === 'active';

  // Live timer tick every 1 second if active
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  const stats = useMemo(() => {
    if (!attendance || !attendance.sessions || attendance.sessions.length === 0) {
      return {
        status: 'none' as const,
        totalSeconds: 0,
        display: 'Not Clocked In',
      };
    }

    let completedSeconds = 0;
    let activeSessionStart: number | null = null;

    for (const sess of attendance.sessions) {
      if (sess.loginAt && sess.logoffAt) {
        const dur = (new Date(sess.logoffAt).getTime() - new Date(sess.loginAt).getTime()) / 1000;
        completedSeconds += Math.max(0, dur);
      } else if (sess.loginAt && !sess.logoffAt) {
        activeSessionStart = new Date(sess.loginAt).getTime();
      }
    }

    if (attendance.status === 'active' && activeSessionStart) {
      const activeSecs = Math.max(0, (now - activeSessionStart) / 1000);
      const totalSecs = completedSeconds + activeSecs;
      return {
        status: 'active' as const,
        totalSeconds: totalSecs,
        display: formatDurationClock(totalSecs),
      };
    }

    const totalSecs = completedSeconds > 0 ? completedSeconds : (attendance.totalMinutes || 0) * 60;
    return {
      status: 'closed' as const,
      totalSeconds: totalSecs,
      display: formatHoursMinutes(totalSecs / 60),
    };
  }, [attendance, now]);

  const targetHours = member.expectedHoursMap?.[getDayOfWeek(getTodayDateString())] ?? 8;
  const targetSeconds = targetHours * 3600;
  const progressPct = Math.min(100, Math.round((stats.totalSeconds / (targetSeconds || 1)) * 100));

  if (stats.status === 'active') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider">
          <span>{stats.display}</span>
          <span className="text-[10px] font-sans text-emerald-300 font-semibold px-1 py-0.2 bg-emerald-500/20 rounded">
            Live ({progressPct}%)
          </span>
        </div>
      </div>
    );
  }

  if (stats.status === 'closed') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1F2636] border border-slate-700/80 text-slate-300">
        <Clock className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-mono text-xs font-bold text-white">{stats.display}</span>
        <span className="text-[10px] text-slate-400">spent</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1F2636]/60 border border-slate-800 text-slate-500 text-xs">
      <Clock className="w-3.5 h-3.5 text-slate-600" />
      <span className="text-[11px] font-medium">Off Clock</span>
    </div>
  );
};

export const AdminLiveToday: React.FC<AdminLiveTodayProps> = ({
  entries = [],
  teamMembers = [],
  attendanceRecords = [],
  chatMessages = [],
  onSendMessage,
  onDeleteChatMessage,
  onUpdateReview,
  onDeleteEntry,
  adminId = '',
  adminName,
}) => {
  const todayStr = getTodayDateString();
  const daySchedule = useMemo(() => getDaySchedule(todayStr), [todayStr]);
  const todayEntries = (entries || []).filter((e) => e.date === todayStr);

  // Group entries by member (excluding admin accounts from member grids)
  const entriesByMember: { [userId: string]: WorkEntry[] } = {};

  for (const member of (teamMembers || [])) {
    if (member.active !== false && member.role !== 'admin') {
      entriesByMember[member.uid] = [];
    }
  }

  for (const entry of todayEntries) {
    if (entriesByMember[entry.userId] !== undefined) {
      entriesByMember[entry.userId].push(entry);
    }
  }

  const activeMembersCount = Object.keys(entriesByMember).filter(
    (uid) => (entriesByMember[uid]?.length || 0) > 0
  ).length;

  // Attendance by user
  const attendanceByUser = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of attendanceRecords) {
      if (rec.date === todayStr) {
        map.set(rec.userId, rec);
      }
    }
    return map;
  }, [attendanceRecords, todayStr]);

  const activeStaffList = useMemo(() => {
    return teamMembers.filter((m) => m.active !== false && m.role !== 'admin');
  }, [teamMembers]);

  const currentlyClockedInCount = activeStaffList.filter(
    (m) => attendanceByUser.get(m.uid)?.status === 'active'
  ).length;

  // Analyze punctuality and late arrivals for each team member today
  const teamPunctualityList = useMemo(() => {
    return activeStaffList.map((member) => {
      const att = attendanceByUser.get(member.uid);
      const firstLogin = att?.firstLoginAt || att?.sessions?.[0]?.loginAt;
      const punct = checkLiveArrivalStatus(
        member.shiftStart || '10:30',
        firstLogin,
        daySchedule.isWorkingDay
      );

      return {
        member,
        attendance: att,
        firstLogin,
        punct,
      };
    });
  }, [activeStaffList, attendanceByUser, daySchedule]);

  // Filter members who are marked late (clocked in late) OR overdue (have not arrived yet past 30m grace)
  const lateMembersList = useMemo(() => {
    return teamPunctualityList.filter((item) => item.punct.isLate);
  }, [teamPunctualityList]);

  return (
    <div className="space-y-6">
      
      {/* Top Section: Admin Shift Clock & Live Team Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Admin Square Clock Card */}
        <div className="lg:col-span-4 flex flex-col">
          <AttendanceWidget className="h-full" />
        </div>

        {/* Live Team Stream Overview Card */}
        <div className="lg:col-span-8 bg-[#161B27] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-black uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Firestore Stream
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {todayStr}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Today's Live Team Activity
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Live real-time feed of work accomplishments, 30m relaxation punctuality tracking, and shift timers
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4 relative z-10 flex-wrap">
            <div className="flex items-center gap-4 bg-[#1F2636] px-4 py-3 rounded-2xl border border-slate-700/80">
              <div>
                <span className="text-xl font-black text-white">
                  {todayEntries.length}
                </span>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Logs</p>
              </div>
              <div className="h-7 w-px bg-slate-700" />
              <div>
                <span className="text-xl font-black text-emerald-400">
                  {currentlyClockedInCount}
                </span>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clocked In Now</p>
              </div>
              <div className="h-7 w-px bg-slate-700" />
              <div>
                <span className={`text-xl font-black ${lateMembersList.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {lateMembersList.length}
                </span>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Late Arrivals</p>
              </div>
              <div className="h-7 w-px bg-slate-700" />
              <div>
                <span className="text-xl font-black text-indigo-400">
                  {activeMembersCount}/{activeStaffList.length}
                </span>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Logged Work</p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-slate-400">Supervising Lead: <strong className="text-indigo-400">{adminName}</strong></p>
              <p className="text-[10px] text-slate-500">Grace threshold: 30 minutes from shift start</p>
            </div>
          </div>
        </div>

      </div>

      {/* Quick Team Shift Clocks Overview Strip */}
      <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Timer className="w-4 h-4 text-emerald-400" />
            Live Member Shift Timers & Punctuality
          </h3>
          <span className="text-[11px] text-slate-400">
            {currentlyClockedInCount} of {activeStaffList.length} active now
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {teamPunctualityList.map(({ member, attendance: att, punct }) => {
            return (
              <div
                key={`quick-clock-${member.uid}`}
                className={`p-3 rounded-2xl flex items-center justify-between gap-2 border transition-all ${
                  punct.isLate
                    ? 'bg-rose-950/20 border-rose-600/40 hover:border-rose-500/60'
                    : 'bg-[#1F2636] border-slate-700/70 hover:border-slate-600'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">{member.name}</p>
                    {punct.isLate && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                        LATE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{member.designation}</p>
                </div>
                <div className="shrink-0">
                  <MemberLiveClockBadge member={member} attendance={att} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Masonry Layout of Team Members with Today's Entries */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Column 1 */}
        <div className="space-y-6 flex flex-col">
          {teamPunctualityList
            .filter((_, idx) => idx % 2 === 0)
            .map(({ member, attendance: att, punct }) => {
              const memberEntries = entriesByMember[member.uid] || [];

              return (
                <div
                  key={member.uid}
                  className={`bg-[#161B27] border rounded-3xl p-6 shadow-xl space-y-4 transition-all ${
                    punct.isLate ? 'border-rose-600/40' : 'border-slate-800'
                  }`}
                >
                  {/* Member Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center text-sm border shrink-0 ${
                        punct.isLate 
                          ? 'bg-rose-600 shadow-rose-600/20 border-rose-400/20' 
                          : 'bg-indigo-600 shadow-indigo-600/20 border-indigo-400/20'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">
                            {member.name}
                          </h3>
                          {punct.isLate && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full font-bold uppercase tracking-wider">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                              LATE
                            </span>
                          )}
                          {member.role === 'admin' && (
                            <span className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-bold uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {member.designation} • Shift: {member.shiftStart || '10:30'} – {member.shiftEnd || '18:30'}
                        </p>
                      </div>
                    </div>

                    {/* Live Clock Badge + Entry Count Pill */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <MemberLiveClockBadge member={member} attendance={att} />

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${
                        memberEntries.length > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-[#1F2636] text-slate-400 border-slate-700/60'
                      }`}>
                        {memberEntries.length} {memberEntries.length === 1 ? 'log' : 'logs'}
                      </span>
                    </div>
                  </div>

                  {/* Member's Today Entries */}
                  <div className="space-y-3">
                    {memberEntries.length === 0 ? (
                      <div className="py-8 text-center bg-[#1F2636]/50 rounded-2xl border border-dashed border-slate-800">
                        <Clock className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                        <p className="text-xs text-slate-500">No work logged yet today</p>
                      </div>
                    ) : (
                      memberEntries.map((entry) => (
                        <AdminEntryReviewCard
                          key={entry.id}
                          entry={entry}
                          chatMessages={chatMessages}
                          onSendMessage={onSendMessage}
                          onDeleteChatMessage={onDeleteChatMessage}
                          onUpdateReview={onUpdateReview}
                          onDeleteEntry={onDeleteEntry}
                          adminId={adminId}
                          adminName={adminName}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Column 2 */}
        <div className="space-y-6 flex flex-col">
          {teamPunctualityList
            .filter((_, idx) => idx % 2 === 1)
            .map(({ member, attendance: att, punct }) => {
              const memberEntries = entriesByMember[member.uid] || [];

              return (
                <div
                  key={member.uid}
                  className={`bg-[#161B27] border rounded-3xl p-6 shadow-xl space-y-4 transition-all ${
                    punct.isLate ? 'border-rose-600/40' : 'border-slate-800'
                  }`}
                >
                  {/* Member Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center text-sm border shrink-0 ${
                        punct.isLate 
                          ? 'bg-rose-600 shadow-rose-600/20 border-rose-400/20' 
                          : 'bg-indigo-600 shadow-indigo-600/20 border-indigo-400/20'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">
                            {member.name}
                          </h3>
                          {punct.isLate && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full font-bold uppercase tracking-wider">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                              LATE
                            </span>
                          )}
                          {member.role === 'admin' && (
                            <span className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-bold uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {member.designation} • Shift: {member.shiftStart || '10:30'} – {member.shiftEnd || '18:30'}
                        </p>
                      </div>
                    </div>

                    {/* Live Clock Badge + Entry Count Pill */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <MemberLiveClockBadge member={member} attendance={att} />

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${
                        memberEntries.length > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-[#1F2636] text-slate-400 border-slate-700/60'
                      }`}>
                        {memberEntries.length} {memberEntries.length === 1 ? 'log' : 'logs'}
                      </span>
                    </div>
                  </div>

                  {/* Member's Today Entries */}
                  <div className="space-y-3">
                    {memberEntries.length === 0 ? (
                      <div className="py-8 text-center bg-[#1F2636]/50 rounded-2xl border border-dashed border-slate-800">
                        <Clock className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                        <p className="text-xs text-slate-500">No work logged yet today</p>
                      </div>
                    ) : (
                      memberEntries.map((entry) => (
                        <AdminEntryReviewCard
                          key={entry.id}
                          entry={entry}
                          chatMessages={chatMessages}
                          onSendMessage={onSendMessage}
                          onDeleteChatMessage={onDeleteChatMessage}
                          onUpdateReview={onUpdateReview}
                          onDeleteEntry={onDeleteEntry}
                          adminId={adminId}
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

    </div>
  );
};

// Inline review & remarks card
interface AdminEntryReviewCardProps {
  entry: WorkEntry;
  chatMessages?: ItemChatMessage[];
  onSendMessage?: (targetId: string, targetType: 'work_entry' | 'assigned_task', text: string) => Promise<any>;
  onDeleteChatMessage?: (messageId: string) => Promise<any>;
  onUpdateReview: (entryId: string, review: ReviewStatus, remarks?: string) => Promise<void>;
  onDeleteEntry?: (entryId: string) => Promise<void>;
  adminId?: string;
  adminName: string;
}

export const AdminEntryReviewCard: React.FC<AdminEntryReviewCardProps> = ({
  entry,
  chatMessages = [],
  onSendMessage,
  onDeleteChatMessage,
  onUpdateReview,
  onDeleteEntry,
  adminId = '',
  adminName,
}) => {
  const [review, setReview] = useState<ReviewStatus>(entry.review);
  const [remarks, setRemarks] = useState(entry.remarks || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const entryChatMessages = chatMessages.filter(
    (m) => m.targetId === entry.id && m.targetType === 'work_entry'
  );

  const handleDelete = async () => {
    if (!onDeleteEntry) return;
    const confirmMsg = `Are you sure you want to permanently delete this work entry (${entry.company} - ${entry.timeSpent})?`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      await onDeleteEntry(entry.id);
    } catch (err) {
      console.error('Failed to delete work entry:', err);
      alert('Failed to delete entry. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleReviewChange = async (newReview: ReviewStatus) => {
    setReview(newReview);
    setIsSaving(true);
    try {
      await onUpdateReview(entry.id, newReview, remarks);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update review:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemarksBlur = async () => {
    if (remarks !== (entry.remarks || '')) {
      setIsSaving(true);
      try {
        await onUpdateReview(entry.id, review, remarks);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      } catch (err) {
        console.error('Failed to update remarks:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="bg-[#1F2636] border border-slate-700/80 rounded-2xl p-4 space-y-3 transition-all hover:border-slate-600 relative">
      
      {/* Top Details */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
            {entry.company}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            {entry.timeSpent}
          </span>
          <span className="text-slate-500">•</span>
          <span className={`font-bold capitalize text-[11px] ${
            entry.status === 'completed' ? 'text-emerald-400' : entry.status === 'in_progress' ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {entry.status.replace('_', ' ')}
          </span>
        </div>

        {/* Status indicator & Admin Delete button */}
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-[11px] text-slate-400 animate-pulse font-medium">Saving...</span>}
          {savedSuccess && <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Saved</span>}
          
          {onDeleteEntry && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              title="Delete work log entry (Admin only)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/30 flex items-center gap-1 text-[11px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Task text */}
      <p className="text-xs text-slate-200 leading-relaxed bg-[#161B27] p-3.5 rounded-xl border border-slate-700/60">
        {entry.taskText}
      </p>

      {/* Member follow up note if rework was submitted */}
      {entry.followUpNote && (
        <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-300 text-[11px] uppercase tracking-wider">Member Follow-up:</span>
            <p className="mt-0.5">{entry.followUpNote}</p>
          </div>
        </div>
      )}

      {/* Inline Review Controls & Remarks */}
      <div className="pt-3 border-t border-slate-700/60 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Lead Review:
          </label>

          {/* Quick Review Buttons */}
          <div className="inline-flex rounded-xl p-1 bg-[#161B27] border border-slate-700/60 gap-1">
            <button
              type="button"
              onClick={() => handleReviewChange('ok')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                review === 'ok'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2636]'
              }`}
            >
              OK (Approve)
            </button>
            <button
              type="button"
              onClick={() => handleReviewChange('needs_rework')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                review === 'needs_rework'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2636]'
              }`}
            >
              Needs Rework
            </button>
            <button
              type="button"
              onClick={() => handleReviewChange('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                review === 'pending'
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2636]'
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        {/* Inline Remarks Input */}
        <div className="relative">
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            onBlur={handleRemarksBlur}
            placeholder="Add lead remarks or quick feedback (auto-saves on blur)..."
            className="w-full bg-[#161B27] border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all pl-8.5 font-medium"
          />
          <MessageSquare className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {/* Discussion / Chat Toggle */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              showChat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : entryChatMessages.length > 0
                ? 'bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30'
                : 'bg-[#161B27] hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {entryChatMessages.length > 0 
                ? `Discussion & Chat (${entryChatMessages.length})` 
                : 'Open Chat Thread'}
            </span>
            {showChat ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            )}
          </button>
        </div>

        {/* Expanded Discussion Chat */}
        {showChat && onSendMessage && (
          <ItemFeedbackChat
            targetId={entry.id}
            targetType="work_entry"
            targetTitle={`${entry.userName} • ${entry.company}`}
            targetSubtitle={entry.taskText.slice(0, 45)}
            messages={chatMessages}
            currentUserId={adminId}
            currentUserName={adminName}
            currentUserRole="admin"
            onSendMessage={onSendMessage}
            onDeleteMessage={onDeleteChatMessage}
            isInline={true}
          />
        )}
      </div>

    </div>
  );
};
