import React, { useState } from 'react';
import { AssignedTask, UserProfile, TaskPriority, AssignedTaskStatus, CompanyTag, DEFAULT_COMPANIES, ItemChatMessage } from '../../types';
import { formatDateLabel, getTodayDateString } from '../../lib/dateUtils';
import { ItemFeedbackChat } from '../common/ItemFeedbackChat';
import { 
  Plus, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  User, 
  CheckCircle2, 
  Trash2, 
  Clock3,
  ChevronDown,
  ChevronUp,
  Building2,
  Sparkles,
  ClipboardList,
  MessageSquare
} from 'lucide-react';

interface AdminTaskAssignmentProps {
  tasks: AssignedTask[];
  teamMembers: UserProfile[];
  companies?: CompanyTag[];
  chatMessages?: ItemChatMessage[];
  onSendMessage?: (targetId: string, targetType: 'work_entry' | 'assigned_task', text: string) => Promise<any>;
  onDeleteChatMessage?: (messageId: string) => Promise<any>;
  adminId: string;
  adminName: string;
  onAssignTask: (task: Omit<AssignedTask, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateStatus: (taskId: string, status: AssignedTaskStatus) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
}

export const AdminTaskAssignment: React.FC<AdminTaskAssignmentProps> = ({
  tasks = [],
  teamMembers = [],
  companies = [],
  chatMessages = [],
  onSendMessage,
  onDeleteChatMessage,
  adminId,
  adminName,
  onAssignTask,
  onUpdateStatus,
  onDeleteTask,
}) => {
  const todayStr = getTodayDateString();
  const [isAdding, setIsAdding] = useState(false);
  const [activeChatTaskId, setActiveChatTaskId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [company, setCompany] = useState(companies?.[0]?.name || DEFAULT_COMPANIES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(todayStr);
  const [submitting, setSubmitting] = useState(false);

  const activeMembers = (teamMembers || []).filter((m) => m.active !== false);

  const activeCompanies = React.useMemo(() => {
    const list = (companies && companies.length > 0)
      ? companies.filter((c) => !c.archived).map((c) => c.name)
      : DEFAULT_COMPANIES;
    return Array.from(new Set(list));
  }, [companies]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo || !title.trim() || !dueDate) return;

    const targetUser = teamMembers.find((m) => m.uid === assignedTo);
    if (!targetUser) return;

    setSubmitting(true);
    try {
      await onAssignTask({
        assignedTo,
        assignedToName: targetUser.name,
        assignedBy: adminId,
        assignedByName: adminName,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate,
        company: company || activeCompanies[0] || 'General Work',
        status: 'open',
      });
      setTitle('');
      setDescription('');
      setPriority('medium');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to assign task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            High
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
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner & Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <CheckCheck className="w-6 h-6 text-indigo-400" />
              Task Delegation & Deadlines
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Assign high-impact deliverables to team members and monitor turnaround
            </p>
          </div>

          {!isAdding && (
            <button
              id="assign-new-task-btn"
              onClick={() => {
                if (activeMembers.length > 0 && !assignedTo) {
                  setAssignedTo(activeMembers[0].uid);
                }
                setIsAdding(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              Assign New Task
            </button>
          )}
        </div>

        {/* Task Creation Form */}
        {isAdding && (
          <form 
            onSubmit={handleAssignSubmit}
            className="pt-4 border-t border-slate-800 bg-slate-950/60 rounded-2xl p-5 border border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Task Assignment
              </h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assignee
                </label>
                <div className="relative">
                  <select
                    required
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8"
                  >
                    {activeMembers.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.name} ({m.designation})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Company / Project
                </label>
                <div className="relative">
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8"
                  >
                    {activeCompanies.map((c, idx) => (
                      <option key={`assign-comp-${idx}-${c}`} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Priority
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8"
                  >
                    <option key="prio-high" value="high">High Priority</option>
                    <option key="prio-medium" value="medium">Medium Priority</option>
                    <option key="prio-low" value="low">Low Priority</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Task Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Audit Technical SEO for client portal"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Description & Instructions
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specific scope, references, files, expectations..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Auto Work Log Sync Callout Banner */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 flex items-start sm:items-center gap-2.5 text-xs text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Automatic Work Log:</strong> A work entry with <span className="underline font-bold text-amber-300">Pending</span> status will be automatically created in the member's daily tracker for this assignment.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Member Task Boards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {activeMembers.map((member) => {
          const memberTasks = tasks.filter((t) => t.assignedTo === member.uid);
          const openTasks = memberTasks.filter((t) => t.status !== 'done');
          const overdueTasks = openTasks.filter((t) => t.dueDate < todayStr);

          return (
            <div
              key={member.uid}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between"
            >
              {/* Member Task Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {member.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {member.designation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {overdueTasks.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                      {overdueTasks.length} Overdue
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {openTasks.length} Open / {memberTasks.length} Total
                  </span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1">
                {memberTasks.length === 0 ? (
                  <div className="py-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                    <CheckCircle2 className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-400">No tasks assigned to {member.name}</p>
                  </div>
                ) : (
                  memberTasks.map((task) => {
                    const isOverdue = task.status !== 'done' && task.dueDate < todayStr;
                    const taskChatMessages = chatMessages.filter(
                      (m) => m.targetId === task.id && m.targetType === 'assigned_task'
                    );

                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-2xl border space-y-2 transition-all ${
                          task.status === 'done'
                            ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                            : isOverdue
                            ? 'bg-rose-950/20 border-rose-800/80 shadow-md shadow-rose-950/20'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`text-xs font-bold ${task.status === 'done' ? 'line-through text-slate-400' : 'text-white'}`}>
                                {task.title}
                              </span>
                              {getPriorityBadge(task.priority)}
                              {isOverdue && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {task.status !== 'done' ? (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(task.id, 'done')}
                                title="Mark completed"
                                className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(task.id, 'open')}
                                title="Re-open task"
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
                              >
                                Re-open
                              </button>
                            )}

                            {onDeleteTask && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to permanently delete task "${task.title}"?`)) {
                                    onDeleteTask(task.id);
                                  }
                                }}
                                title="Delete task"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            Due: <strong className={isOverdue ? 'text-red-400' : 'text-slate-300'}>{formatDateLabel(task.dueDate)}</strong>
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => setActiveChatTaskId(activeChatTaskId === task.id ? null : task.id)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold text-[11px] transition-all ${
                              activeChatTaskId === task.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : taskChatMessages.length > 0
                                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <MessageSquare className="w-3 h-3 text-indigo-400" />
                            <span>
                              {taskChatMessages.length > 0
                                ? `Feedback (${taskChatMessages.length})`
                                : 'Feedback'}
                            </span>
                            {activeChatTaskId === task.id ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Inline Task Discussion Chat for Admin */}
                        {activeChatTaskId === task.id && onSendMessage && (
                          <ItemFeedbackChat
                            targetId={task.id}
                            targetType="assigned_task"
                            targetTitle={task.title}
                            targetSubtitle={`Assigned to ${member.name}`}
                            messages={chatMessages}
                            currentUserId={adminId}
                            currentUserName={adminName}
                            currentUserRole="admin"
                            onSendMessage={onSendMessage}
                            onDeleteMessage={onDeleteChatMessage}
                            isInline={true}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
