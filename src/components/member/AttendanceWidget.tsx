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
import { AttendanceRecord, AttendanceSession, WorkEntry } from '../../types';
import { getTodayDateString, formatDuration, formatTime, getDayOfWeek } from '../../lib/dateUtils';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  Timer,
  CalendarDays
} from 'lucide-react';

interface AttendanceWidgetProps {
  todayEntriesCount: number;
}

export const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({ todayEntriesCount }) => {
  const { currentUser, userProfile } = useAuth();
  const todayStr = getTodayDateString();
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0);
  const [showLogoffWarning, setShowLogoffWarning] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const attendanceDocId = `${currentUser?.uid}_${todayStr}`;

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

  const handleLoginClick = async () => {
    if (!currentUser) return;
    setActionLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const docRef = doc(db, 'attendance', attendanceDocId);
      const existingDoc = await getDoc(docRef);

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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(docRef, newRecord);
      } else {
        const data = existingDoc.data() as AttendanceRecord;
        const updatedSessions = [...(data.sessions || []), newSession];
        await updateDoc(docRef, {
          sessions: updatedSessions,
          status: 'active',
          updatedAt: serverTimestamp(),
        });
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

  return (
    <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative accent background */}
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none ${isSessionActive ? 'bg-indigo-500' : 'bg-emerald-500'}`} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left Side: Bento Session Card */}
        <div className={`md:col-span-8 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all ${
          isSessionActive 
            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
            : 'bg-[#1F2636] border border-slate-700/80 text-slate-200'
        }`}>
          {isSessionActive && (
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          )}

          <div className="z-10">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isSessionActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                Current Session
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                isSessionActive
                  ? 'bg-white/20 text-white backdrop-blur-sm'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSessionActive ? 'bg-emerald-300 animate-pulse' : 'bg-slate-500'}`} />
                {isSessionActive ? 'Active Live Clock' : 'Idle / Logged Off'}
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              {isSessionActive ? (
                <>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                    {formatSecondsToHMS(currentSessionSeconds)}
                  </h2>
                  <span className="text-xs text-indigo-200 font-medium">PKT Active</span>
                </>
              ) : (
                <>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {formatDuration(attendance?.totalMinutes || 0)}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">Logged Today</span>
                </>
              )}
            </div>

            <p className={`text-xs mt-1 ${isSessionActive ? 'text-indigo-100' : 'text-slate-400'}`}>
              Assigned Shift: <span className="font-semibold text-white">{userProfile?.shiftStart || '10:30'} – {userProfile?.shiftEnd || '18:30'} PKT</span> ({expectedHours}h target)
            </p>
          </div>
        </div>

        {/* Right Side: Quick Clock In / Clock Out Action Button */}
        <div className="md:col-span-4 flex flex-col justify-center gap-3">
          {isSessionActive ? (
            <button
              id="attendance-logoff-btn"
              onClick={initiateLogoff}
              disabled={actionLoading}
              className="w-full bg-white text-indigo-700 hover:bg-slate-100 active:scale-[0.98] font-bold py-4 px-6 rounded-2xl shadow-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {actionLoading ? 'Saving...' : 'Clock Out (Logoff)'}
            </button>
          ) : (
            <button
              id="attendance-login-btn"
              onClick={handleLoginClick}
              disabled={actionLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all text-sm flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {actionLoading ? 'Starting...' : 'Clock In (Start Shift)'}
            </button>
          )}

          <div className="text-center">
            <span className="text-[11px] text-slate-400">
              {todayEntriesCount} {todayEntriesCount === 1 ? 'task entry' : 'task entries'} logged today
            </span>
          </div>
        </div>

      </div>

      {/* Session History Mini-Timeline if sessions exist */}
      {attendance && attendance.sessions && attendance.sessions.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mr-1 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            Today's Sessions ({attendance.sessions.length}):
          </span>
          {attendance.sessions.map((s, index) => (
            <div 
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F2636] border border-slate-700/60 text-xs"
            >
              <span className="text-slate-500 font-semibold">#{index + 1}</span>
              <span className="text-slate-200">{formatTime(s.loginAt)}</span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-200">
                {s.logoffAt ? formatTime(s.logoffAt) : <span className="text-emerald-400 font-bold">Active</span>}
              </span>
              {s.durationMinutes ? (
                <span className="text-indigo-400 font-semibold pl-1">({formatDuration(s.durationMinutes)})</span>
              ) : null}
            </div>
          ))}
          <span className="ml-auto font-medium text-slate-300 text-xs">
            Total Time: <strong className="text-indigo-400 font-bold">{formatDuration(attendance.totalMinutes + (isSessionActive ? Math.floor(currentSessionSeconds / 60) : 0))}</strong>
          </span>
        </div>
      )}

      {/* Logoff Warning Modal when 0 entries added */}
      {showLogoffWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Work Logged Today</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              You haven't logged any work entries for today yet. Logging your daily accomplishments ensures your team lead can review and acknowledge your work.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoffWarning(false)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Log Work First
              </button>
              <button
                type="button"
                onClick={executeLogoff}
                className="px-4 py-2.5 bg-[#1F2636] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-700/60"
              >
                Clock Out Anyway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
