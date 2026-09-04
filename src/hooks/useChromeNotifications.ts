import { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, AssignedTask, Handover, WorkEntry, ItemChatMessage } from '../types';
import { 
  sendChromeNotification, 
  getNotificationPermissionStatus,
  requestNotificationPermission,
  NotificationPermissionStatus,
  isNotificationSupported
} from '../lib/notificationService';

export interface InAppToast {
  id: string;
  type: 'task' | 'handover' | 'rework' | 'review' | 'reopen' | 'log' | 'chat' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

interface UseChromeNotificationsProps {
  userProfile: UserProfile | null;
  tasks: AssignedTask[];
  handovers: Handover[];
  entries: WorkEntry[];
  chatMessages?: ItemChatMessage[];
}

export function useChromeNotifications({
  userProfile,
  tasks,
  handovers,
  entries,
  chatMessages = [],
}: UseChromeNotificationsProps) {
  const [permission, setPermission] = useState<NotificationPermissionStatus>(() => 
    getNotificationPermissionStatus()
  );
  const [toasts, setToasts] = useState<InAppToast[]>([]);

  // Keep track of previously seen items to prevent firing on initial mount
  const isInitializedRef = useRef(false);
  const prevTasksRef = useRef<Map<string, AssignedTask>>(new Map());
  const prevHandoversRef = useRef<Map<string, Handover>>(new Map());
  const prevEntriesRef = useRef<Map<string, WorkEntry>>(new Map());
  const prevChatRef = useRef<Map<string, ItemChatMessage>>(new Map());
  const hasSeededChatRef = useRef(false);
  const notifiedMsgIdsRef = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());

  // Check permission on mount / window focus
  useEffect(() => {
    const updatePerm = () => setPermission(getNotificationPermissionStatus());
    updatePerm();
    window.addEventListener('focus', updatePerm);
    return () => window.removeEventListener('focus', updatePerm);
  }, []);

  const addToast = useCallback((toast: Omit<InAppToast, 'id' | 'timestamp'>) => {
    const newToast: InAppToast = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    // Auto remove after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Request browser permission helper
  const promptEnableNotifications = useCallback(async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      addToast({
        type: 'info',
        title: 'Notifications Activated',
        message: 'Chrome desktop notifications are now active for this workspace.',
      });
    }
    return res;
  }, [addToast]);

  // Trigger test notification
  const sendTestNotification = useCallback(() => {
    const title = '🔔 Test Chrome Notification';
    const body = 'Desktop notifications are functioning perfectly in your browser!';
    sendChromeNotification({
      title,
      body,
      tag: `test-notif-${Date.now()}`,
      soundEnabled: true,
    });
    addToast({
      type: 'info',
      title,
      message: body,
    });
  }, [addToast]);

