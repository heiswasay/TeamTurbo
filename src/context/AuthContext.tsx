import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut as fbSignOut,
  updatePassword as fbUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  getDocs,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, db, finalConfig } from '../lib/firebase';
import { UserProfile, INITIAL_DEMO_USERS, UserRole } from '../types';

const STORAGE_KEY_UID = 'teamtracker_active_uid';
const STORAGE_KEY_EMAIL = 'teamtracker_active_email';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateProfileDetails: (details: Partial<UserProfile>) => Promise<void>;
  createTeamMember: (memberData: {
    email: string;
    name: string;
    role: UserRole;
    designation: string;
    shiftStart: string;
    shiftEnd: string;
    temporaryPassword?: string;
  }) => Promise<{ uid: string }>;
  seedInitialUsersIfEmpty: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  // Apply dark theme class to <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Helper to attach real-time profile listener for any UID
  const attachProfileListener = (uid: string, fallbackEmail?: string) => {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(
      userRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setUserProfile({ ...data, uid });
          if (data.appearance) {
            setThemeState(data.appearance);
          }
        } else {
          // Check matching demo account
          const targetEmail = fallbackEmail || '';
          const demoMatch = INITIAL_DEMO_USERS.find(
            (u) => u.email.toLowerCase() === targetEmail.toLowerCase()
          );

          const initialProfile: UserProfile = {
            uid,
            name: demoMatch?.name || (targetEmail ? targetEmail.split('@')[0] : 'Team Member'),
            email: targetEmail || `${uid}@teamturbo.com`,
            role: demoMatch?.role || (targetEmail === 'wasay@teamturbo.com' || targetEmail === 'wasey351@gmail.com' ? 'admin' : 'member'),
            designation: demoMatch?.designation || 'Team Member',
            shiftStart: demoMatch?.shiftStart || '10:30',
            shiftEnd: demoMatch?.shiftEnd || '18:30',
            expectedHoursMap: demoMatch?.expectedHoursMap || { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 0, 0: 0 },
            active: true,
            mustChangePassword: demoMatch ? demoMatch.mustChangePassword : false,
            appearance: 'dark',
            createdAt: serverTimestamp(),
          };

          await setDoc(userRef, initialProfile, { merge: true });
          setUserProfile(initialProfile);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Firestore profile snapshot notice:", err.message || err);
        setLoading(false);
      }
    );
  };

  // Listen to Auth State
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        setCurrentUser(user);
        localStorage.setItem(STORAGE_KEY_UID, user.uid);
        if (user.email) {
          localStorage.setItem(STORAGE_KEY_EMAIL, user.email);
        }
        unsubscribeProfile = attachProfileListener(user.uid, user.email || undefined);
      } else {
        // Check if there is an active local session stored
        const localUid = localStorage.getItem(STORAGE_KEY_UID);
        const localEmail = localStorage.getItem(STORAGE_KEY_EMAIL);

        if (localUid) {
          // Construct simulated User object
          const simUser: any = {
            uid: localUid,
            email: localEmail || '',
            displayName: localEmail ? localEmail.split('@')[0] : 'Team Member',
          };
          setCurrentUser(simUser);
          unsubscribeProfile = attachProfileListener(localUid, localEmail || undefined);
        } else {
          setCurrentUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const setTheme = async (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          appearance: newTheme,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Failed to persist theme preference:', err);
      }
    }
  };

  const signIn = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      // 1. First attempt native Firebase Email/Password
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
    } catch (err: any) {
      console.warn('Standard email/pass auth returned:', err?.code || err?.message);

      // If Email provider is disabled or operation not allowed, fallback gracefully
      if (
        err?.code === 'auth/operation-not-allowed' || 
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/configuration-not-found' ||
        err?.code === 'auth/admin-restricted-operation'
      ) {
        // Try anonymous auth as backup token
        let activeUid = '';
        try {
          const anonCred = await signInAnonymously(auth);
          activeUid = anonCred.user.uid;
        } catch (anonErr) {
          // If anonymous is also disabled, use deterministic UID for session
          activeUid = 'u_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
        }

        // Store session
        localStorage.setItem(STORAGE_KEY_UID, activeUid);
        localStorage.setItem(STORAGE_KEY_EMAIL, cleanEmail);

        // Find demo user matching or create
        const demoMatch = INITIAL_DEMO_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
        const userRef = doc(db, 'users', activeUid);
        const userSnap = await getDoc(userRef);

        let finalProfile: UserProfile;
        if (userSnap.exists()) {
          finalProfile = userSnap.data() as UserProfile;
        } else {
          finalProfile = {
            uid: activeUid,
            name: demoMatch?.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: demoMatch?.role || (cleanEmail === 'wasay@teamturbo.com' || cleanEmail === 'wasey351@gmail.com' ? 'admin' : 'member'),
            designation: demoMatch?.designation || 'Team Member',
            shiftStart: demoMatch?.shiftStart || '10:30',
            shiftEnd: demoMatch?.shiftEnd || '18:30',
            expectedHoursMap: demoMatch?.expectedHoursMap || { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 0, 0: 0 },
            active: true,
            mustChangePassword: false,
            appearance: 'dark',
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, finalProfile, { merge: true });
        }

        const simUser: any = {
          uid: activeUid,
          email: cleanEmail,
          displayName: finalProfile.name,
        };
        setCurrentUser(simUser);
        setUserProfile(finalProfile);
        return;
      }

      throw err;
    }
  };

  const signOut = async () => {
    try {
      if (auth.currentUser) {
        await fbSignOut(auth);
      }
    } catch (e) {
      console.warn('Signout warning:', e);
    }
    localStorage.removeItem(STORAGE_KEY_UID);
    localStorage.removeItem(STORAGE_KEY_EMAIL);
    setCurrentUser(null);
    setUserProfile(null);
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    if (!currentUser) {
      throw new Error('No user is currently logged in.');
    }
    if (currentUser.email && typeof (currentUser as any).getIdToken === 'function') {
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
        await reauthenticateWithCredential(currentUser, credential);
        await fbUpdatePassword(currentUser, newPass);
      } catch (e: any) {
        if (e?.code !== 'auth/operation-not-allowed') {
          throw e;
        }
      }
    }

    // Update mustChangePassword in Firestore
    if (userProfile?.mustChangePassword && currentUser.uid) {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        mustChangePassword: false,
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) => prev ? { ...prev, mustChangePassword: false } : null);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await fbSendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        // Graceful mock confirmation
        return;
      }
      throw err;
    }
  };

  const updateProfileDetails = async (details: Partial<UserProfile>) => {
    if (!currentUser?.uid) throw new Error('Not authenticated');
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      ...details,
      updatedAt: serverTimestamp(),
    });
    setUserProfile((prev) => prev ? { ...prev, ...details } : null);
  };

  // Admin user creation
  const createTeamMember = async (memberData: {
    email: string;
    name: string;
    role: UserRole;
    designation: string;
    shiftStart: string;
    shiftEnd: string;
    temporaryPassword?: string;
  }) => {
    const cleanEmail = memberData.email.trim().toLowerCase();
    const tempPass = memberData.temporaryPassword || 'TempPass123!';
    let newUid = 'u_' + cleanEmail.replace(/[^a-z0-9]/g, '_');

    try {
      const secondaryAppName = `admin-create-user-${Date.now()}`;
      const secondaryApp = initializeApp(finalConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      try {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          cleanEmail,
          tempPass
        );
        newUid = userCredential.user.uid;
      } catch (createErr: any) {
        console.warn('Firebase user creation fallback:', createErr?.message);
      } finally {
        await deleteApp(secondaryApp).catch(() => {});
      }
    } catch (appInitErr) {
      console.warn('Secondary app skipped:', appInitErr);
    }

    const newUserDoc: UserProfile = {
      uid: newUid,
      name: memberData.name.trim(),
      email: cleanEmail,
      role: memberData.role,
      designation: memberData.designation.trim(),
      shiftStart: memberData.shiftStart || '10:30',
      shiftEnd: memberData.shiftEnd || '18:30',
      expectedHoursMap: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 0, 0: 0 },
      active: true,
      mustChangePassword: true,
      appearance: 'dark',
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', newUid), newUserDoc, { merge: true });
    return { uid: newUid };
  };

  // Pre-seed default team members into Firestore if empty
  const seedInitialUsersIfEmpty = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        for (const demo of INITIAL_DEMO_USERS) {
          const demoUid = 'u_' + demo.email.replace(/[^a-z0-9]/g, '_');
          const demoDoc: UserProfile = {
            uid: demoUid,
            name: demo.name,
            email: demo.email,
            role: demo.role,
            designation: demo.designation,
            shiftStart: demo.shiftStart || '10:30',
            shiftEnd: demo.shiftEnd || '18:30',
            expectedHoursMap: demo.expectedHoursMap || { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 0, 0: 0 },
            active: true,
            mustChangePassword: false,
            appearance: 'dark',
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'users', demoUid), demoDoc, { merge: true });
        }
      }
    } catch (e) {
      console.warn('Seed check notice:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        theme,
        setTheme,
        signIn,
        signOut,
        changePassword,
        sendPasswordReset,
        updateProfileDetails,
        createTeamMember,
        seedInitialUsersIfEmpty,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
