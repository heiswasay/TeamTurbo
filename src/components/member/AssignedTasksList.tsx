import React, { useState } from 'react';
import { AssignedTask, AssignedTaskStatus, TaskPriority, ItemChatMessage, UserRole } from '../../types';
import { formatDateLabel, getTodayDateString } from '../../lib/dateUtils';
import { ItemFeedbackChat } from '../common/ItemFeedbackChat';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  User, 
  CheckCheck, 
  PlayCircle,
  Clock3,
  ListTodo,
  PlusCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';

interface AssignedTasksListProps {
  tasks: AssignedTask[];
  chatMessages?: ItemChatMessage[];
  onSendMessage?: (targetId: string, targetType: 'work_entry' | 'assigned_task', text: string) => Promise<any>;
  onDeleteChatMessage?: (messageId: string) => Promise<any>;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: UserRole;
  onUpdateStatus: (taskId: string, status: AssignedTaskStatus) => Promise<void>;
  onPrefillLog?: (taskTitle: string, priority: TaskPriority) => void;
  titleOverride?: string;
  isDashboardWidget?: boolean;
}

export const AssignedTasksList: React.FC<AssignedTasksListProps> = ({
  tasks = [],
  chatMessages = [],
  onSendMessage,
  onDeleteChatMessage,
  currentUserId = '',
  currentUserName = '',
  currentUserRole = 'member',
  onUpdateStatus,
  onPrefillLog,
  titleOverride,
  isDashboardWidget = false,
}) => {
  const todayStr = getTodayDateString();
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'done'>('open');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeChatTaskId, setActiveChatTaskId] = useState<string | null>(null);

  // Priority weight for sorting: high -> 3, medium -> 2, low -> 1
  const priorityWeight = (p: TaskPriority) => {
    switch (p) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  };

  const openTasksCount = tasks.filter(t => t.status !== 'done').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'open') return t.status !== 'done';
    if (filter === 'in_progress') return t.status === 'in_progress';
    if (filter === 'done') return t.status === 'done';
    return true;
  });

  // Sort by open/in_progress first, then priority descending, then due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    
    const pDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (pDiff !== 0) return pDiff;

    return a.dueDate.localeCompare(b.dueDate);
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1F2636] text-slate-300 border border-slate-700">
            Low
          </span>
        );
    }
  };

  return (
    <div className={`bg-[#161B27] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 ${
      isDashboardWidget ? 'border-indigo-500/30 ring-1 ring-indigo-500/10' : ''
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                {titleOverride || 'Assigned Tasks & Action Items'}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {openTasksCount} Pending
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tasks assigned by your team lead with deadlines and instant work-log sync
              </p>
            </div>
          </div>

          {isDashboardWidget && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-[#1F2636] p-1 rounded-xl border border-slate-700/60 self-start sm:self-center overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => { setFilter('open'); setIsCollapsed(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'open' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Open ({openTasksCount})
          </button>
          <button
            type="button"
            onClick={() => { setFilter('in_progress'); setIsCollapsed(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'in_progress' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => { setFilter('done'); setIsCollapsed(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'done' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Done ({doneCount})
          </button>
          <button
            type="button"
            onClick={() => { setFilter('all'); setIsCollapsed(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({tasks.length})
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {sortedTasks.length === 0 ? (
            <div className="p-8 text-center bg-[#1F2636]/40 rounded-2xl border border-dashed border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-white">
                {filter === 'open' ? 'No pending tasks!' : 'No tasks in this view'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {filter === 'open' ? 'You are completely caught up on all assigned duties.' : 'Check other tabs to review past or active tasks.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedTasks.map((task) => {
                const isOverdue = task.status !== 'done' && task.dueDate < todayStr;
                const taskChatMessages = chatMessages.filter(
                  (m) => m.targetId === task.id && m.targetType === 'assigned_task'
                );

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      task.status === 'done'
                        ? 'bg-[#1F2636]/40 border-slate-800/60 opacity-75'
                        : isOverdue
                        ? 'bg-rose-950/20 border-rose-800/60 shadow-lg shadow-rose-950/20'
                        : 'bg-[#1F2636] border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-bold ${task.status === 'done' ? 'line-through text-slate-400' : 'text-white'}`}>
                            {task.title}
                          </span>
                          {getPriorityBadge(task.priority)}
                        </div>

                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}

                        {task.status === 'in_progress' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                            <Clock3 className="w-3 h-3" />
                            In Progress
                          </span>
                        )}

                        {task.status === 'done' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-300 leading-relaxed bg-[#161B27]/70 p-2.5 rounded-xl border border-slate-700/40">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          Due: <strong className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-200'}>{formatDateLabel(task.dueDate)}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          By: <strong className="text-slate-300">{task.assignedByName}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-3">
                        {onPrefillLog && task.status !== 'done' && (
                          <button
                            type="button"
                            onClick={() => onPrefillLog(task.title, task.priority)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Log in Daily Work
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveChatTaskId(activeChatTaskId === task.id ? null : task.id)}
                          className={`text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                            activeChatTaskId === task.id
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                              : taskChatMessages.length > 0
                              ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/25'
                              : 'bg-[#1F2636] text-slate-400 hover:text-slate-200 border border-slate-700/60'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                          <span>
                            {taskChatMessages.length > 0 
                              ? `Feedback (${taskChatMessages.length})` 
                              : 'Chat & Feedback'}
                          </span>
                          {activeChatTaskId === task.id ? (
                            <ChevronUp className="w-3 h-3 opacity-75" />
                          ) : (
                            <ChevronDown className="w-3 h-3 opacity-75" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        {task.status !== 'done' && (
                          <>
                            {task.status !== 'in_progress' && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(task.id, 'in_progress')}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 border border-slate-700/60"
                              >
                                <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                                Start
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(task.id, 'done')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 shadow-md shadow-emerald-600/20"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Complete
                            </button>
                          </>
                        )}

                        {task.status === 'done' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(task.id, 'in_progress')}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors border border-slate-700/60"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Task Discussion Chat */}
                    {activeChatTaskId === task.id && onSendMessage && (
                      <ItemFeedbackChat
                        targetId={task.id}
                        targetType="assigned_task"
                        targetTitle={task.title}
                        targetSubtitle={`Assigned to ${task.assignedToName || 'Member'}`}
                        messages={chatMessages}
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        currentUserRole={currentUserRole}
                        onSendMessage={onSendMessage}
                        onDeleteMessage={onDeleteChatMessage}
                        isInline={true}
                      />
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
