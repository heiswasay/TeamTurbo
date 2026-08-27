import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole, CompanyTag, DEFAULT_COMPANIES } from '../../types';
import { 
  User, 
  KeyRound, 
  Moon, 
  Sun, 
  Bell, 
  Clock, 
  LogOut, 
  Users, 
  Building2, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Lock, 
  Trash2,
  Archive,
  RotateCcw,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface SettingsViewProps {
  teamMembers: UserProfile[];
  companies: CompanyTag[];
  onAddCompany: (name: string) => Promise<void>;
  onToggleArchiveCompany: (id: string, archived: boolean) => Promise<void>;
  onUpdateUserByAdmin: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  teamMembers,
  companies,
  onAddCompany,
  onToggleArchiveCompany,
  onUpdateUserByAdmin,
}) => {
  const { 
    currentUser, 
    userProfile, 
    theme, 
    setTheme, 
    changePassword, 
    signOut, 
    sendPasswordReset, 
    updateProfileDetails,
    createTeamMember
  } = useAuth();

  const isAdmin = userProfile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance' | 'notifications' | 'shift' | 'team'>('profile');

  // Profile tab state
  const [name, setName] = useState(userProfile?.name || '');
  const [designation, setDesignation] = useState(userProfile?.designation || '');
  const [profilePhoto, setProfilePhoto] = useState(userProfile?.profilePhoto || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Change password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Notification toggles
  const [notifState, setNotifState] = useState({
    newTask: userProfile?.notificationPreferences?.newTask ?? true,
    handover: userProfile?.notificationPreferences?.handover ?? true,
    rework: userProfile?.notificationPreferences?.rework ?? true,
  });

  // Admin: Add User state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('member');
  const [newUserDesignation, setNewUserDesignation] = useState('');
  const [newUserShiftStart, setNewUserShiftStart] = useState('10:30');
  const [newUserShiftEnd, setNewUserShiftEnd] = useState('18:30');
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);

  // Admin: Edit User modal
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);

  // Admin: Add Company state
  const [newCompanyName, setNewCompanyName] = useState('');

  // Sign out confirmation modal
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await updateProfileDetails({
        name: name.trim(),
        designation: designation.trim(),
        profilePhoto: profilePhoto.trim(),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPass.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    setPassLoading(true);
    try {
      await changePassword(currentPass, newPass);
      setPassSuccess('Password successfully updated!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPassError('The current password entered is incorrect.');
      } else {
        setPassError(err.message || 'Failed to update password.');
      }
    } finally {
      setPassLoading(false);
    }
  };

  const handleToggleNotif = async (key: 'newTask' | 'handover' | 'rework') => {
    const updated = { ...notifState, [key]: !notifState[key] };
    setNotifState(updated);
    try {
      await updateProfileDetails({ notificationPreferences: updated });
    } catch (e) {
      console.error('Failed to update notification preference:', e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMsg(null);
    setUserActionLoading(true);

    try {
      await createTeamMember({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        designation: newUserDesignation,
        shiftStart: newUserShiftStart,
        shiftEnd: newUserShiftEnd,
        temporaryPassword: 'TeamTurbo123!',
      });
      setUserActionMsg({ type: 'success', text: `User ${newUserName} created! Initial password: TeamTurbo123!` });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserDesignation('');
      setIsAddUserOpen(false);
    } catch (err: any) {
      setUserActionMsg({ type: 'error', text: err.message || 'Failed to create user.' });
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleAddCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    try {
      await onAddCompany(newCompanyName.trim());
      setNewCompanyName('');
    } catch (err) {
      console.error('Failed to add company:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-base">
            {userProfile?.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Workspace Settings & Preferences
            </h2>
            <p className="text-xs text-slate-400">
              Manage your personal profile, security credentials, appearance, and team settings
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profile Details
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Security & Password
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'appearance'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            Appearance
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Notifications
          </button>

          <button
            onClick={() => setActiveTab('shift')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'shift'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            My Shift Schedule
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'team'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-amber-500/10 text-amber-300 hover:text-amber-200 border border-amber-500/30'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Team Management (Admin)
            </button>
          )}

          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="ml-auto px-4 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

      </div>

      {/* Tab 1: Profile Details */}
      {activeTab === 'profile' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Personal Profile</h3>
            <p className="text-xs text-slate-400">View and update your display information</p>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Company Email (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={userProfile?.email || ''}
                className="w-full bg-slate-950/50 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Designation / Job Title
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
              {profileSaved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Security & Password Management</h3>
            <p className="text-xs text-slate-400">Update your password or request an email reset link</p>
          </div>

          {passError && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-800/70 text-red-300 text-xs flex items-start gap-2 max-w-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{passError}</span>
            </div>
          )}

          {passSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 text-xs flex items-start gap-2 max-w-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{passSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                New Password (minimum 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              {passLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 max-w-lg">
            <h4 className="text-xs font-bold text-slate-300 mb-1">Forgot Your Password?</h4>
            <p className="text-xs text-slate-400 mb-3">
              Trigger a secure password reset link to be sent to your registered email (<strong className="text-slate-300">{userProfile?.email}</strong>).
            </p>
            <button
              type="button"
              onClick={async () => {
                if (userProfile?.email) {
                  await sendPasswordReset(userProfile.email);
                  setPassSuccess(`Reset link sent to ${userProfile.email}`);
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Send Password Reset Email
            </button>
          </div>

        </div>
      )}

      {/* Tab 3: Appearance */}
      {activeTab === 'appearance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Appearance & Theme</h3>
            <p className="text-xs text-slate-400">Choose between dark charcoal and light interface modes</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                theme === 'dark'
                  ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-900 text-indigo-400 border border-slate-800">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Dark Mode (Default)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Deep charcoal navy surfaces with focused contrast</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                theme === 'light'
                  ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-900 text-amber-400 border border-slate-800">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Light Mode</h4>
                <p className="text-xs text-slate-400 mt-0.5">High clarity daylight theme</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Notification Preferences</h3>
            <p className="text-xs text-slate-400">Configure notifications and badge triggers</p>
          </div>

          <div className="space-y-3 max-w-lg">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">New Task Assigned</h4>
                <p className="text-[11px] text-slate-400">Receive alert when team lead assigns deliverables</p>
              </div>
              <input
                type="checkbox"
                checked={notifState.newTask}
                onChange={() => handleToggleNotif('newTask')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Handover Received</h4>
                <p className="text-[11px] text-slate-400">Highlight pending handover transfers from teammates</p>
              </div>
              <input
                type="checkbox"
                checked={notifState.handover}
                onChange={() => handleToggleNotif('handover')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Work Marked as Needing Rework</h4>
                <p className="text-[11px] text-slate-400">Display top action items for revisions requested by lead</p>
              </div>
              <input
                type="checkbox"
                checked={notifState.rework}
                onChange={() => handleToggleNotif('rework')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: My Shift Schedule */}
      {activeTab === 'shift' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">My Shift Schedule</h3>
            <p className="text-xs text-slate-400">Official working hours assigned by administration</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Default Shift Window:</span>
              <span className="text-sm font-bold text-white font-mono">
                {userProfile?.shiftStart || '10:30'} – {userProfile?.shiftEnd || '18:30'} PKT
              </span>
            </div>

            <div className="pt-3 border-t border-slate-900 space-y-1 text-xs text-slate-300">
              <span className="text-slate-400 font-semibold block mb-1">Expected Daily Target Hours:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900 flex justify-between">
                  <span>Monday – Thursday</span>
                  <strong className="text-indigo-300">8.0 hrs</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 flex justify-between">
                  <span>Friday</span>
                  <strong className="text-indigo-300">8.0 hrs</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 flex justify-between">
                  <span>Saturday</span>
                  <strong className="text-slate-500">Off</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 flex justify-between">
                  <span>Sunday</span>
                  <strong className="text-slate-500">Off</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Admin Team Management */}
      {isAdmin && activeTab === 'team' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Team & Company Management
              </h3>
              <p className="text-xs text-slate-400">
                Manage user credentials, shifts, account activation, and client tags
              </p>
            </div>

            <button
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add New User
            </button>
          </div>

          {userActionMsg && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
              userActionMsg.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/70 border border-red-800 text-red-300'
            }`}>
              {userActionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{userActionMsg.text}</span>
            </div>
          )}

          {/* User List Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Active Team Members ({teamMembers.length})
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Shift (PKT)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-950/50">
                  {teamMembers.map((m) => (
                    <tr key={m.uid} className="hover:bg-slate-950">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{m.name}</div>
                        <div className="text-[11px] text-slate-400">{m.email} • {m.designation}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 text-xs">
                        {m.shiftStart} – {m.shiftEnd}
                      </td>
                      <td className="py-3.5 px-4">
                        {m.active !== false ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950 text-red-400 border border-red-800">
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMember(m)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await sendPasswordReset(m.email);
                            setUserActionMsg({ type: 'success', text: `Reset email sent to ${m.email}` });
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg transition-colors"
                        >
                          Reset Pass
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const newActive = m.active === false ? true : false;
                            await onUpdateUserByAdmin(m.uid, { active: newActive });
                            setUserActionMsg({ type: 'success', text: `User ${m.name} ${newActive ? 'activated' : 'deactivated'}` });
                          }}
                          className={`px-2.5 py-1 text-[11px] rounded-lg transition-colors ${
                            m.active !== false
                              ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300'
                          }`}
                        >
                          {m.active !== false ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manage Companies List */}
          <div className="pt-6 border-t border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Managed Companies & Clients
            </h4>

            <form onSubmit={handleAddCompanySubmit} className="flex gap-2 max-w-md">
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Add new company tag..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!newCompanyName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl"
              >
                Add Tag
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {companies.map((c) => (
                <div
                  key={c.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border ${
                    c.archived
                      ? 'bg-slate-950 text-slate-500 border-slate-850 line-through'
                      : 'bg-slate-950 text-slate-200 border-slate-800'
                  }`}
                >
                  <span>{c.name}</span>
                  <button
                    type="button"
                    onClick={() => onToggleArchiveCompany(c.id, !c.archived)}
                    title={c.archived ? 'Restore' : 'Archive'}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    {c.archived ? <RotateCcw className="w-3 h-3 text-indigo-400" /> : <Archive className="w-3 h-3 text-slate-500" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create New Team Member</h3>
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option key="new-role-member" value="member">Member</option>
                    <option key="new-role-admin" value="admin">Admin</option>
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shift Start</label>
                  <input
                    type="text"
                    value={newUserShiftStart}
                    onChange={(e) => setNewUserShiftStart(e.target.value)}
                    placeholder="10:30"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shift End</label>
                  <input
                    type="text"
                    value={newUserShiftEnd}
                    onChange={(e) => setNewUserShiftEnd(e.target.value)}
                    placeholder="18:30"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userActionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs"
                >
                  {userActionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Edit User: {editingMember.name}</h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onUpdateUserByAdmin(editingMember.uid, {
                  name: editingMember.name,
                  designation: editingMember.designation,
                  role: editingMember.role,
                  shiftStart: editingMember.shiftStart,
                  shiftEnd: editingMember.shiftEnd,
                });
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Designation</label>
                <input
                  type="text"
                  required
                  value={editingMember.designation}
                  onChange={(e) => setEditingMember({ ...editingMember, designation: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as UserRole })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option key="edit-role-member" value="member">Member</option>
                  <option key="edit-role-admin" value="admin">Admin</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shift Start</label>
                  <input
                    type="text"
                    value={editingMember.shiftStart || '10:30'}
                    onChange={(e) => setEditingMember({ ...editingMember, shiftStart: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shift End</label>
                  <input
                    type="text"
                    value={editingMember.shiftEnd || '18:30'}
                    onChange={(e) => setEditingMember({ ...editingMember, shiftEnd: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
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

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirm Sign Out</h3>
              <p className="text-xs text-slate-400 mt-1">Are you sure you want to end your current session?</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSignOutConfirm(false);
                  await signOut();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
