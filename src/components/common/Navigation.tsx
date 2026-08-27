import React from 'react';
import { UserRole } from '../../types';
import { 
  FileText, 
  CheckCheck, 
  ArrowRightLeft, 
  History, 
  Settings, 
  Activity, 
  CalendarCheck, 
  Clock, 
  Users, 
  BarChart3, 
  Timer,
  ShieldCheck
} from 'lucide-react';

export type MemberNavTab = 'daily' | 'assigned' | 'handovers' | 'history' | 'settings';
export type AdminNavTab = 'live' | 'review' | 'queue' | 'attendance' | 'tasks' | 'handovers' | 'team' | 'analytics' | 'settings';

interface NavigationProps {
  role: UserRole;
  currentTab: string;
  onSelectTab: (tab: any) => void;
  badges: {
    reworkCount?: number;
    assignedTasksCount?: number;
    unackHandoversCount?: number;
    pendingQueueCount?: number;
    adminHandoversCount?: number;
  };
}

export const Navigation: React.FC<NavigationProps> = ({
  role,
  currentTab,
  onSelectTab,
  badges,
}) => {
  if (role === 'admin') {
    const adminTabs: { id: AdminNavTab; label: string; icon: React.FC<any>; badge?: number; badgeColor?: string }[] = [
      { id: 'live', label: 'Today Live', icon: Activity },
      { id: 'review', label: 'Daily Review', icon: CalendarCheck },
      { 
        id: 'queue', 
        label: 'Unreviewed Queue', 
        icon: Clock, 
        badge: badges.pendingQueueCount,
        badgeColor: 'bg-amber-500 text-slate-950'
      },
      { id: 'attendance', label: 'Attendance & HR', icon: Timer },
      { id: 'tasks', label: 'Task Delegation', icon: CheckCheck },
      { 
        id: 'handovers', 
        label: 'Work Handovers', 
        icon: ArrowRightLeft,
        badge: badges.adminHandoversCount,
        badgeColor: 'bg-amber-500 text-slate-950 font-bold'
      },
      { id: 'team', label: 'Team Matrix', icon: Users },
      { id: 'analytics', label: 'Analytics & CSV', icon: BarChart3 },
      { id: 'settings', label: 'Admin Settings', icon: Settings },
    ];

    return (
      <div className="bg-[#0B0F1A]/60 border-b border-slate-800 backdrop-blur-sm sticky top-20 z-30 overflow-x-auto scrollbar-none">
        <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 flex items-center gap-2 py-3">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                    : 'bg-[#161B27]/80 text-slate-400 hover:text-slate-200 hover:bg-[#1F2636] border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.badgeColor || 'bg-indigo-400 text-slate-950'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Member navigation
  const memberTabs: { id: MemberNavTab; label: string; icon: React.FC<any>; badge?: number; badgeColor?: string }[] = [
    { 
      id: 'daily', 
      label: 'Daily Work & Clock', 
      icon: FileText,
      badge: badges.reworkCount,
      badgeColor: 'bg-rose-500 text-white animate-pulse'
    },
    { 
      id: 'assigned', 
      label: 'Assigned to Me', 
      icon: CheckCheck,
      badge: badges.assignedTasksCount,
      badgeColor: 'bg-indigo-500 text-white'
    },
    { 
      id: 'handovers', 
      label: 'Handovers', 
      icon: ArrowRightLeft,
      badge: badges.unackHandoversCount,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold animate-pulse'
    },
    { id: 'history', label: 'My Past History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="bg-[#0B0F1A]/60 border-b border-slate-800 backdrop-blur-sm sticky top-20 z-30 overflow-x-auto scrollbar-none">
      <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 flex items-center gap-2 py-3">
        {memberTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                  : 'bg-[#161B27]/80 text-slate-400 hover:text-slate-200 hover:bg-[#1F2636] border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.badgeColor || 'bg-indigo-400 text-slate-950'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
