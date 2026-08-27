import React, { useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTrackerData } from './hooks/useTrackerData';
import { getTodayDateString } from './lib/dateUtils';
import { LoginView } from './components/auth/LoginView';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { Header } from './components/common/Header';
import { Navigation, MemberNavTab, AdminNavTab } from './components/common/Navigation';

// Member Components
import { AttendanceWidget } from './components/member/AttendanceWidget';
import { TodayWorkSection } from './components/member/TodayWorkSection';
import { NeedsReworkAlert } from './components/member/NeedsReworkAlert';
import { AssignedTasksList } from './components/member/AssignedTasksList';
import { HandoversPanel } from './components/member/HandoversPanel';
import { MemberHistory } from './components/member/MemberHistory';

// Admin Components
import { AdminLiveToday } from './components/admin/AdminLiveToday';
import { AdminDailyReview } from './components/admin/AdminDailyReview';
import { AdminUnreviewedQueue } from './components/admin/AdminUnreviewedQueue';
import { AdminAttendanceTab } from './components/admin/AdminAttendanceTab';
import { AdminTaskAssignment } from './components/admin/AdminTaskAssignment';
import { AdminTeamOverview } from './components/admin/AdminTeamOverview';
import { AdminMonthlyAnalytics } from './components/admin/AdminMonthlyAnalytics';

// Shared Settings
import { SettingsView } from './components/settings/SettingsView';

import { Clock, ShieldCheck, Loader2 } from 'lucide-react';

