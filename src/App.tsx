import React, { useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTrackerData } from './hooks/useTrackerData';
import { getTodayDateString } from './lib/dateUtils';
import { LoginView } from './components/auth/LoginView';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { Header } from './components/common/Header';
import { Navigation, MemberNavTab, AdminNavTab } from './components/common/Navigation';
import { NotificationToasts } from './components/common/NotificationToasts';
import { useChromeNotifications } from './hooks/useChromeNotifications';

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
import { AdminHandovers } from './components/admin/AdminHandovers';
import { AdminTeamOverview } from './components/admin/AdminTeamOverview';
import { AdminMonthlyAnalytics } from './components/admin/AdminMonthlyAnalytics';

// Shared Settings
import { SettingsView } from './components/settings/SettingsView';

import { Clock, ShieldCheck, Loader2, ListTodo } from 'lucide-react';
import { TaskPriority } from './types';

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
    chatMessages,
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
    updateHandoverStatus,
    deleteHandover,
    deleteAttendanceRecord,
    addCompany,
    toggleArchiveCompany,
    deleteCompany,
    updateUserByAdmin,
    deleteUserByAdmin,
    sendChatMessage,
    deleteChatMessage,
  } = useTrackerData(currentUser, userProfile);

  // Tab State
  const [memberTab, setMemberTab] = useState<MemberNavTab>('daily');
  const [adminTab, setAdminTab] = useState<AdminNavTab>('live');

  // Real-Time Chrome Desktop Notifications Hook
  const {
    permission: notifPermission,
    toasts,
    promptEnableNotifications,
    sendTestNotification,
    dismissToast,
  } = useChromeNotifications({
    userProfile,
    tasks,
    handovers,
    entries,
    chatMessages,
  });

  // Pre-filled work task state if member clicks "Log in Daily Work" from tasks widget
  const [prefilledTaskText, setPrefilledTaskText] = useState<string>('');

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

      {/* Floating In-App Real-Time Notification Toasts */}
      <NotificationToasts toasts={toasts} onDismiss={dismissToast} />

      {/* Primary Sticky Header */}
      <Header
        todayAttendance={todayAttendance}
        unreadCount={reworkEntries.length + unackHandoversCount}
        notificationPermission={notifPermission}
        onPromptNotifications={promptEnableNotifications}
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
          adminHandoversCount: unackHandoversCount,
        }}
      />

      {/* Main Workspace Body with Small Left and Right Margins */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-2.5 sm:px-4 lg:px-6 py-6">
        
        {/* ========================================================================= */}
        {/* MEMBER VIEWS */}
        {/* ========================================================================= */}
        {!isAdmin && (
          <div className="space-y-6">
            {memberTab === 'daily' && (
              <>
                {/* Needs Rework Action Alert */}
                <NeedsReworkAlert
                  reworkEntries={reworkEntries}
                  chatMessages={chatMessages}
                  currentUserId={userProfile.uid}
                  currentUserName={userProfile.name}
                  onSendMessage={sendChatMessage}
                  onDeleteChatMessage={deleteChatMessage}
                  onAddFollowUpNote={(entryId, note) => {
                    return updateWorkEntry(entryId, { followUpNote: note });
                  }}
                />

                {/* Top Row: Square Clock Widget & Daily Shift Summary */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  <div className="md:col-span-5 lg:col-span-4 flex flex-col">
                    <AttendanceWidget
                      todayEntriesCount={myEntries.filter((e) => e.date === todayStr).length}
                      className="h-full"
                    />
                  </div>

                  <div className="md:col-span-7 lg:col-span-8 bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Daily Shift Overview
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {todayStr}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Hello, {userProfile.name.split(' ')[0]} 👋
                      </h2>
                      <p className="text-xs text-slate-400">
                        Track your tasks as you work through your shift. Remember to clock in when starting and log all finished assignments.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80 relative z-10">
                      <div className="bg-[#1F2636] p-3 rounded-2xl border border-slate-700/60 text-center">
                        <span className="text-xl font-black text-white">
                          {myEntries.filter((e) => e.date === todayStr).length}
                        </span>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Logged</p>
                      </div>
                      <div className="bg-[#1F2636] p-3 rounded-2xl border border-slate-700/60 text-center">
                        <span className="text-xl font-black text-emerald-400">
                          {myEntries.filter((e) => e.date === todayStr && e.status === 'completed').length}
                        </span>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Completed</p>
                      </div>
                      <div className="bg-[#1F2636] p-3 rounded-2xl border border-slate-700/60 text-center">
                        <span className="text-xl font-black text-amber-400">
                          {myTasks.filter((t) => t.status !== 'done').length}
                        </span>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Assigned</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Section in Front of Member's Dashboard */}
                <AssignedTasksList
                  tasks={myTasks}
                  chatMessages={chatMessages}
                  currentUserId={userProfile.uid}
                  currentUserName={userProfile.name}
                  currentUserRole={userProfile.role}
                  onSendMessage={sendChatMessage}
                  onDeleteChatMessage={deleteChatMessage}
                  onUpdateStatus={updateTaskStatus}
                  onPrefillLog={(title) => {
                    setPrefilledTaskText(title);
                    // Scroll smoothly to the work entry form
                    const formEl = document.getElementById('work-entry-form-root');
                    if (formEl) {
                      formEl.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  isDashboardWidget={true}
                  titleOverride="My Assigned Tasks & Action Items"
                />

                {/* Today's Work Log Input & List */}
                <div id="work-entry-form-root">
                  <TodayWorkSection
                    entries={myEntries}
                    companies={companies}
                    chatMessages={chatMessages}
                    onSendMessage={sendChatMessage}
                    onDeleteChatMessage={deleteChatMessage}
                    currentUserId={userProfile.uid}
                    currentUserName={userProfile.name}
                    initialTaskText={prefilledTaskText}
                    onClearPrefill={() => setPrefilledTaskText('')}
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
                </div>
              </>
            )}

            {memberTab === 'assigned' && (
              <AssignedTasksList
                tasks={myTasks}
                chatMessages={chatMessages}
                currentUserId={userProfile.uid}
                currentUserName={userProfile.name}
                currentUserRole={userProfile.role}
                onSendMessage={sendChatMessage}
                onDeleteChatMessage={deleteChatMessage}
                onUpdateStatus={updateTaskStatus}
                onPrefillLog={(title) => {
                  setPrefilledTaskText(title);
                  setMemberTab('daily');
                }}
              />
            )}

            {memberTab === 'handovers' && (
              <HandoversPanel
                handovers={handovers}
                teamMembers={teamMembers}
                companies={companies}
                currentUserId={userProfile.uid}
                currentUserName={userProfile.name}
                onSendHandover={createHandover}
                onCreateHandover={createHandover}
                onUpdateStatus={acknowledgeHandover}
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
                onDeleteCompany={deleteCompany}
                onUpdateUserByAdmin={updateUserByAdmin}
                onDeleteUserByAdmin={deleteUserByAdmin}
                notificationPermission={notifPermission}
                onPromptNotifications={promptEnableNotifications}
                onSendTestNotification={sendTestNotification}
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
                chatMessages={chatMessages}
                onSendMessage={sendChatMessage}
                onDeleteChatMessage={deleteChatMessage}
                onUpdateReview={updateEntryReview}
                onDeleteEntry={deleteWorkEntry}
                adminId={userProfile.uid}
                adminName={userProfile.name}
              />
            )}

            {adminTab === 'review' && (
              <AdminDailyReview
                entries={entries}
                teamMembers={teamMembers}
                chatMessages={chatMessages}
                onSendMessage={sendChatMessage}
                onDeleteChatMessage={deleteChatMessage}
                onUpdateReview={updateEntryReview}
                onDeleteEntry={deleteWorkEntry}
                adminId={userProfile.uid}
                adminName={userProfile.name}
              />
            )}

            {adminTab === 'queue' && (
              <AdminUnreviewedQueue
                entries={entries}
                chatMessages={chatMessages}
                onSendMessage={sendChatMessage}
                onDeleteChatMessage={deleteChatMessage}
                onUpdateReview={updateEntryReview}
                onDeleteEntry={deleteWorkEntry}
                adminId={userProfile.uid}
                adminName={userProfile.name}
              />
            )}

            {adminTab === 'attendance' && (
              <AdminAttendanceTab
                attendanceRecords={attendanceRecords}
                teamMembers={teamMembers}
                onUpdateUser={updateUserByAdmin}
                onDeleteAttendance={deleteAttendanceRecord}
              />
            )}

            {adminTab === 'tasks' && (
              <AdminTaskAssignment
                tasks={tasks}
                teamMembers={teamMembers}
                companies={companies}
                chatMessages={chatMessages}
                onSendMessage={sendChatMessage}
                onDeleteChatMessage={deleteChatMessage}
                adminId={userProfile.uid}
                adminName={userProfile.name}
                onAssignTask={assignTask}
                onUpdateStatus={updateTaskStatus}
                onDeleteTask={deleteTask}
              />
            )}

            {adminTab === 'handovers' && (
              <AdminHandovers
                handovers={handovers}
                teamMembers={teamMembers}
                companies={companies}
                currentUserId={userProfile.uid}
                currentUserName={userProfile.name}
                onSendHandover={createHandover}
                onUpdateStatus={updateHandoverStatus}
                onDeleteHandover={deleteHandover}
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
                onAddCompany={addCompany}
                onToggleArchiveCompany={toggleArchiveCompany}
                onDeleteCompany={deleteCompany}
                onUpdateUserByAdmin={updateUserByAdmin}
                onDeleteUserByAdmin={deleteUserByAdmin}
                onDeleteWorkEntry={deleteWorkEntry}
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
                onDeleteCompany={deleteCompany}
                onUpdateUserByAdmin={updateUserByAdmin}
                onDeleteUserByAdmin={deleteUserByAdmin}
                notificationPermission={notifPermission}
                onPromptNotifications={promptEnableNotifications}
                onSendTestNotification={sendTestNotification}
              />
            )}
          </div>
        )}

      </main>

      {/* Workspace Footer with Small Side Margins */}
      <footer className="border-t border-slate-800 bg-[#0B0F1A] py-6 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
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
