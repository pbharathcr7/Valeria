import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User,
  Auth 
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Clean helper to sanitize undefined fields before sending to Firestore
export function sanitizePayload<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Timestamp)) {
        clean[key] = sanitizePayload(value);
      } else if (Array.isArray(value)) {
        clean[key] = value.map(item => (item !== null && typeof item === 'object') ? sanitizePayload(item) : item);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as T;
}

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export async function initFirebase() {
  if (!firebaseApp) {
    let config: any = null;
    try {
      const resp = await fetch('/firebase-applet-config.json');
      if (resp.ok) {
        config = await resp.json();
      }
    } catch (e) {
      console.warn('Could not load /firebase-applet-config.json via fetch, using fallback', e);
    }

    if (!config) {
      config = {
        projectId: "personal-gemini-journal-506618",
        appId: "1:978767694381:web:7599f67e8dda0ea56b06a4",
        apiKey: "AIzaSyAHNw4cOzIsPVWPcn5p6GC955xFK3jI63U",
        authDomain: "personal-gemini-journal-506618.firebaseapp.com",
        firestoreDatabaseId: "ai-studio-2ad65511-36cc-4070-9cbc-e5db32ce2901",
        storageBucket: "personal-gemini-journal-506618.firebasestorage.app",
        messagingSenderId: "978767694381",
      };
    }

    firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
    auth = getAuth(firebaseApp);
    
    // Initialize Firestore with specific databaseId if provided
    if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
      db = getFirestore(firebaseApp, config.firestoreDatabaseId);
    } else {
      db = getFirestore(firebaseApp);
    }

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  }

  return { app: firebaseApp, auth: auth!, db: db!, googleProvider: googleProvider! };
}

export async function signInWithGoogle() {
  const { auth, googleProvider } = await initFirebase();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function signOutUser() {
  const { auth } = await initFirebase();
  await firebaseSignOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  let unsubscribe = () => {};
  initFirebase().then(({ auth }) => {
    unsubscribe = onAuthStateChanged(auth, callback);
  });
  return () => unsubscribe();
}

export async function saveCognitivePatterns(userId: string, patterns: any) {
  const { db } = await initFirebase();
  const patternRef = doc(db, 'users', userId, 'patterns', 'latest');
  const sanitized = sanitizePayload({
    ...patterns,
    userId,
    updatedAt: new Date().toISOString()
  });
  await setDoc(patternRef, sanitized, { merge: true });
  return sanitized;
}

export async function loadCognitivePatterns(userId: string) {
  try {
    const { db } = await initFirebase();
    const patternRef = doc(db, 'users', userId, 'patterns', 'latest');
    const snap = await getDoc(patternRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error('Failed to load cognitive patterns from Firestore:', error);
    return null;
  }
}

export async function saveWeeklyDigest(userId: string, weekId: string, digestData: any) {
  const { db } = await initFirebase();
  const digestRef = doc(db, 'users', userId, 'weeklyDigests', weekId);
  const sanitized = sanitizePayload({
    ...digestData,
    id: weekId,
    userId,
    updatedAt: new Date().toISOString()
  });
  await setDoc(digestRef, sanitized, { merge: true });
  return sanitized;
}

export async function loadWeeklyDigest(userId: string, weekId: string) {
  try {
    const { db } = await initFirebase();
    const digestRef = doc(db, 'users', userId, 'weeklyDigests', weekId);
    const snap = await getDoc(digestRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error('Failed to load weekly digest from Firestore:', error);
    return null;
  }
}

export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  serverTimestamp 
};
