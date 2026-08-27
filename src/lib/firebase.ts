import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

// Default configuration from environment or workspace config
let appConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// If missing in Vite env, fallback to firebase-applet-config.json
try {
  // @ts-ignore
  import('../../firebase-applet-config.json').then((conf) => {
    if (!appConfig.apiKey && conf.default) {
      appConfig = { ...conf.default };
    }
  }).catch(() => {});
} catch (e) {
  // ignore
}

// Fallback direct values from current project setup
const fallbackConfig = {
  projectId: "project-14910662-becb-4369-b51",
  appId: "1:8700855894:web:5800e389e3f9c10d2f9df7",
  apiKey: "AIzaSyAVt97wULIDrw4eKo6MQLF52T1lmh0z0zs",
  authDomain: "project-14910662-becb-4369-b51.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-31784605-8c10-46d9-8da8-96f8c21aa2ef",
  storageBucket: "project-14910662-becb-4369-b51.firebasestorage.app",
  messagingSenderId: "8700855894",
};

const finalConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
};

const app = getApps().length === 0 ? initializeApp(finalConfig) : getApp();

export const auth = getAuth(app);
// Ensure persistence in browser
setPersistence(auth, browserLocalPersistence).catch(() => {});

const dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || fallbackConfig.firestoreDatabaseId;

export const db = dbId && dbId !== '(default)'
  ? getFirestore(app, dbId)
  : getFirestore(app);

export { finalConfig };
