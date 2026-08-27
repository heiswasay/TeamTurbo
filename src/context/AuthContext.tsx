import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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
  serverTimestamp 
} from 'firebase/firestore';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, db, finalConfig } from '../lib/firebase';
import { UserProfile, INITIAL_DEMO_USERS, UserRole } from '../types';

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

  // Listen to Auth State
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        // Listen to Firestore profile updates in real-time
        const userRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setUserProfile({ ...data, uid: user.uid });
            if (data.appearance) {
              setThemeState(data.appearance);
            }
          } else {
            // Document doesn't exist yet, check if matching email in demo users or create standard
            const demoMatch = INITIAL_DEMO_USERS.find(
              (u) => u.email.toLowerCase() === user.email?.toLowerCase()
            );

            const initialProfile: UserProfile = {
              uid: user.uid,
              name: demoMatch?.name || user.displayName || user.email?.split('@')[0] || 'Team Member',
              email: user.email || '',
              role: demoMatch?.role || (user.email === 'wasay@teamturbo.com' || user.email === 'wasey351@gmail.com' ? 'admin' : 'member'),
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
        }, (err) => {
          console.error("Firestore user profile snapshot error:", err);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
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
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          appearance: newTheme,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Failed to persist theme preference:', err);
      }
    }
  };

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUserProfile(null);
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    if (!currentUser || !currentUser.email) {
      throw new Error('No user is currently logged in.');
    }
    const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
    await reauthenticateWithCredential(currentUser, credential);
    await fbUpdatePassword(currentUser, newPass);

    // If mustChangePassword was true, update to false in Firestore
    if (userProfile?.mustChangePassword) {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        mustChangePassword: false,
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) => prev ? { ...prev, mustChangePassword: false } : null);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await fbSendPasswordResetEmail(auth, email.trim());
  };

  const updateProfileDetails = async (details: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('Not authenticated');
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      ...details,
      updatedAt: serverTimestamp(),
    });
    setUserProfile((prev) => prev ? { ...prev, ...details } : null);
  };

  // Admin user creation using a secondary Firebase app instance
  const createTeamMember = async (memberData: {
    email: string;
    name: string;
    role: UserRole;
    designation: string;
    shiftStart: string;
    shiftEnd: string;
    temporaryPassword?: string;
  }) => {
    const tempPass = memberData.temporaryPassword || 'TempPass123!';
    const secondaryAppName = `admin-create-user-${Date.now()}`;
    const secondaryApp = initializeApp(finalConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        memberData.email.trim(),
        tempPass
      );
      const newUid = userCredential.user.uid;

      const newUserDoc: UserProfile = {
        uid: newUid,
        name: memberData.name.trim(),
        email: memberData.email.trim().toLowerCase(),
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

      await setDoc(doc(db, 'users', newUid), newUserDoc);
      return { uid: newUid };
    } finally {
      await deleteApp(secondaryApp).catch(() => {});
    }
  };

  // Helper to pre-seed starter accounts into Firestore if empty
  const seedInitialUsersIfEmpty = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        for (const demo of INITIAL_DEMO_USERS) {
          // create a placeholder document keyed by email sanitized or placeholder
          // Note: Real uid will be attached on first Firebase Auth login
        }
      }
    } catch (e) {
      console.warn('Seed check ignored:', e);
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
