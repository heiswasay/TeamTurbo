import React, { useState, useMemo } from 'react';
import { WorkEntry, UserProfile, AssignedTask, Handover, AttendanceRecord, CompanyTag, UserRole } from '../../types';
import { getTodayDateString, formatDateLabel, getPastDates, getDayOfWeek, formatDuration } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft, 
  CheckCheck, 
  Search, 
  Eye, 
  X, 
  History, 
  ShieldCheck, 
  Calendar,
  Plus,
  Building2,
  Edit3,
  UserX,
  UserCheck,
  Trash2,
  Archive,
  RotateCcw,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface AdminTeamOverviewProps {
  teamMembers: UserProfile[];
  entries: WorkEntry[];
  tasks: AssignedTask[];
  handovers: Handover[];
  attendanceRecords: AttendanceRecord[];
  companies: CompanyTag[];
  onAddCompany?: (name: string) => Promise<any>;
  onToggleArchiveCompany?: (id: string, archived: boolean) => Promise<void>;
  onDeleteCompany?: (id: string) => Promise<void>;
  onUpdateUserByAdmin?: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  onDeleteUserByAdmin?: (uid: string) => Promise<void>;
}

export const AdminTeamOverview: React.FC<AdminTeamOverviewProps> = ({
  teamMembers = [],
  entries = [],
  tasks = [],
  handovers = [],
  attendanceRecords = [],
  companies = [],
  onAddCompany,
  onToggleArchiveCompany,
  onDeleteCompany,
  onUpdateUserByAdmin,
  onDeleteUserByAdmin,
}) => {
  const todayStr = getTodayDateString();
  const { createTeamMember, sendPasswordReset } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [drilldownMember, setDrilldownMember] = useState<UserProfile | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'members_manage' | 'companies_manage'>('matrix');
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  // Add user modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('member');
  const [newUserDesignation, setNewUserDesignation] = useState('');
  const [newUserShiftStart, setNewUserShiftStart] = useState('10:30');
  const [newUserShiftEnd, setNewUserShiftEnd] = useState('18:30');
  const [userCreating, setUserCreating] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit user modal state
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);

  // Delete user confirmation
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);

  // Add company state
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companyCreating, setCompanyCreating] = useState(false);

  // Past 7 working days to check for missing logs
  const pastWorkingDays = useMemo(() => {
    return getPastDates(7).filter((d) => {
      if (d >= todayStr) return false;
      const dow = getDayOfWeek(d);
      return dow !== 0 && dow !== 6; // Mon-Fri
    });
  }, [todayStr]);

  const displayedMembers = useMemo(() => {
    let list = [...(teamMembers || [])];
    if (showOnlyActive) {
      list = list.filter((m) => m.active !== false);
    }
    return list;
  }, [teamMembers, showOnlyActive]);

  // Aggregate stats per member
  const memberSummaries = useMemo(() => {
    return displayedMembers.map((member) => {
      // Today entries
      const todayLogs = (entries || []).filter((e) => e.userId === member.uid && e.date === todayStr);

      // Pending reviews
      const pendingReviews = (entries || []).filter((e) => e.userId === member.uid && e.review === 'pending');

      // Open assigned tasks
      const openTasks = (tasks || []).filter((t) => t.assignedTo === member.uid && t.status !== 'done');

      // Unacknowledged handovers sent to this member
      const unackHandovers = (handovers || []).filter((h) => h.toUserId === member.uid && h.status === 'pending');

      // Today attendance record
      const todayAttendance = (attendanceRecords || []).find((a) => a.userId === member.uid && a.date === todayStr);

      // Check missing log days on past working days
      const missingLogDays: string[] = [];
      for (const d of pastWorkingDays) {
        const expectedHours = member.expectedHoursMap?.[getDayOfWeek(d)] ?? 8;
        if (expectedHours > 0) {
          const hasLog = entries.some((e) => e.userId === member.uid && e.date === d);
          if (!hasLog) {
            missingLogDays.push(d);
          }
        }
      }

      return {
        member,
        todayCount: todayLogs.length,
        pendingReviewCount: pendingReviews.length,
        openTasksCount: openTasks.length,
        unackHandoversCount: unackHandovers.length,
        shiftStatus: todayAttendance?.status === 'active' ? 'active' : todayAttendance ? 'closed' : 'none',
        totalTodayMinutes: todayAttendance?.totalMinutes || 0,
        missingLogDays,
      };
    });
  }, [displayedMembers, entries, tasks, handovers, attendanceRecords, todayStr, pastWorkingDays]);

  const filteredSummaries = memberSummaries.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.member.name.toLowerCase().includes(q) || s.member.designation.toLowerCase().includes(q) || s.member.email.toLowerCase().includes(q);
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg(null);
    setUserCreating(true);

    try {
      await createTeamMember({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        designation: newUserDesignation.trim(),
        shiftStart: newUserShiftStart,
        shiftEnd: newUserShiftEnd,
        temporaryPassword: 'TeamTurbo123!',
      });
      setUserMsg({ type: 'success', text: `User ${newUserName} successfully added! Default pass: TeamTurbo123!` });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserDesignation('');
      setIsAddUserOpen(false);
      setTimeout(() => setUserMsg(null), 5000);
    } catch (err: any) {
      setUserMsg({ type: 'error', text: err?.message || 'Failed to create user.' });
    } finally {
      setUserCreating(false);
    }
  };

  const handleToggleActiveUser = async (member: UserProfile) => {
    if (!onUpdateUserByAdmin) return;
    const newActiveState = member.active === false ? true : false;
    try {
      await onUpdateUserByAdmin(member.uid, { active: newActiveState });
      setUserMsg({ 
        type: 'success', 
        text: `User ${member.name} has been ${newActiveState ? 'Reactivated' : 'Closed / Deactivated'}.` 
      });
      setTimeout(() => setUserMsg(null), 4000);
    } catch (err: any) {
      setUserMsg({ type: 'error', text: err?.message || 'Failed to update user status.' });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser || !onDeleteUserByAdmin) return;
    try {
      await onDeleteUserByAdmin(deleteConfirmUser.uid);
      setUserMsg({ type: 'success', text: `User ${deleteConfirmUser.name} deleted from workspace.` });
      setDeleteConfirmUser(null);
      setTimeout(() => setUserMsg(null), 4000);
    } catch (err: any) {
      setUserMsg({ type: 'error', text: err?.message || 'Failed to delete user.' });
    }
  };

  const handleAddCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !onAddCompany) return;
    setCompanyCreating(true);
    try {
      await onAddCompany(newCompanyName.trim());
      setNewCompanyName('');
      setIsAddCompanyOpen(false);
      setUserMsg({ type: 'success', text: `Company tag "${newCompanyName.trim()}" added!` });
      setTimeout(() => setUserMsg(null), 3000);
    } catch (err: any) {
      setUserMsg({ type: 'error', text: err?.message || 'Failed to add company.' });
    } finally {
      setCompanyCreating(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Global Action Notifications */}
      {userMsg && (
        <div className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-lg ${
          userMsg.type === 'success'
            ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
            : 'bg-rose-950/70 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {userMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span className="font-semibold">{userMsg.text}</span>
          </div>
          <button type="button" onClick={() => setUserMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Quick Action Bar */}
      <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-400" />
              Team Operations & Admin Management
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage accounts, close/deactivate staff, configure shifts, add unlimited companies, and review accountability metrics
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>

            <button
              type="button"
              onClick={() => setIsAddCompanyOpen(true)}
              className="px-4 py-2.5 bg-[#1F2636] hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              Add Company
            </button>
          </div>
        </div>

        {/* Sub Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 bg-[#1F2636] p-1 rounded-xl border border-slate-700/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'matrix' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Accountability Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('members_manage')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'members_manage' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Users ({teamMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('companies_manage')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'companies_manage' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Companies ({companies.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff / email..."
                className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            {activeSubTab === 'matrix' && (
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none bg-[#1F2636] px-2.5 py-1.5 rounded-xl border border-slate-700/60">
                <input
                  type="checkbox"
                  checked={showOnlyActive}
                  onChange={(e) => setShowOnlyActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Active only</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: Accountability Matrix Table */}
      {activeSubTab === 'matrix' && (
        <div className="bg-[#161B27] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#1F2636] text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Shift (PKT)</th>
                  <th className="py-3.5 px-4">Today Logs</th>
                  <th className="py-3.5 px-4">Pending Review</th>
                  <th className="py-3.5 px-4">Open Tasks</th>
                  <th className="py-3.5 px-4">Handovers Alert</th>
                  <th className="py-3.5 px-4">Log Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#161B27]">
                {filteredSummaries.map(({ member, todayCount, pendingReviewCount, openTasksCount, unackHandoversCount, shiftStatus, totalTodayMinutes, missingLogDays }) => (
                  <tr key={member.uid} className="hover:bg-[#1F2636]/60 transition-colors">
                    
                    {/* Member Details */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 font-bold text-white flex items-center justify-center text-xs shrink-0">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {member.name}
                            {member.role === 'admin' && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-bold">
                                Admin
                              </span>
                            )}
                            {member.active === false && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded font-bold">
                                Closed
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{member.designation}</div>
                        </div>
                      </div>
                    </td>

                    {/* Shift & Attendance */}
                    <td className="py-4 px-4 font-mono">
                      <div>{member.shiftStart} – {member.shiftEnd}</div>
                      <div className="text-[10px] text-slate-500">
                        {shiftStatus === 'active' ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Clocked In
                          </span>
                        ) : shiftStatus === 'closed' ? (
                          <span className="text-slate-400">{formatDuration(totalTodayMinutes)} spent</span>
                        ) : (
                          'Off Clock'
                        )}
                      </div>
                    </td>

                    {/* Today Logs */}
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        todayCount > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-[#1F2636] text-slate-400 border-slate-700/60'
                      }`}>
                        {todayCount} {todayCount === 1 ? 'log' : 'logs'}
                      </span>
                    </td>

                    {/* Pending Reviews */}
                    <td className="py-4 px-4">
                      {pendingReviewCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                          {pendingReviewCount} pending
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">0</span>
                      )}
                    </td>

                    {/* Open Tasks */}
                    <td className="py-4 px-4">
                      {openTasksCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                          {openTasksCount} active
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">0</span>
                      )}
                    </td>

                    {/* Unack Handovers */}
                    <td className="py-4 px-4">
                      {unackHandoversCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                          {unackHandoversCount} waiting
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>

                    {/* Missing Log Indicator */}
                    <td className="py-4 px-4">
                      {missingLogDays.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          {missingLogDays.length} past days missing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Up to date
                        </span>
                      )}
                    </td>

                    {/* Actions: View History & Quick Toggle */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDrilldownMember(member)}
                          className="px-2.5 py-1.5 bg-[#1F2636] hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-1 border border-slate-700/60"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          History
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: All Users Full Management (Add, Edit, Close/Deactivate, Delete) */}
      {activeSubTab === 'members_manage' && (
        <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Staff Accounts Directory & Status Controls
              </h3>
              <p className="text-xs text-slate-400">
                Manage user permissions, reset credentials, update designations, or close/deactivate member access
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#1F2636] text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Shift (PKT)</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#161B27]">
                {teamMembers.map((m) => (
                  <tr key={m.uid} className="hover:bg-[#1F2636]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{m.name}</div>
                      <div className="text-[11px] text-slate-400">{m.designation}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                      {m.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-[#1F2636] text-slate-300'
                      }`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 text-xs">
                      {m.shiftStart} – {m.shiftEnd}
                    </td>
                    <td className="py-3.5 px-4">
                      {m.active !== false ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800 inline-flex items-center gap-1">
                          <UserX className="w-3 h-3" />
                          Closed / Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMember(m)}
                          className="px-2.5 py-1 bg-[#1F2636] hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg transition-colors border border-slate-700/60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await sendPasswordReset(m.email);
                            setUserMsg({ type: 'success', text: `Password reset email sent to ${m.email}` });
                            setTimeout(() => setUserMsg(null), 4000);
                          }}
                          className="px-2.5 py-1 bg-[#1F2636] hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg transition-colors border border-slate-700/60"
                        >
                          Reset Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActiveUser(m)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                            m.active !== false
                              ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {m.active !== false ? 'Close User' : 'Reactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmUser(m)}
                          title="Delete User"
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Companies Management (Add unlimited companies, archive, delete) */}
      {activeSubTab === 'companies_manage' && (
        <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Managed Companies & Client Tags
              </h3>
              <p className="text-xs text-slate-400">
                Add as many companies and projects as required for shift tasks and daily work logs
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddCompanyOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Company Tag
            </button>
          </div>

          <form onSubmit={handleAddCompanySubmit} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp, Nexa Media, Retail Direct..."
              className="flex-1 bg-[#1F2636] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!newCompanyName.trim() || companyCreating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all"
            >
              {companyCreating ? 'Adding...' : 'Add Tag'}
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {companies.map((c) => (
              <div
                key={c.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                  c.archived
                    ? 'bg-[#1F2636]/40 text-slate-500 border-slate-800 line-through'
                    : 'bg-[#1F2636] text-white border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold truncate">{c.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onToggleArchiveCompany && (
                    <button
                      type="button"
                      onClick={() => onToggleArchiveCompany(c.id, !c.archived)}
                      title={c.archived ? 'Restore' : 'Archive'}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      {c.archived ? <RotateCcw className="w-3.5 h-3.5 text-indigo-400" /> : <Archive className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {onDeleteCompany && (
                    <button
                      type="button"
                      onClick={() => onDeleteCompany(c.id)}
                      title="Permanently Delete"
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Drilldown History Modal */}
      {drilldownMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center">
                  {drilldownMember.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{drilldownMember.name}</h3>
                  <p className="text-xs text-slate-400">{drilldownMember.designation} • {drilldownMember.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownMember(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                All Logged Entries ({entries.filter((e) => e.userId === drilldownMember.uid).length})
              </span>

              {entries.filter((e) => e.userId === drilldownMember.uid).length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No entries recorded for this user.</p>
              ) : (
                entries
                  .filter((e) => e.userId === drilldownMember.uid)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((entry) => (
                    <div key={entry.id} className="bg-[#1F2636] p-3.5 rounded-2xl border border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-300">{entry.company}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{formatDateLabel(entry.date)}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400 font-mono">{entry.timeSpent}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          entry.review === 'ok' ? 'bg-emerald-500/20 text-emerald-300' : entry.review === 'needs_rework' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {entry.review === 'ok' ? 'Review: OK' : entry.review === 'needs_rework' ? 'Needs Rework' : 'Pending Review'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-[#161B27] p-2.5 rounded-xl border border-slate-700/60">
                        {entry.taskText}
                      </p>
                      {entry.remarks && (
                        <p className="text-xs text-slate-400 italic">
                          Remarks: "{entry.remarks}"
                        </p>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDrilldownMember(null)}
                className="px-4 py-2 bg-[#1F2636] hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700/60"
              >
                Close History
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create New Team Member</h3>
              <button type="button" onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">Account will be initialized with a forced password change on first sign in.</p>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Sara Ali"
                  className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="sara@teamturbo.com"
                  className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option key="role-member" value="member">Member</option>
                    <option key="role-admin" value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={newUserDesignation}
                    onChange={(e) => setNewUserDesignation(e.target.value)}
                    placeholder="Content Writer"
                    className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Shift Presets */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  9-Hour Shift Presets
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => { setNewUserShiftStart('09:30'); setNewUserShiftEnd('18:30'); }}
                    className="p-1.5 rounded-lg bg-[#1F2636] hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-center"
                  >
                    09:30 - 18:30
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewUserShiftStart('12:00'); setNewUserShiftEnd('21:00'); }}
                    className="p-1.5 rounded-lg bg-[#1F2636] hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-center"
                  >
                    12:00 - 21:00
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewUserShiftStart('10:30'); setNewUserShiftEnd('19:30'); }}
                    className="p-1.5 rounded-lg bg-[#1F2636] hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-center"
                  >
                    10:30 - 19:30
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shift Start</label>
                  <input
                    type="text"
                    value={newUserShiftStart}
                    onChange={(e) => setNewUserShiftStart(e.target.value)}
                    placeholder="09:30"
                    className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shift End</label>
                  <input
                    type="text"
                    value={newUserShiftEnd}
                    onChange={(e) => setNewUserShiftEnd(e.target.value)}
                    placeholder="18:30"
                    className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-[#1F2636] text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userCreating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all"
                >
                  {userCreating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Edit User: {editingMember.name}</h3>
              <button type="button" onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (onUpdateUserByAdmin) {
                  await onUpdateUserByAdmin(editingMember.uid, {
                    name: editingMember.name,
                    designation: editingMember.designation,
                    role: editingMember.role,
                    shiftStart: editingMember.shiftStart,
                    shiftEnd: editingMember.shiftEnd,
                  });
                }
                setEditingMember(null);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Designation</label>
                <input
                  type="text"
                  required
                  value={editingMember.designation}
                  onChange={(e) => setEditingMember({ ...editingMember, designation: e.target.value })}
                  className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as UserRole })}
                  className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option key="edit-member" value="member">Member</option>
                  <option key="edit-admin" value="admin">Admin</option>
                </select>
              </div>

              {/* Shift Presets */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  9-Hour Shift Presets
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setEditingMember({ ...editingMember, shiftStart: '09:30', shiftEnd: '18:30' })}
                    className="p-1.5 rounded-lg bg-[#1F2636] hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-center"
                  >
                    09:30 - 18:30
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMember({ ...editingMember, shiftStart: '12:00', shiftEnd: '21:00' })}
                    className="p-1.5 rounded-lg bg-[#1F2636] hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-center"
                  >
                    12:00 - 21:00
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMember({ ...editingMember, shiftStart: '10:30', shiftEnd: '19:30' })}
                    className="p-1.5 rounded-lg bg-[#1F2636] hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-center"
                  >
                    10:30 - 19:30
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shift Start</label>
                  <input
                    type="text"
                    value={editingMember.shiftStart || '09:30'}
                    onChange={(e) => setEditingMember({ ...editingMember, shiftStart: e.target.value })}
                    className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shift End</label>
                  <input
                    type="text"
                    value={editingMember.shiftEnd || '18:30'}
                    onChange={(e) => setEditingMember({ ...editingMember, shiftEnd: e.target.value })}
                    className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 bg-[#1F2636] text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {isAddCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Add Company Tag
              </h3>
              <button type="button" onClick={() => setIsAddCompanyOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCompanySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company / Project Name</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Apex Global"
                  className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCompanyOpen(false)}
                  className="px-4 py-2 bg-[#1F2636] text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCompanyName.trim() || companyCreating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs"
                >
                  {companyCreating ? 'Adding...' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete User Profile</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete <strong>{deleteConfirmUser.name}</strong> from the team registry?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 bg-[#1F2636] hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
