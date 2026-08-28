import React, { useState, useEffect } from 'react';
import { 
  initFirebase, 
  signInWithGoogle, 
  signOutUser, 
  subscribeToAuth, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy,
  sanitizePayload
} from './lib/firebase';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ReflectionCanvas } from './components/ReflectionCanvas';
import { UserProfile, JournalEntry, ReflectionIntent } from './types';
import { User } from 'firebase/auth';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Journal Entries state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState<boolean>(false);
  const [isSavingEntry, setIsSavingEntry] = useState<boolean>(false);

  // View state: 'dashboard' | 'reflection'
  const [view, setView] = useState<'dashboard' | 'reflection'>('dashboard');
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user: User | null) => {
      if (user) {
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL,
          createdAt: new Date().toISOString()
        };
        setCurrentUser(userProfile);
        loadUserEntries(user.uid);
      } else {
        setCurrentUser(null);
        setEntries([]);
        setView('dashboard');
        setActiveEntry(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch entries from Firestore isolated by user UID
  const loadUserEntries = async (userId: string) => {
    setEntriesLoading(true);
    try {
      const { db } = await initFirebase();
      // Secure path: /users/{userId}/interactions
      const entriesRef = collection(db, 'users', userId, 'interactions');
      const q = query(entriesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const loaded: JournalEntry[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as JournalEntry;
        loaded.push({ ...data, id: docSnap.id });
      });

      setEntries(loaded);
    } catch (err: any) {
      console.error('Error fetching reflections from Firestore:', err);
    } finally {
      setEntriesLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setAuthError(err?.message || 'Failed to authenticate with Google.');
      setAuthLoading(false);
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // Save / Update Entry to user-isolated Firestore collection
  const handleSaveEntry = async (entryToSave: JournalEntry) => {
    if (!currentUser) return;
    setIsSavingEntry(true);

    try {
      const { db } = await initFirebase();
      const entryRef = doc(db, 'users', currentUser.uid, 'interactions', entryToSave.id);
      
      // Strict Undefined-Stripping before passing to Firestore
      const cleanData = sanitizePayload({
        ...entryToSave,
        userId: currentUser.uid,
        updatedAt: new Date().toISOString()
      });

      await setDoc(entryRef, cleanData, { merge: true });

      // Update local state smoothly
      setEntries(prev => {
        const existingIdx = prev.findIndex(e => e.id === entryToSave.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = cleanData as JournalEntry;
          return updated;
        } else {
          return [cleanData as JournalEntry, ...prev];
        }
      });
    } catch (err: any) {
      console.error('Error saving to Firestore:', err);
      throw err;
    } finally {
      setIsSavingEntry(false);
    }
  };

  // Delete Entry from user-isolated Firestore collection
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser) return;
    try {
      const { db } = await initFirebase();
      const entryRef = doc(db, 'users', currentUser.uid, 'interactions', entryId);
      await deleteDoc(entryRef);

      // Update local state immediately
      setEntries(prev => prev.filter(e => e.id !== entryId));
      if (activeEntry?.id === entryId) {
        setView('dashboard');
        setActiveEntry(null);
      }
    } catch (err: any) {
      console.error('Error deleting entry from Firestore:', err);
      throw err;
    }
  };

  // Navigation handlers
  const handleStartNewReflection = (intent: ReflectionIntent = 'deep_reflection') => {
    const newId = 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const newEntry: JournalEntry = {
      id: newId,
      userId: currentUser?.uid || '',
      title: 'New Reflection',
      intent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      tags: []
    };
    setActiveEntry(newEntry);
    setView('reflection');
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setView('reflection');
  };

  const handleCloseCanvas = () => {
    setView('dashboard');
    setActiveEntry(null);
    if (currentUser) {
      loadUserEntries(currentUser.uid);
    }
  };

  // 1. Initial Loading Spinner
  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-stone-500">Initializing MindMirror &amp; Auth...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated User -> Landing Page
  if (!currentUser) {
    return (
      <LandingPage 
        onSignIn={handleSignIn} 
        isLoading={authLoading} 
        error={authError} 
      />
    );
  }

  // 3. Authenticated User -> Either Dashboard or Reflection Canvas
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {view === 'dashboard' ? (
        <Dashboard
          user={currentUser}
          entries={entries}
          onNewReflection={handleStartNewReflection}
          onSelectEntry={handleSelectEntry}
          onDeleteEntry={handleDeleteEntry}
          onSignOut={handleSignOut}
          isLoading={entriesLoading}
        />
      ) : (
        <div className="p-2 sm:p-6 min-h-screen flex items-center justify-center">
          <ReflectionCanvas
            initialEntry={activeEntry}
            userId={currentUser.uid}
            onSaveEntry={handleSaveEntry}
            onClose={handleCloseCanvas}
            isSaving={isSavingEntry}
          />
        </div>
      )}
    </div>
  );
}
