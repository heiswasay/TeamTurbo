import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, WorkEntry, AssignedTask, Handover } from '../../types';
import { formatDuration, getTodayDateString } from '../../lib/dateUtils';
import faviconIcon from '../../images/favicon.png';
import { 
  Clock, 
  Moon, 
  Sun, 
  Bell, 
  User, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  ArrowRightLeft,
  CheckCheck,
  AlertCircle
} from 'lucide-react';

interface HeaderProps {
  todayAttendance: AttendanceRecord | null;
  unreadCount: number;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  todayAttendance,
  unreadCount,
  onOpenSettings,
}) => {
  const { userProfile, signOut, theme, setTheme } = useAuth();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const isClockActive = todayAttendance?.status === 'active';

  return (
    <header className="bg-[#0B0F1A]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 h-20 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity with TT Bento Icon */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 shrink-0 tracking-tight overflow-hidden p-1 border border-indigo-400/20">
            <img 
              src={faviconIcon} 
              alt="Logo" 
              className="w-full h-full object-contain" 
              onError={(e) => {
                // If favicon image is empty or fails, display 'TT' fallback
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.fallback-text')) {
                  const span = document.createElement('span');
                  span.className = 'fallback-text text-sm font-bold text-white';
                  span.innerText = 'TT';
                  parent.appendChild(span);
                }
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                Team Daily Tracker
              </h1>
              {userProfile?.role === 'admin' ? (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Lead Admin
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Member
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-tight mt-1 hidden sm:block">
              Welcome back, {userProfile?.name} {userProfile?.designation ? `(${userProfile.designation})` : ''}
            </p>
          </div>
        </div>

        {/* Right: Live Feed Active, Notifications, Profile Pill */}
        <div className="flex items-center gap-4">
          
          {/* Live Feed Status Pill */}
          <div className="hidden sm:flex h-10 px-4 bg-[#161B27] rounded-xl items-center gap-3 border border-slate-800 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-medium text-slate-300">Live Feed Active</span>
          </div>

          {/* Quick Shift Status Pill */}
          <div className={`hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${
            isClockActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : todayAttendance
              ? 'bg-[#161B27] text-slate-300 border-slate-800'
              : 'bg-[#161B27]/50 text-slate-500 border-slate-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isClockActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>
              {isClockActive
                ? `Clock Active (${formatDuration(todayAttendance.totalMinutes)})`
                : todayAttendance
                ? `Clocked Out (${formatDuration(todayAttendance.totalMinutes)})`
                : 'Not Clocked In'}
            </span>
          </div>

          {/* Unread notification icon with badge */}
          {unreadCount > 0 && (
            <div className="relative">
              <div className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-red-500 rounded-full border-2 border-[#0B0F1A] text-[9px] flex items-center justify-center text-white font-bold animate-pulse">
                {unreadCount}
              </div>
              <div className="p-2.5 rounded-xl bg-[#161B27] border border-slate-800 text-slate-400">
                <Bell className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* User Profile Pill */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#161B27] hover:bg-[#1F2636] border border-slate-800 transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs overflow-hidden shrink-0">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userProfile?.name || 'Member')}`} 
                alt={userProfile?.name || 'Avatar'} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white group-hover:text-indigo-400 leading-none truncate max-w-[120px]">
                {userProfile?.name}
              </p>
              <p className="text-[10px] text-slate-400 leading-none mt-1 truncate max-w-[120px]">
                {userProfile?.designation || 'Team Turbo'}
              </p>
            </div>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-2.5 rounded-xl bg-[#161B27] hover:bg-[#1F2636] text-slate-400 hover:text-indigo-400 border border-slate-800 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => setShowSignOutModal(true)}
            title="Sign Out"
            className="p-2.5 rounded-xl bg-[#161B27] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Sign Out Confirm Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sign Out of Workspace?</h3>
              <p className="text-xs text-slate-400 mt-1">Make sure you've saved any active entries and clocked out.</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className="px-4 py-2.5 bg-[#1F2636] hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSignOutModal(false);
                  await signOut();
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-600/20"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
