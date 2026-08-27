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
import { 
  UserProfile, 
  INITIAL_DEMO_USERS, 
  DEFAULT_USER_CREDENTIALS,
  UserRole 
} from '../types';

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
  adminChangeUserPassword: (targetUid: string, newPass: string, requireMustChange?: boolean) => Promise<void>;
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
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamtracker_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  // Apply dark / light theme class to <html>
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('teamtracker_theme', theme);
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
    const cleanPass = pass.trim();

    if (!cleanEmail) {
      throw new Error('Please enter your work email address.');
    }
    if (!cleanPass) {
      throw new Error('Please enter your password.');
    }

    // Check if user exists in Firestore
    let existingUserDoc: UserProfile | null = null;
    const defaultUid = 'u_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
    let userDocRef = doc(db, 'users', defaultUid);

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        existingUserDoc = snap.data() as UserProfile;
      } else {
        const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          existingUserDoc = qSnap.docs[0].data() as UserProfile;
          userDocRef = doc(db, 'users', existingUserDoc.uid);
        }
      }
    } catch (fetchErr) {
      console.warn('User fetch check:', fetchErr);
    }

    // Determine the expected password for this account
    const expectedPassword = existingUserDoc?.password 
      || DEFAULT_USER_CREDENTIALS[cleanEmail] 
      || 'TeamTurbo123!';

    // Validate password match
    let isPasswordCorrect = (cleanPass === expectedPassword);

    try {
      // 1. First attempt native Firebase Email/Password if available
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      isPasswordCorrect = true;
    } catch (err: any) {
      console.warn('Native email/pass returned:', err?.code || err?.message);

      // If Firebase Auth rejected because wrong password and it didn't match our stored password:
      if (err?.code === 'auth/wrong-password' && !isPasswordCorrect) {
        throw new Error('Incorrect password. Please verify your credentials.');
      }

      // Check if password matches our stored/designated password
      if (!isPasswordCorrect) {
        throw new Error('Incorrect password. Please verify your credentials or contact administrator.');
      }

      // If password matches and Firebase Auth is in sandbox or provider is restricted, establish verified session
      const activeUid = existingUserDoc?.uid || defaultUid;

      // Store local session
      localStorage.setItem(STORAGE_KEY_UID, activeUid);
      localStorage.setItem(STORAGE_KEY_EMAIL, cleanEmail);

      // Find demo user matching or create
      const demoMatch = INITIAL_DEMO_USERS.find((u) => u.email.toLowerCase() === cleanEmail);

      let finalProfile: UserProfile;
      if (existingUserDoc) {
        finalProfile = { ...existingUserDoc, uid: activeUid };
        // Sync password in doc if missing
        if (!existingUserDoc.password) {
          await updateDoc(userDocRef, { password: cleanPass, updatedAt: serverTimestamp() }).catch(() => {});
        }
      } else {
        finalProfile = {
          uid: activeUid,
          name: demoMatch?.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          password: cleanPass,
          role: demoMatch?.role || (cleanEmail === 'wasay@teamturbo.com' || cleanEmail === 'wasey351@gmail.com' ? 'admin' : 'member'),
          designation: demoMatch?.designation || 'Team Member',
          shiftStart: demoMatch?.shiftStart || '10:30',
          shiftEnd: demoMatch?.shiftEnd || '18:30',
          expectedHoursMap: demoMatch?.expectedHoursMap || { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 0: 0 },
          active: true,
          mustChangePassword: false,
          appearance: 'dark',
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, finalProfile, { merge: true });
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
    const cleanCurrent = currentPass.trim();
    const cleanNew = newPass.trim();

    if (cleanNew.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    // Verify current password against stored profile
    const userRef = doc(db, 'users', currentUser.uid);
    let expectedCurrent = userProfile?.password;
    if (!expectedCurrent && currentUser.email) {
      expectedCurrent = DEFAULT_USER_CREDENTIALS[currentUser.email.toLowerCase()] || 'TeamTurbo123!';
    }

    if (expectedCurrent && cleanCurrent !== expectedCurrent) {
      throw new Error('The current password you entered is incorrect.');
    }

    if (currentUser.email && typeof (currentUser as any).getIdToken === 'function') {
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, cleanCurrent);
        await reauthenticateWithCredential(currentUser, credential);
        await fbUpdatePassword(currentUser, cleanNew);
      } catch (e: any) {
        if (e?.code !== 'auth/operation-not-allowed') {
          console.warn('Native password update note:', e?.message);
        }
      }
    }

    // Update password & mustChangePassword in Firestore
    await updateDoc(userRef, {
      password: cleanNew,
      mustChangePassword: false,
      updatedAt: serverTimestamp(),
    });
    setUserProfile((prev) => prev ? { ...prev, password: cleanNew, mustChangePassword: false } : null);
  };

  // Admin can change password of any user
  const adminChangeUserPassword = async (targetUid: string, newPass: string, requireMustChange: boolean = false) => {
    if (!currentUser) {
      throw new Error('Authentication required.');
    }
    const cleanNew = newPass.trim();
    if (cleanNew.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const targetRef = doc(db, 'users', targetUid);
    await updateDoc(targetRef, {
      password: cleanNew,
      mustChangePassword: !!requireMustChange,
      updatedAt: serverTimestamp(),
    });

    if (currentUser.uid === targetUid) {
      setUserProfile((prev) => prev ? { ...prev, password: cleanNew, mustChangePassword: !!requireMustChange } : null);
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
    const tempPass = memberData.temporaryPassword || 'TeamTurbo123!';
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
      password: tempPass,
      role: memberData.role,
      designation: memberData.designation.trim(),
      shiftStart: memberData.shiftStart || '10:30',
      shiftEnd: memberData.shiftEnd || '18:30',
      expectedHoursMap: { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 0: 0 },
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
            password: demo.password,
            role: demo.role,
            designation: demo.designation,
            shiftStart: demo.shiftStart || '10:30',
            shiftEnd: demo.shiftEnd || '18:30',
            expectedHoursMap: demo.expectedHoursMap || { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 0: 0 },
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
        adminChangeUserPassword,
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
