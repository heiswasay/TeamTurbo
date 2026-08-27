import { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, AssignedTask, Handover, WorkEntry } from '../types';
import { 
  sendChromeNotification, 
  getNotificationPermissionStatus,
  requestNotificationPermission,
  NotificationPermissionStatus,
  isNotificationSupported
} from '../lib/notificationService';

export interface InAppToast {
  id: string;
  type: 'task' | 'handover' | 'rework' | 'review' | 'log' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

interface UseChromeNotificationsProps {
  userProfile: UserProfile | null;
  tasks: AssignedTask[];
  handovers: Handover[];
  entries: WorkEntry[];
}

export function useChromeNotifications({
  userProfile,
  tasks,
  handovers,
  entries,
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
      if (tasks.length > 0 || handovers.length > 0 || entries.length > 0) {
        tasks.forEach((t) => prevTasksRef.current.set(t.id, t));
        handovers.forEach((h) => prevHandoversRef.current.set(h.id, h));
        entries.forEach((e) => prevEntriesRef.current.set(e.id, e));
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
          if (isAdmin && prev.status !== task.status && task.assignedBy === userProfile.uid) {
            const title = `✅ Task Marked ${task.status.toUpperCase()}`;
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
        // Existing entry review updated
        if (entry.userId === userProfile.uid && prev.review !== entry.review) {
          if (entry.review === 'needs_rework' && reworkEnabled) {
            const title = '⚠️ Work Entry Needs Rework';
            const body = `${entry.reviewedByName || 'Admin'} requested rework: "${entry.remarks || entry.taskText.slice(0, 40)}"`;

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
            const body = `${entry.reviewedByName || 'Admin'} approved "${entry.taskText.slice(0, 40)}"`;

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
          }
        }
      }
    });

    // Update entries map
    const newEntriesMap = new Map<string, WorkEntry>();
    entries.forEach((e) => newEntriesMap.set(e.id, e));
    prevEntriesRef.current = newEntriesMap;

  }, [tasks, handovers, entries, userProfile, addToast]);

  return {
    permission,
    isSupported: isNotificationSupported(),
    toasts,
    promptEnableNotifications,
    sendTestNotification,
    dismissToast,
  };
}
