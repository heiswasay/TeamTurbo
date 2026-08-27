import React from 'react';
import { AssignedTask, AssignedTaskStatus, TaskPriority } from '../../types';
import { formatDateLabel, getTodayDateString } from '../../lib/dateUtils';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  User, 
  CheckCheck, 
  PlayCircle,
  Clock3
} from 'lucide-react';

interface AssignedTasksListProps {
  tasks: AssignedTask[];
  onUpdateStatus: (taskId: string, status: AssignedTaskStatus) => Promise<void>;
}

export const AssignedTasksList: React.FC<AssignedTasksListProps> = ({
  tasks = [],
  onUpdateStatus,
}) => {
  const todayStr = getTodayDateString();

  // Priority weight for sorting: high -> 3, medium -> 2, low -> 1
  const priorityWeight = (p: TaskPriority) => {
    switch (p) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  };

  // Sort by open/in_progress first, then priority descending, then due date
  const sortedTasks = [...(tasks || [])].sort((a, b) => {
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
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Medium Priority
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Low Priority
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-indigo-400" />
            Assigned to Me ({tasks.filter(t => t.status !== 'done').length} Open)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tasks assigned by your team lead with deadlines and priority tags
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-medium text-white">All caught up!</p>
          <p className="text-xs text-slate-500 mt-0.5">No tasks currently assigned to you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const isOverdue = task.status !== 'done' && task.dueDate < todayStr;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all ${
                  task.status === 'done'
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : isOverdue
                    ? 'bg-rose-950/20 border-rose-800/60 shadow-lg shadow-rose-950/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-bold ${task.status === 'done' ? 'line-through text-slate-400' : 'text-white'}`}>
                        {task.title}
                      </span>
                      {getPriorityBadge(task.priority)}
                      
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          OVERDUE
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
                          Completed
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {task.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Due: <strong className={isOverdue ? 'text-red-400' : 'text-slate-200'}>{formatDateLabel(task.dueDate)}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        Assigned by: <strong className="text-slate-300">{task.assignedByName}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {task.status !== 'done' && (
                      <>
                        {task.status !== 'in_progress' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(task.id, 'in_progress')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                            Start Work
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(task.id, 'done')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 shadow-md shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Done
                        </button>
                      </>
                    )}

                    {task.status === 'done' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(task.id, 'in_progress')}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg transition-colors"
                      >
                        Re-open
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
