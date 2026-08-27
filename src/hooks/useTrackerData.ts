import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  WorkEntry, 
  AttendanceRecord, 
  AssignedTask, 
  Handover, 
  HandoverStatus,
  UserProfile, 
  CompanyTag, 
  ReviewStatus, 
  TaskStatus, 
  AssignedTaskStatus,
  DEFAULT_COMPANIES,
  INITIAL_DEMO_USERS
} from '../types';
import { getTodayDateString } from '../lib/dateUtils';

export function useTrackerData(currentUser: any, userProfile: UserProfile | null) {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [companies, setCompanies] = useState<CompanyTag[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = getTodayDateString();

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    if (!currentUser || !userProfile) {
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];

    try {
      // 1. Users collection
      const usersRef = collection(db, 'users');
      unsubs.push(
        onSnapshot(usersRef, (snap) => {
          if (!snap.empty) {
            const list: UserProfile[] = [];
            snap.forEach((d) => list.push(d.data() as UserProfile));
            setTeamMembers(list);
          } else {
            // Seed initial demo users if none
            setTeamMembers(INITIAL_DEMO_USERS);
          }
        }, (err) => {
          console.warn('Users listener fallback:', err);
          setTeamMembers(INITIAL_DEMO_USERS);
        })
      );

      // 2. Companies collection
      const companiesRef = collection(db, 'companies');
      unsubs.push(
        onSnapshot(companiesRef, (snap) => {
          if (!snap.empty) {
            const list: CompanyTag[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as CompanyTag));
            setCompanies(list);
          } else {
            setCompanies(DEFAULT_COMPANIES);
          }
        }, (err) => {
          console.warn('Companies listener fallback:', err);
          setCompanies(DEFAULT_COMPANIES);
        })
      );

      // 3. Work Entries
      const entriesRef = collection(db, 'work_entries');
      unsubs.push(
        onSnapshot(entriesRef, (snap) => {
          const list: WorkEntry[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() } as WorkEntry));
          setEntries(list);
          setLoading(false);
        }, (err) => {
          console.warn('Work entries listener error:', err);
          setLoading(false);
        })
      );

      // 4. Attendance
      const attendanceRef = collection(db, 'attendance');
      unsubs.push(
        onSnapshot(attendanceRef, (snap) => {
          const list: AttendanceRecord[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AttendanceRecord));
          setAttendanceRecords(list);
        }, (err) => {
          console.warn('Attendance listener error:', err);
        })
      );

      // 5. Assigned Tasks
      const tasksRef = collection(db, 'assigned_tasks');
      unsubs.push(
        onSnapshot(tasksRef, (snap) => {
          const list: AssignedTask[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AssignedTask));
          setTasks(list);
        }, (err) => {
          console.warn('Tasks listener error:', err);
        })
      );

      // 6. Handovers
      const handoversRef = collection(db, 'handovers');
      unsubs.push(
        onSnapshot(handoversRef, (snap) => {
          const list: Handover[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Handover));
          setHandovers(list);
        }, (err) => {
          console.warn('Handovers listener error:', err);
        })
      );
    } catch (err) {
      console.error('Error initiating Firestore subscriptions:', err);
      setLoading(false);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [currentUser, userProfile]);

  // Seed sample initial data if Firestore is fresh
  useEffect(() => {
    if (!currentUser || !userProfile || teamMembers.length === 0) return;

    const checkAndSeedData = async () => {
      try {
        const entriesSnap = await getDocs(collection(db, 'work_entries'));
        if (entriesSnap.empty) {
          // Seed a few sample realistic entries for yesterday and today
          const sample1: WorkEntry = {
            id: 'demo-entry-1',
            userId: userProfile.uid,
            userName: userProfile.name,
            company: 'DMS Agency',
            taskText: 'Implemented customer churn prediction dashboard with real-time cohort tracking and daily KPI exports.',
            timeSpent: '3h 30m',
            status: 'completed',
            review: 'pending',
            date: todayStr,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'work_entries', sample1.id), sample1);
        }

        const compSnap = await getDocs(collection(db, 'companies'));
        if (compSnap.empty) {
          for (let i = 0; i < DEFAULT_COMPANIES.length; i++) {
            const compName = DEFAULT_COMPANIES[i];
            const cId = `comp_${i + 1}`;
            const companyObj: CompanyTag = {
              id: cId,
              name: compName,
              archived: false,
            };
            await setDoc(doc(db, 'companies', cId), companyObj);
          }
        }
      } catch (err) {
        console.warn('Silent initial data seeding note:', err);
      }
    };

    checkAndSeedData();
  }, [currentUser, userProfile, teamMembers]);

  // --- CRUD ACTIONS ---

  // Work Entries
  const addWorkEntry = async (entry: Omit<WorkEntry, 'id' | 'createdAt'>) => {
    const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newEntry: WorkEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'work_entries', id), newEntry);
  };

  const updateWorkEntry = async (entryId: string, updates: Partial<WorkEntry>) => {
    const nowIso = new Date().toISOString();
    await updateDoc(doc(db, 'work_entries', entryId), {
      ...updates,
      updatedAt: nowIso,
    });

    // If this work entry is linked to an assigned task, synchronize the task status
    const existingEntry = entries.find((e) => e.id === entryId);
    const assignedTaskId = updates.assignedTaskId || existingEntry?.assignedTaskId;
    if (assignedTaskId && updates.status) {
      const taskStatusMap: Record<TaskStatus, AssignedTaskStatus> = {
        completed: 'done',
        in_progress: 'in_progress',
        pending: 'open',
      };
      const matchingTaskStatus = taskStatusMap[updates.status];
      if (matchingTaskStatus) {
        try {
          await updateDoc(doc(db, 'assigned_tasks', assignedTaskId), {
            status: matchingTaskStatus,
            completedAt: matchingTaskStatus === 'done' ? nowIso : null,
            updatedAt: nowIso,
          });
        } catch (err) {
          console.warn('Could not sync assigned task status:', err);
        }
      }
    }
  };

  const deleteWorkEntry = async (entryId: string) => {
    await deleteDoc(doc(db, 'work_entries', entryId));
  };

  // Review status & remarks (Admin inline)
  const updateEntryReview = async (entryId: string, review: ReviewStatus, remarks?: string) => {
    const updates: Partial<WorkEntry> = {
      review,
      reviewedAt: new Date().toISOString(),
      reviewedBy: userProfile?.name || 'Admin',
    };
    if (remarks !== undefined) {
      updates.remarks = remarks;
    }
    await updateDoc(doc(db, 'work_entries', entryId), updates);
  };

  // Attendance Clock
  const startClock = async () => {
    if (!userProfile) return;
    const recId = `${userProfile.uid}_${todayStr}`;
    const existing = attendanceRecords.find((r) => r.id === recId || (r.userId === userProfile.uid && r.date === todayStr));
    const nowIso = new Date().toISOString();

    const newSession = {
      loginAt: nowIso,
      durationMinutes: 0,
    };

    if (existing) {
      const updatedSessions = [...(existing.sessions || []), newSession];
      await updateDoc(doc(db, 'attendance', existing.id), {
        status: 'active',
        sessions: updatedSessions,
        updatedAt: nowIso,
      });
    } else {
      const newRec: AttendanceRecord = {
        id: recId,
        userId: userProfile.uid,
        userName: userProfile.name,
        date: todayStr,
        status: 'active',
        sessions: [newSession],
        totalMinutes: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await setDoc(doc(db, 'attendance', recId), newRec);
    }
  };

  const stopClock = async () => {
    if (!userProfile) return;
    const recId = `${userProfile.uid}_${todayStr}`;
    const existing = attendanceRecords.find((r) => r.id === recId || (r.userId === userProfile.uid && r.date === todayStr));
    if (!existing || existing.status !== 'active') return;

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const sessions = [...(existing.sessions || [])];
    const lastSession = sessions[sessions.length - 1];

    if (lastSession && !lastSession.logoffAt) {
      lastSession.logoffAt = nowIso;
      const startMs = new Date(lastSession.loginAt).getTime();
      const dur = Math.max(1, Math.round((nowMs - startMs) / 60000));
      lastSession.durationMinutes = dur;
    }

    const totalMin = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    await updateDoc(doc(db, 'attendance', existing.id), {
      status: 'closed',
      sessions,
      totalMinutes: totalMin,
      updatedAt: nowIso,
    });
  };

  // Assigned Tasks (Automatically creates member's work log with pending status)
  const assignTask = async (task: Omit<AssignedTask, 'id' | 'createdAt'>) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const workEntryId = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newTask: AssignedTask = {
      ...task,
      id: taskId,
      workEntryId,
      createdAt: nowIso,
    };
    await setDoc(doc(db, 'assigned_tasks', taskId), newTask);

    // Automatically create the assignee's work log with pending status
    const targetMember = teamMembers.find((m) => m.uid === task.assignedTo);
    const assignedMemberName = task.assignedToName || targetMember?.name || 'Team Member';
    const entryDate = task.dueDate || todayStr;
    const taskCompany = task.company || (companies && companies.length > 0 ? companies[0].name : DEFAULT_COMPANIES[0]);

    const formattedTaskText = task.description?.trim()
      ? `${task.title.trim()} — ${task.description.trim()}`
      : task.title.trim();

    const newWorkEntry: WorkEntry = {
      id: workEntryId,
      userId: task.assignedTo,
      userName: assignedMemberName,
      date: entryDate,
      company: taskCompany,
      taskText: formattedTaskText,
      timeSpent: '0m',
      status: 'pending',
      review: 'pending',
      remarks: `Assigned by ${task.assignedByName || userProfile?.name || 'Admin'} (${task.priority.toUpperCase()} priority)`,
      assignedTaskId: taskId,
      createdAt: nowIso,
    };

    await setDoc(doc(db, 'work_entries', workEntryId), newWorkEntry);
  };

  const updateTaskStatus = async (taskId: string, status: AssignedTaskStatus) => {
    const nowIso = new Date().toISOString();
    await updateDoc(doc(db, 'assigned_tasks', taskId), {
      status,
      completedAt: status === 'done' ? nowIso : null,
      updatedAt: nowIso,
    });

    // Synchronize the linked work entry status
    const task = tasks.find((t) => t.id === taskId);
    const linkedWorkEntry = entries.find((e) => e.assignedTaskId === taskId || (task?.workEntryId && e.id === task.workEntryId));
    if (linkedWorkEntry) {
      const entryStatusMap: Record<AssignedTaskStatus, TaskStatus> = {
        done: 'completed',
        in_progress: 'in_progress',
        open: 'pending',
      };
      const matchingEntryStatus = entryStatusMap[status];
      if (matchingEntryStatus && linkedWorkEntry.status !== matchingEntryStatus) {
        try {
          await updateDoc(doc(db, 'work_entries', linkedWorkEntry.id), {
            status: matchingEntryStatus,
            updatedAt: nowIso,
          });
        } catch (err) {
          console.warn('Could not sync work entry status:', err);
        }
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'assigned_tasks', taskId));
    // Clean up auto-created work entry if it is still pending
    const linkedEntry = entries.find((e) => e.assignedTaskId === taskId);
    if (linkedEntry) {
      try {
        await deleteDoc(doc(db, 'work_entries', linkedEntry.id));
      } catch (err) {
        console.warn('Could not delete linked work entry:', err);
      }
    }
  };

  // Handovers
  const createHandover = async (handover: Omit<Handover, 'id' | 'createdAt'>) => {
    const id = `ho_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newHo: Handover = {
      ...handover,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'handovers', id), newHo);
    return id;
  };

  const acknowledgeHandover = async (handoverId: string) => {
    await updateDoc(doc(db, 'handovers', handoverId), {
      status: 'accepted',
      acknowledgedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const updateHandoverStatus = async (handoverId: string, status: HandoverStatus) => {
    const updates: any = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === 'accepted') {
      updates.acknowledgedAt = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }
    await updateDoc(doc(db, 'handovers', handoverId), updates);
  };

  const deleteHandover = async (handoverId: string) => {
    await deleteDoc(doc(db, 'handovers', handoverId));
  };

  // Companies
  const addCompany = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const comp: CompanyTag = { id, name: trimmed, archived: false };
    await setDoc(doc(db, 'companies', id), comp);
    return id;
  };

  const toggleArchiveCompany = async (id: string, archived: boolean) => {
    await updateDoc(doc(db, 'companies', id), { archived });
  };

  const deleteCompany = async (id: string) => {
    await deleteDoc(doc(db, 'companies', id));
  };

  // User updates & deletion by admin
  const updateUserByAdmin = async (uid: string, updates: Partial<UserProfile>) => {
    await updateDoc(doc(db, 'users', uid), updates);
  };

  const deleteUserByAdmin = async (uid: string) => {
    await deleteDoc(doc(db, 'users', uid));
  };

  return {
    loading,
    entries,
    attendanceRecords,
    tasks,
    handovers,
    companies,
    teamMembers,
    // Actions
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
    addCompany,
    toggleArchiveCompany,
    deleteCompany,
    updateUserByAdmin,
    deleteUserByAdmin,
  };
}