  // Main listener for real-time changes across tasks, handovers, and entries
  useEffect(() => {
    if (!userProfile) return;

    // Check user preference toggles
    const soundEnabled = userProfile.notificationPreferences?.soundEnabled !== false;
    const taskEnabled = userProfile.notificationPreferences?.newTask !== false;
    const handoverEnabled = userProfile.notificationPreferences?.handover !== false;
    const reworkEnabled = userProfile.notificationPreferences?.rework !== false;
    const adminLogEnabled = userProfile.notificationPreferences?.adminNewLog !== false;
    const isAdmin = userProfile.role === 'admin';

    // 1. Initial snapshot seeding (do not notify on first load)
    if (!isInitializedRef.current) {
      if (tasks.length > 0 || handovers.length > 0 || entries.length > 0 || chatMessages.length > 0) {
        tasks.forEach((t) => prevTasksRef.current.set(t.id, t));
        handovers.forEach((h) => prevHandoversRef.current.set(h.id, h));
        entries.forEach((e) => prevEntriesRef.current.set(e.id, e));
        chatMessages.forEach((c) => prevChatRef.current.set(c.id, c));
        isInitializedRef.current = true;
      }
      return;
    }

    // 2. Process Assigned Tasks changes
    if (taskEnabled) {
      tasks.forEach((task) => {
        const prev = prevTasksRef.current.get(task.id);

        if (!prev) {
          // New task created
          if (task.assignedTo === userProfile.uid && task.assignedBy !== userProfile.uid) {
            const title = '📋 New Task Assigned';
            const body = `${task.assignedByName || 'Admin'} assigned: "${task.title}" (Priority: ${task.priority.toUpperCase()})`;
            
            sendChromeNotification({
              title,
              body,
              tag: `task-assign-${task.id}`,
              soundEnabled,
            });

            addToast({
              type: 'task',
              title,
              message: body,
            });
          }
        } else {
          // Existing task updated
          // 1. Task re-opened for the assigned user
          if (task.assignedTo === userProfile.uid && prev.status === 'done' && (task.status === 'open' || task.status === 'in_progress')) {
            const title = '🔄 Task Re-Opened';
            const body = `${task.assignedByName || 'Admin'} re-opened task: "${task.title}"`;

            sendChromeNotification({
              title,
              body,
              tag: `task-reopen-${task.id}-${Date.now()}`,
              soundEnabled,
            });

            addToast({
              type: 'reopen',
              title,
              message: body,
            });
          }
          // 2. Admin notified when a member updates status
          else if (isAdmin && prev.status !== task.status && task.assignedBy === userProfile.uid && task.assignedTo !== userProfile.uid) {
            const title = task.status === 'done' ? '✅ Task Marked DONE' : `📋 Task Updated: ${task.status.toUpperCase()}`;
            const body = `${task.assignedToName || 'Member'} updated task: "${task.title}"`;

            sendChromeNotification({
              title,
              body,
              tag: `task-status-${task.id}-${task.status}`,
              soundEnabled,
            });

            addToast({
              type: 'task',
              title,
              message: body,
            });
          }
        }
      });
    }

    // Update tasks map
    const newTasksMap = new Map<string, AssignedTask>();
    tasks.forEach((t) => newTasksMap.set(t.id, t));
    prevTasksRef.current = newTasksMap;

    // 3. Process Handovers changes
    if (handoverEnabled) {
      handovers.forEach((handover) => {
        const prev = prevHandoversRef.current.get(handover.id);

        if (!prev) {
          // New handover created
          if (handover.toUserId === userProfile.uid && handover.fromUserId !== userProfile.uid) {
            const title = '🤝 New Handover Received';
            const body = `${handover.fromUserName} sent you a handover: "${handover.title}"`;

            sendChromeNotification({
              title,
              body,
              tag: `handover-new-${handover.id}`,
              soundEnabled,
            });

            addToast({
              type: 'handover',
              title,
              message: body,
            });
          } else if (isAdmin && handover.fromUserId !== userProfile.uid) {
            const title = '🤝 Handover Submitted';
            const body = `${handover.fromUserName} ➔ ${handover.toUserName}: "${handover.title}"`;

            sendChromeNotification({
              title,
              body,
              tag: `handover-admin-${handover.id}`,
              soundEnabled,
            });

            addToast({
              type: 'handover',
              title,
              message: body,
            });
          }
        } else {
          // Handover status changed (e.g. acknowledged/accepted)
          if (
            prev.status === 'pending' &&
            (handover.status === 'accepted' || handover.status === 'completed') &&
            handover.fromUserId === userProfile.uid
          ) {
            const title = '🤝 Handover Acknowledged';
            const body = `${handover.toUserName} acknowledged your handover for "${handover.title}"`;

            sendChromeNotification({
              title,
              body,
              tag: `handover-ack-${handover.id}`,
              soundEnabled,
            });

            addToast({
              type: 'handover',
              title,
              message: body,
            });
          }
        }
      });
    }

    // Update handovers map
    const newHandoversMap = new Map<string, Handover>();
    handovers.forEach((h) => newHandoversMap.set(h.id, h));
    prevHandoversRef.current = newHandoversMap;

    // 4. Process Work Entries & Review changes
    entries.forEach((entry) => {
      const prev = prevEntriesRef.current.get(entry.id);

      if (!prev) {
        // Brand new entry logged
        if (isAdmin && adminLogEnabled && entry.userId !== userProfile.uid) {
          const title = '⚡ New Work Logged';
          const body = `${entry.userName} logged "${entry.taskText.slice(0, 45)}..." (${entry.company || 'General'})`;

          sendChromeNotification({
            title,
            body,
            tag: `entry-new-${entry.id}`,
            soundEnabled,
          });

          addToast({
            type: 'log',
            title,
            message: body,
          });
        }
      } else {
        // Existing entry review or status updated for the user
        if (entry.userId === userProfile.uid) {
          // Review state changed
          if (prev.review !== entry.review) {
            if (entry.review === 'needs_rework' && reworkEnabled) {
              const title = '⚠️ Work Marked for Rework';
              const body = `${entry.reviewedByName || 'Admin'} requested rework on "${entry.company || 'Task'}": ${entry.remarks ? `"${entry.remarks}"` : `"${entry.taskText.slice(0, 40)}"`}`;

              sendChromeNotification({
                title,
                body,
                tag: `entry-rework-${entry.id}`,
                soundEnabled,
              });

              addToast({
                type: 'rework',
                title,
                message: body,
              });
            } else if (entry.review === 'ok') {
              const title = '✅ Work Entry Approved';
              const body = `${entry.reviewedByName || 'Admin'} approved "${entry.company || ''} - ${entry.taskText.slice(0, 40)}"`;

              sendChromeNotification({
                title,
                body,
                tag: `entry-ok-${entry.id}`,
                soundEnabled,
              });

              addToast({
                type: 'review',
                title,
                message: body,
              });
            } else if (entry.review === 'pending' && (prev.review === 'ok' || prev.review === 'needs_rework')) {
              // Admin re-opened work entry review
              const title = '🔄 Work Entry Re-Opened';
              const body = `${entry.reviewedByName || 'Admin'} re-opened work entry for "${entry.company || 'Task'}": "${entry.taskText.slice(0, 45)}"`;

              sendChromeNotification({
                title,
                body,
                tag: `entry-reopen-${entry.id}-${Date.now()}`,
                soundEnabled,
              });

              addToast({
                type: 'reopen',
                title,
                message: body,
              });
            }
          }

          // Work status re-opened from completed back to pending or in_progress
          if (prev.status === 'completed' && (entry.status === 'in_progress' || entry.status === 'pending')) {
            const title = '🔄 Work Re-Opened';
            const body = `Work on "${entry.company || 'Task'}" (${entry.taskText.slice(0, 40)}) is active again.`;

            sendChromeNotification({
              title,
              body,
              tag: `entry-status-reopen-${entry.id}-${Date.now()}`,
              soundEnabled,
            });

            addToast({
              type: 'reopen',
              title,
              message: body,
            });
          }
        }
      }
    });

    // Update entries map
    const newEntriesMap = new Map<string, WorkEntry>();
    entries.forEach((e) => newEntriesMap.set(e.id, e));
    prevEntriesRef.current = newEntriesMap;

    // 5. Process Chat / Feedback Messages changes
    const chatEnabled = userProfile.notificationPreferences?.chatFeedback !== false;
    if (chatEnabled && chatMessages.length > 0) {
      // First load seeding: record existing chat messages so they do not falsely notify on startup
      if (!hasSeededChatRef.current) {
        chatMessages.forEach((c) => prevChatRef.current.set(c.id, c));
        hasSeededChatRef.current = true;
      } else {
        const myUid = userProfile.uid;
        const myEmail = userProfile.email?.toLowerCase().trim();
        const myName = userProfile.name?.toLowerCase().trim();

        chatMessages.forEach((msg) => {
          const prev = prevChatRef.current.get(msg.id);

          if (!prev && !notifiedMsgIdsRef.current.has(msg.id)) {
            // Check if message is older than session start time (avoid retroactive spam)
            const msgTime = new Date(msg.createdAt || 0).getTime();
            const isRecent = msgTime > mountTimeRef.current - 10000 || (Date.now() - msgTime < 1000 * 60 * 3);

            // Is the current user the one who sent this message?
            const isSender = 
              msg.senderId === myUid || 
              (Boolean(myEmail) && msg.senderId?.toLowerCase() === myEmail) || 
              (Boolean(myName) && msg.senderName?.toLowerCase().trim() === myName && msg.senderRole === userProfile.role);

            if (!isSender && isRecent) {
              let shouldNotify = false;
              let targetLabel = msg.targetTitle || '';
              const senderLabel = msg.senderName || (msg.senderRole === 'admin' ? 'Lead Admin' : 'Team Member');
              let notificationTitle = '';
              let notificationBody = '';

              if (msg.targetType === 'work_entry') {
                const matchingEntry = entries.find((e) => e.id === msg.targetId);
                if (matchingEntry && !targetLabel) {
                  targetLabel = matchingEntry.company || (matchingEntry.taskText ? matchingEntry.taskText.slice(0, 30) : 'Work Entry');
                }
                if (!targetLabel) targetLabel = 'Work Entry';

                const entryOwnerUid = matchingEntry?.userId || msg.targetUserId;
                const entryOwnerName = (matchingEntry?.userName || msg.targetUserName)?.toLowerCase().trim();
                const isMyEntry = 
                  entryOwnerUid === myUid || 
                  (Boolean(myEmail) && entryOwnerUid?.toLowerCase() === myEmail) || 
                  (Boolean(entryOwnerName) && entryOwnerName === myName);

                if (isAdmin) {
                  // Admin is notified whenever a team member posts a message on a work entry
                  if (msg.senderRole === 'member' || !isSender) {
                    shouldNotify = true;
                    notificationTitle = `💬 New Message from ${senderLabel}`;
                    notificationBody = `Work Entry (${targetLabel}): "${msg.message.slice(0, 75)}${msg.message.length > 75 ? '...' : ''}"`;
                  }
                } else {
                  // Team member is notified whenever admin (or lead) adds feedback on THEIR work entry
                  if (isMyEntry) {
                    shouldNotify = true;
                    notificationTitle = `💬 Feedback from ${senderLabel} (${msg.senderRole === 'admin' ? 'Admin' : 'Lead'})`;
                    notificationBody = `On your log (${targetLabel}): "${msg.message.slice(0, 75)}${msg.message.length > 75 ? '...' : ''}"`;
                  }
                }
              } else if (msg.targetType === 'assigned_task') {
                const matchingTask = tasks.find((t) => t.id === msg.targetId);
                if (matchingTask && !targetLabel) {
                  targetLabel = matchingTask.title ? `"${matchingTask.title.slice(0, 30)}"` : 'Task';
                }
                if (!targetLabel) targetLabel = 'Assigned Task';

                const assigneeUid = matchingTask?.assignedTo || msg.targetUserId;
                const assigneeName = (matchingTask?.assignedToName || msg.targetUserName)?.toLowerCase().trim();
                const assignorUid = matchingTask?.assignedBy;

                const isMyTask = 
                  assigneeUid === myUid || 
                  (Boolean(myEmail) && assigneeUid?.toLowerCase() === myEmail) || 
                  (Boolean(assigneeName) && assigneeName === myName);

                const didIAssignIt = 
                  assignorUid === myUid || 
                  (Boolean(myEmail) && assignorUid?.toLowerCase() === myEmail);

                if (isAdmin) {
                  // Admin is notified whenever a member posts on a task or asks questions
                  if (msg.senderRole === 'member' || didIAssignIt || isMyTask) {
                    shouldNotify = true;
                    notificationTitle = `💬 Task Discussion from ${senderLabel}`;
                    notificationBody = `Task (${targetLabel}): "${msg.message.slice(0, 75)}${msg.message.length > 75 ? '...' : ''}"`;
                  }
                } else {
                  // Team member is notified whenever admin posts on their assigned task
                  if (isMyTask) {
                    shouldNotify = true;
                    notificationTitle = `💬 Task Message from ${senderLabel} (${msg.senderRole === 'admin' ? 'Admin' : 'Lead'})`;
                    notificationBody = `Task (${targetLabel}): "${msg.message.slice(0, 75)}${msg.message.length > 75 ? '...' : ''}"`;
                  }
                }
              }

              if (shouldNotify) {
                notifiedMsgIdsRef.current.add(msg.id);

                sendChromeNotification({
                  title: notificationTitle,
                  body: notificationBody,
                  tag: `chat-msg-${msg.id}`,
                  soundEnabled,
                });

                addToast({
                  type: 'chat',
                  title: notificationTitle,
                  message: notificationBody,
                });
              }
            }
          }
        });
      }
    }

    // Update chat map
    const newChatMap = new Map<string, ItemChatMessage>();
    chatMessages.forEach((c) => newChatMap.set(c.id, c));
    prevChatRef.current = newChatMap;

  }, [tasks, handovers, entries, chatMessages, userProfile, addToast]);

  return {
    permission,
    isSupported: isNotificationSupported(),
    toasts,
    promptEnableNotifications,
    sendTestNotification,
    dismissToast,
  };
}
