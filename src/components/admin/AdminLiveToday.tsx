import React, { useState } from 'react';
import { WorkEntry, UserProfile, TaskStatus, ReviewStatus } from '../../types';
import { formatDateLabel, getTodayDateString } from '../../lib/dateUtils';
import { AttendanceWidget } from '../member/AttendanceWidget';
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
  Send
} from 'lucide-react';

interface AdminLiveTodayProps {
  entries: WorkEntry[];
  teamMembers: UserProfile[];
  onUpdateReview: (entryId: string, review: ReviewStatus, remarks?: string) => Promise<void>;
  adminName: string;
}

export const AdminLiveToday: React.FC<AdminLiveTodayProps> = ({
  entries = [],
  teamMembers = [],
  onUpdateReview,
  adminName,
}) => {
  const todayStr = getTodayDateString();
  const todayEntries = (entries || []).filter((e) => e.date === todayStr);

  // Group entries by member
  const membersMap = new Map((teamMembers || []).map((m) => [m.uid, m]));
  const entriesByMember: { [userId: string]: WorkEntry[] } = {};

  for (const member of (teamMembers || [])) {
    if (member.active !== false) {
      entriesByMember[member.uid] = [];
    }
  }

  for (const entry of todayEntries) {
    if (!entriesByMember[entry.userId]) {
      entriesByMember[entry.userId] = [];
    }
    entriesByMember[entry.userId].push(entry);
  }

  const activeMembersCount = Object.keys(entriesByMember).filter(
    (uid) => (entriesByMember[uid]?.length || 0) > 0
  ).length;

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
                Live real-time feed as team members log daily accomplishments and update shift statuses
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
                  {activeMembersCount}/{teamMembers.filter(m => m.active !== false).length}
                </span>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Members</p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-slate-400">Supervising Lead: <strong className="text-indigo-400">{adminName}</strong></p>
              <p className="text-[10px] text-slate-500">Auto-synced via Firebase Cloud Firestore</p>
            </div>
          </div>
        </div>

      </div>

      {/* Grid of Team Members with Today's Entries */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {teamMembers
          .filter((m) => m.active !== false)
          .map((member) => {
            const memberEntries = entriesByMember[member.uid] || [];

            return (
              <div
                key={member.uid}
                className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between"
              >
                {/* Member Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center text-sm border border-indigo-400/20">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {member.name}
                        </h3>
                        {member.role === 'admin' && (
                          <span className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-bold uppercase">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {member.designation} • Shift: {member.shiftStart} – {member.shiftEnd}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    memberEntries.length > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-[#1F2636] text-slate-400 border-slate-700/60'
                  }`}>
                    {memberEntries.length} {memberEntries.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                {/* Member's Today Entries */}
                <div className="space-y-3 flex-1">
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
                        onUpdateReview={onUpdateReview}
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
  );
};

// Inline review & remarks card
interface AdminEntryReviewCardProps {
  entry: WorkEntry;
  onUpdateReview: (entryId: string, review: ReviewStatus, remarks?: string) => Promise<void>;
  adminName: string;
}

export const AdminEntryReviewCard: React.FC<AdminEntryReviewCardProps> = ({
  entry,
  onUpdateReview,
  adminName,
}) => {
  const [review, setReview] = useState<ReviewStatus>(entry.review);
  const [remarks, setRemarks] = useState(entry.remarks || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
    <div className="bg-[#1F2636] border border-slate-700/80 rounded-2xl p-4 space-y-3 transition-all hover:border-slate-600">
      
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

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-[11px] text-slate-400 animate-pulse font-medium">Saving...</span>}
          {savedSuccess && <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Saved</span>}
        </div>
      </div>

      {/* Task text */}
      <p className="text-xs text-slate-200 leading-relaxed bg-[#161B27] p-3.5 rounded-xl border border-slate-750">
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
          <div className="inline-flex rounded-xl p-1 bg-[#161B27] border border-slate-750 gap-1">
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
            placeholder="Add lead remarks or feedback (auto-saves on blur)..."
            className="w-full bg-[#161B27] border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all pl-8.5 font-medium"
          />
          <MessageSquare className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        </div>
      </div>

    </div>
  );
};
