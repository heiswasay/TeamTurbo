import React, { useState, useEffect } from 'react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, AttendanceSession } from '../../types';
import { 
  getTodayDateString, 
  formatDuration, 
  formatTime, 
  getDayOfWeek, 
  getDaySchedule,
  checkPunctuality,
  checkLiveArrivalStatus 
} from '../../lib/dateUtils';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  History, 
  Timer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

interface AttendanceWidgetProps {
  todayEntriesCount?: number;
  className?: string;
  compact?: boolean;
}

export const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({ 
  todayEntriesCount = 0,
  className = '',
  compact = false
}) => {
  const { currentUser, userProfile } = useAuth();
  const todayStr = getTodayDateString();
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0);
  const [showLogoffWarning, setShowLogoffWarning] = useState(false);
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTimeTick, setCurrentTimeTick] = useState<number>(Date.now());

  const attendanceDocId = `${currentUser?.uid}_${todayStr}`;

  // Periodically refresh current time every 10 seconds to update live overdue calculation if not clocked in
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeTick(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Listen to today's attendance record
  useEffect(() => {
    if (!currentUser?.uid) {
      setAttendance(null);
      setLoading(false);
      return;
    }
    const docRef = doc(db, 'attendance', attendanceDocId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AttendanceRecord;
          setAttendance(data);
        } else {
          setAttendance(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Attendance snapshot listener notice:', err.message || err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, attendanceDocId]);

  // Live timer for active session
  useEffect(() => {
    if (!attendance || attendance.status !== 'active' || !attendance.sessions || attendance.sessions.length === 0) {
      setCurrentSessionSeconds(0);
      return;
    }

    const lastSession = attendance.sessions[attendance.sessions.length - 1];
    if (!lastSession || lastSession.logoffAt) {
      setCurrentSessionSeconds(0);
      return;
    }

    const loginTime = new Date(lastSession.loginAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.max(0, Math.floor((now - loginTime) / 1000));
      setCurrentSessionSeconds(elapsedSec);
    }, 1000);

    return () => clearInterval(interval);
  }, [attendance]);

  const isSessionActive = attendance?.status === 'active';

  // Format live timer seconds into HH:MM:SS
  const formatSecondsToHMS = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const daySchedule = getDaySchedule(todayStr);
  const userShiftStart = userProfile?.shiftStart || '10:30';
  const firstLogin = attendance?.firstLoginAt || attendance?.sessions?.[0]?.loginAt;
  const punctualityInfo = checkLiveArrivalStatus(userShiftStart, firstLogin, daySchedule.isWorkingDay);

  const handleLoginClick = async () => {
    if (!currentUser) return;
    setActionLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const docRef = doc(db, 'attendance', attendanceDocId);
      const existingDoc = await getDoc(docRef);

      const punctuality = checkPunctuality(userShiftStart, nowIso);

      const newSession: AttendanceSession = {
        loginAt: nowIso,
      };

      if (!existingDoc.exists()) {
        const newRecord: AttendanceRecord = {
          id: attendanceDocId,
          userId: currentUser.uid,
          userName: userProfile?.name || 'Member',
          date: todayStr,
          sessions: [newSession],
          totalMinutes: 0,
          status: 'active',
          isLate: punctuality.isLate,
          lateMinutes: punctuality.minutesFromStart,
          latePastGraceMinutes: punctuality.minutesPastGrace,
          firstLoginAt: nowIso,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(docRef, newRecord);
      } else {
        const data = existingDoc.data() as AttendanceRecord;
        const updatedSessions = [...(data.sessions || []), newSession];
        const isFirstSession = !data.firstLoginAt && (!data.sessions || data.sessions.length === 0);

        const updatePayload: Partial<AttendanceRecord> = {
          sessions: updatedSessions,
          status: 'active',
          updatedAt: serverTimestamp(),
        };

        if (isFirstSession) {
          updatePayload.firstLoginAt = nowIso;
          updatePayload.isLate = punctuality.isLate;
          updatePayload.lateMinutes = punctuality.minutesFromStart;
          updatePayload.latePastGraceMinutes = punctuality.minutesPastGrace;
        }

        await updateDoc(docRef, updatePayload);
      }
    } catch (err) {
      console.error('Failed to log in session:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const initiateLogoff = () => {
    if (todayEntriesCount === 0) {
      setShowLogoffWarning(true);
    } else {
      executeLogoff();
    }
  };

  const executeLogoff = async () => {
    if (!currentUser || !attendance) return;
    setActionLoading(true);
    setShowLogoffWarning(false);

    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const docRef = doc(db, 'attendance', attendanceDocId);

      const sessions = [...(attendance.sessions || [])];
      if (sessions.length > 0) {
        const lastIdx = sessions.length - 1;
        const lastSession = { ...sessions[lastIdx] };
        lastSession.logoffAt = nowIso;
        
        const loginTime = new Date(lastSession.loginAt).getTime();
        const durationMinutes = Math.max(1, Math.round((now.getTime() - loginTime) / (1000 * 60)));
        lastSession.durationMinutes = durationMinutes;
        sessions[lastIdx] = lastSession;
      }

      // Calculate total minutes across all sessions
      const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

      await updateDoc(docRef, {
        sessions,
        totalMinutes,
        status: 'closed',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to logoff session:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Expected hours for today from weekday map
  const dayOfWeek = getDayOfWeek(todayStr);
  const expectedHours = userProfile?.expectedHoursMap?.[dayOfWeek] ?? 8;
  const sessionsCount = attendance?.sessions?.length || 0;

  return (
    <div className={`bg-[#161B27] border rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between transition-all ${
      punctualityInfo.isLate && (!attendance || attendance.isLate)
        ? 'border-rose-700/60 ring-1 ring-rose-500/20'
        : isSessionActive 
        ? 'border-indigo-500/40 ring-1 ring-indigo-500/40' 
        : 'border-slate-800'
    } ${className}`}>
      
      {/* Decorative accent glow */}
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl opacity-15 pointer-events-none ${
        punctualityInfo.isLate ? 'bg-rose-500' : isSessionActive ? 'bg-indigo-500' : 'bg-emerald-500'
      }`} />

      {/* Top Bar: Title & Live Status Pill */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              punctualityInfo.isLate
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : isSessionActive 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                : 'bg-[#1F2636] text-slate-300 border border-slate-700/60'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Shift Clock
              </h3>
              <p className="text-[10px] text-slate-500 font-medium leading-none">
                PKT Working Hours
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Punctuality Status Badge */}
            {punctualityInfo.isLate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                {attendance?.firstLoginAt ? 'LATE ARRIVAL' : 'OVERDUE LATE'}
              </span>
            )}
            {!punctualityInfo.isLate && punctualityInfo.hasClockedIn && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ON TIME
              </span>
            )}

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isSessionActive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : attendance
                ? 'bg-slate-800 text-slate-400 border border-slate-700/80'
                : 'bg-[#1F2636] text-slate-400 border border-slate-700/60'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSessionActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              {isSessionActive ? 'Active' : attendance ? 'Clocked Out' : 'Idle'}
            </span>
          </div>
        </div>

        {/* Center Display: Digital Clock Display */}
        <div className={`rounded-2xl p-4 my-2 text-center transition-all ${
          punctualityInfo.isLate && !attendance
            ? 'bg-rose-950/20 border border-rose-600/30'
            : isSessionActive 
            ? 'bg-indigo-600/10 border border-indigo-500/30' 
            : 'bg-[#1F2636] border border-slate-700/60'
        }`}>
          {isSessionActive ? (
            <div>
              <div className="text-3xl font-black text-white font-mono tracking-tight text-center">
                {formatSecondsToHMS(currentSessionSeconds)}
              </div>
              <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mt-1">
                Live Active Session
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-black text-white tracking-tight text-center">
                {formatDuration(attendance?.totalMinutes || 0)}
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                Total Logged Today
              </p>
            </div>
          )}

          {/* Shift Schedule & Relaxation Cutoff Subtext */}
          <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
            <span>Shift: <strong className="text-slate-200">{userShiftStart} – {userProfile?.shiftEnd || '18:30'}</strong></span>
            <span>Relaxation Cutoff: <strong className="text-amber-400">{punctualityInfo.relaxationLimitTime}</strong></span>
          </div>
        </div>

        {/* Punctuality Alert Banner */}
        {punctualityInfo.isLate && (
          <div className="mb-2 p-3 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-start gap-2.5 text-xs text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-300">
                {attendance?.firstLoginAt ? 'Late Clock-in Recorded:' : 'Late Arrival Notice:'}
              </span>
              <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
                {attendance?.firstLoginAt ? (
                  <>
                    Clocked in at <strong>{punctualityInfo.clockInTimeFormatted}</strong> ({punctualityInfo.minutesFromStart}m from start, {punctualityInfo.minutesPastGrace}m past 30m relaxation period). You have been marked <strong>LATE</strong> for today.
                  </>
                ) : (
                  <>
                    Shift started at <strong>{punctualityInfo.shiftStartTimeFormatted}</strong>. The 30m relaxation grace expired at <strong>{punctualityInfo.relaxationLimitTime}</strong>. You are currently <strong>{punctualityInfo.minutesFromStart}m late</strong> ({punctualityInfo.minutesPastGrace}m overdue) and will be marked <strong>LATE</strong> upon clocking in.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {!punctualityInfo.isLate && punctualityInfo.hasClockedIn && (
          <div className="mb-2 px-3 py-2 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px]">
              Clocked in at <strong>{punctualityInfo.clockInTimeFormatted}</strong> — On Time (Within 30m relaxation grace).
            </span>
          </div>
        )}
      </div>

      {/* Bottom Section: Primary Action Button & Sessions Toggle */}
      <div className="mt-3 space-y-2">
        {isSessionActive ? (
          <button
            id="attendance-logoff-btn"
            onClick={initiateLogoff}
            disabled={actionLoading}
            className="w-full bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-rose-600/20 transition-all text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {actionLoading ? 'Saving...' : 'Clock Out (Logoff)'}
          </button>
        ) : (
          <button
            id="attendance-login-btn"
            onClick={handleLoginClick}
            disabled={actionLoading}
            className={`w-full font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 active:scale-[0.98] ${
              punctualityInfo.isLate && !attendance
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
          >
            <LogIn className="w-4 h-4" />
            {actionLoading
              ? 'Starting...'
              : punctualityInfo.isLate && !attendance
              ? `Clock In (Mark Late • +${punctualityInfo.minutesFromStart}m)`
              : 'Clock In (Start Shift)'}
          </button>
        )}

        {/* Sessions Counter & History Dropdown Toggle */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>{todayEntriesCount} {todayEntriesCount === 1 ? 'task' : 'tasks'} today</span>
          
          {sessionsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowSessionsDrawer(!showSessionsDrawer)}
              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              <History className="w-3 h-3" />
              <span>Sessions ({sessionsCount})</span>
              {showSessionsDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Expandable Sessions List */}
        {showSessionsDrawer && attendance?.sessions && attendance.sessions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700/60 max-h-32 overflow-y-auto space-y-1.5 scrollbar-thin">
            {attendance.sessions.map((s, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between text-[10px] bg-[#1F2636] px-2.5 py-1.5 rounded-lg border border-slate-700/60 text-slate-300"
              >
                <span className="font-semibold text-slate-400">#{idx + 1}</span>
                <span>{formatTime(s.loginAt)} → {s.logoffAt ? formatTime(s.logoffAt) : <strong className="text-emerald-400">Now</strong>}</span>
                <span className="text-indigo-400 font-medium">
                  {s.durationMinutes ? formatDuration(s.durationMinutes) : 'Active'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logoff Warning Modal when 0 entries added */}
      {showLogoffWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No Work Logged Today</h3>
                <p className="text-[11px] text-slate-400">You haven't logged any entries yet.</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Logging your daily accomplishments ensures your team lead can review your work.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoffWarning(false)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Log Work First
              </button>
              <button
                type="button"
                onClick={executeLogoff}
                className="px-3.5 py-2 bg-[#1F2636] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700/60"
              >
                Clock Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