function DashboardShell() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const todayStr = getTodayDateString();

  const {
    loading: dataLoading,
    entries,
    attendanceRecords,
    tasks,
    handovers,
    companies,
    teamMembers,
    addWorkEntry,
    updateWorkEntry,
    deleteWorkEntry,
    updateEntryReview,
    startClock,
    stopClock,
    assignTask,
    updateTaskStatus,
    deleteTask,
    createHandover,
    acknowledgeHandover,
    addCompany,
    toggleArchiveCompany,
    updateUserByAdmin,
  } = useTrackerData(currentUser, userProfile);

  // Tab State
  const [memberTab, setMemberTab] = useState<MemberNavTab>('daily');
  const [adminTab, setAdminTab] = useState<AdminNavTab>('live');

  // Today Attendance for logged in user
  const todayAttendance = useMemo(() => {
    if (!userProfile) return null;
    return attendanceRecords.find(
      (r) => r.userId === userProfile.uid && r.date === todayStr
    ) || null;
  }, [attendanceRecords, userProfile, todayStr]);

  // Member-specific computations
  const myEntries = useMemo(() => {
    if (!userProfile) return [];
    return (entries || []).filter((e) => e.userId === userProfile.uid);
  }, [entries, userProfile]);

  const reworkEntries = useMemo(() => {
    return (myEntries || []).filter((e) => e.review === 'needs_rework');
  }, [myEntries]);

  const myTasks = useMemo(() => {
    if (!userProfile) return [];
    return (tasks || []).filter((t) => t.assignedTo === userProfile.uid);
  }, [tasks, userProfile]);

  const unackHandoversCount = useMemo(() => {
    if (!userProfile) return 0;
    return (handovers || []).filter((h) => h.toUserId === userProfile.uid && h.status === 'pending').length;
  }, [handovers, userProfile]);

  const pendingQueueCount = useMemo(() => {
    return (entries || []).filter((e) => e.review === 'pending').length;
  }, [entries]);

  if (authLoading || (currentUser && dataLoading && !userProfile)) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 font-bold text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center mb-4 border border-indigo-400/20">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
        <p className="text-xs font-bold text-slate-300 tracking-wider uppercase">Loading Workspace...</p>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <LoginView />;
  }

  const isAdmin = userProfile.role === 'admin';

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Force Password Change on initial temporary credentials */}
      <ForcePasswordChangeModal />

      {/* Primary Sticky Header */}
      <Header
        todayAttendance={todayAttendance}
        unreadCount={reworkEntries.length + unackHandoversCount}
        onOpenSettings={() => {
          if (isAdmin) {
            setAdminTab('settings');
          } else {
            setMemberTab('settings');
          }
        }}
      />

      {/* Secondary Role Navigation Tabs */}
      <Navigation
        role={userProfile.role}
        currentTab={isAdmin ? adminTab : memberTab}
        onSelectTab={(tab) => {
          if (isAdmin) {
            setAdminTab(tab as AdminNavTab);
          } else {
            setMemberTab(tab as MemberNavTab);
          }
        }}
        badges={{
          reworkCount: reworkEntries.length,
          assignedTasksCount: myTasks.filter((t) => t.status !== 'done').length,
          unackHandoversCount,
          pendingQueueCount,
        }}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ========================================================================= */}
        {/* MEMBER VIEWS */}
        {/* ========================================================================= */}
        {!isAdmin && (
          <div className="space-y-6">
            {memberTab === 'daily' && (
              <>
                {/* Needs Rework Action Alert */}
                <NeedsReworkAlert
                  entries={reworkEntries}
                  onUpdateEntry={updateWorkEntry}
                />

                {/* Shift Clock & Attendance */}
                <AttendanceWidget
                  record={todayAttendance}
                  userProfile={userProfile}
                  onStartClock={startClock}
                  onStopClock={stopClock}
                />

                {/* Today's Work Log Input & List */}
                <TodayWorkSection
                  entries={myEntries}
                  companies={companies}
                  onAddEntry={(entry) =>
                    addWorkEntry({
                      ...entry,
                      userId: userProfile.uid,
                      userName: userProfile.name,
                    })
                  }
                  onUpdateEntry={updateWorkEntry}
                  onDeleteEntry={deleteWorkEntry}
                />
              </>
            )}

            {memberTab === 'assigned' && (
              <AssignedTasksList
                tasks={myTasks}
                onUpdateStatus={updateTaskStatus}
              />
            )}

            {memberTab === 'handovers' && (
              <HandoversPanel
                handovers={handovers}
                teamMembers={teamMembers}
                currentUserId={userProfile.uid}
                currentUserName={userProfile.name}
                onCreateHandover={createHandover}
                onAcknowledge={acknowledgeHandover}
              />
            )}

            {memberTab === 'history' && (
              <MemberHistory
                entries={myEntries}
                companies={companies}
              />
            )}

            {memberTab === 'settings' && (
              <SettingsView
                teamMembers={teamMembers}
                companies={companies}
                onAddCompany={addCompany}
                onToggleArchiveCompany={toggleArchiveCompany}
                onUpdateUserByAdmin={updateUserByAdmin}
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADMIN / TEAM LEAD VIEWS */}
        {/* ========================================================================= */}
        {isAdmin && (
          <div className="space-y-6">
            {adminTab === 'live' && (
              <AdminLiveToday
                entries={entries}
                attendanceRecords={attendanceRecords}
                teamMembers={teamMembers}
                onUpdateReview={updateEntryReview}
                adminName={userProfile.name}
              />
            )}

            {adminTab === 'review' && (
              <AdminDailyReview
                entries={entries}
                teamMembers={teamMembers}
                onUpdateReview={updateEntryReview}
                adminName={userProfile.name}
              />
            )}

            {adminTab === 'queue' && (
              <AdminUnreviewedQueue
                entries={entries}
                onUpdateReview={updateEntryReview}
                adminName={userProfile.name}
              />
            )}

            {adminTab === 'attendance' && (
              <AdminAttendanceTab
                attendanceRecords={attendanceRecords}
                teamMembers={teamMembers}
              />
            )}

            {adminTab === 'tasks' && (
              <AdminTaskAssignment
                tasks={tasks}
                teamMembers={teamMembers}
                adminId={userProfile.uid}
                adminName={userProfile.name}
                onAssignTask={assignTask}
                onUpdateStatus={updateTaskStatus}
                onDeleteTask={deleteTask}
              />
            )}

            {adminTab === 'team' && (
              <AdminTeamOverview
                teamMembers={teamMembers}
                entries={entries}
                tasks={tasks}
                handovers={handovers}
                attendanceRecords={attendanceRecords}
                companies={companies}
              />
            )}

            {adminTab === 'analytics' && (
              <AdminMonthlyAnalytics
                entries={entries}
                teamMembers={teamMembers}
                companies={companies}
              />
            )}

            {adminTab === 'settings' && (
              <SettingsView
                teamMembers={teamMembers}
                companies={companies}
                onAddCompany={addCompany}
                onToggleArchiveCompany={toggleArchiveCompany}
                onUpdateUserByAdmin={updateUserByAdmin}
              />
            )}
          </div>
        )}

      </main>

      {/* Workspace Footer */}
      <footer className="border-t border-slate-800 bg-[#0B0F1A] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-400">Team Daily Work Tracking & Attendance System • Enterprise Edition</span>
          <span className="font-mono text-[11px] text-slate-500">PKT (UTC+5) Shift Schedule</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardShell />
    </AuthProvider>
  );
}
