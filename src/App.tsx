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
  sanitizePayload,
  loadCognitivePatterns,
  saveCognitivePatterns,
  loadWeeklyDigest,
  saveWeeklyDigest
} from './lib/firebase';
import { LandingPage } from './components/LandingPage';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ReflectionsPage } from './pages/ReflectionsPage';
import { CognitiveMemoryPage } from './pages/CognitiveMemoryPage';
import { WeeklyInsightsPage } from './pages/WeeklyInsightsPage';
import { CalendarPlacesPage } from './pages/CalendarPlacesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReflectionCanvas } from './components/ReflectionCanvas';
import { 
  UserProfile, 
  JournalEntry, 
  ReflectionIntent, 
  CognitivePatternAnalysis, 
  WeeklyDigest 
} from './types';
import { User } from 'firebase/auth';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Journal Entries state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState<boolean>(false);
  const [isSavingEntry, setIsSavingEntry] = useState<boolean>(false);

  // Longitudinal Memory & Weekly Digest State
  const [cognitivePatterns, setCognitivePatterns] = useState<CognitivePatternAnalysis | null>(null);
  const [isSynthesizingPatterns, setIsSynthesizingPatterns] = useState<boolean>(false);
  const [patternError, setPatternError] = useState<string | null>(null);

  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigest | null>(null);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState<boolean>(false);
  const [digestError, setDigestError] = useState<string | null>(null);

  // Active reflection canvas state (overlays when reflecting)
  const [isReflecting, setIsReflecting] = useState<boolean>(false);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);

  // Multi-page navigation state
  const getInitialPath = (): string => {
    const path = window.location.pathname;
    const validPaths = ['/dashboard', '/reflections', '/memory', '/weekly-insights', '/calendar', '/settings'];
    if (validPaths.includes(path)) {
      return path;
    }
    return '/dashboard';
  };

  const [currentPath, setCurrentPath] = useState<string>(getInitialPath());

  // Listen to browser forward/backward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const validPaths = ['/dashboard', '/reflections', '/memory', '/weekly-insights', '/calendar', '/settings'];
      if (validPaths.includes(path)) {
        setCurrentPath(path);
      } else {
        setCurrentPath('/dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Safe navigation function updating state & history API
  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper for current week ID calculation
  const getCurrentWeekInfo = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStartStr = monday.toISOString().split('T')[0];
    const weekEndStr = sunday.toISOString().split('T')[0];

    // Compute ISO Week number
    const target = new Date(monday.valueOf());
    const dayNr = (monday.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const weekId = `${monday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    return { weekStart: weekStartStr, weekEnd: weekEndStr, weekId, monday, sunday };
  };

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
        loadPatternsAndDigest(user.uid);
      } else {
        setCurrentUser(null);
        setEntries([]);
        setCognitivePatterns(null);
        setWeeklyDigest(null);
        setIsReflecting(false);
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

  // Load cognitive patterns & current week digest from Firestore
  const loadPatternsAndDigest = async (userId: string) => {
    try {
      const patternsData = await loadCognitivePatterns(userId);
      if (patternsData) {
        setCognitivePatterns(patternsData as CognitivePatternAnalysis);
      }

      const weekInfo = getCurrentWeekInfo();
      const digestData = await loadWeeklyDigest(userId, weekInfo.weekId);
      if (digestData) {
        setWeeklyDigest(digestData as WeeklyDigest);
      }
    } catch (err) {
      console.error('Failed to load patterns or digest from Firestore:', err);
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
        setIsReflecting(false);
        setActiveEntry(null);
      }
    } catch (err: any) {
      console.error('Error deleting entry from Firestore:', err);
      throw err;
    }
  };

  // Synthesize Cognitive Patterns across reflections
  const handleSynthesizePatterns = async () => {
    if (entries.length === 0 || isSynthesizingPatterns) return;
    setIsSynthesizingPatterns(true);
    setPatternError(null);

    try {
      const resp = await fetch('/api/reflect/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries })
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || 'Could not analyze cognitive patterns.');
      }
      const data = await resp.json();
      
      const structured: CognitivePatternAnalysis = data.structuredPatterns || data.patterns || {
        analyzedAt: new Date().toISOString(),
        entryCount: entries.length,
        overview: 'Cognitive growth analysis across your recent reflection entries.',
        recurringGoals: [],
        recurringChallenges: [],
        strengthsObserved: [],
        growthTrend: data.insights || '',
        recommendedFocus: [],
        rawAnalysis: data.insights
      };

      setCognitivePatterns(structured);

      if (currentUser?.uid) {
        await saveCognitivePatterns(currentUser.uid, structured);
      }
    } catch (e: any) {
      console.error('Failed to generate insights:', e);
      setPatternError(e?.message || 'Failed to generate pattern insights. Please try again.');
    } finally {
      setIsSynthesizingPatterns(false);
    }
  };

  // Generate Weekly Reflection Digest
  const handleGenerateWeeklyDigest = async () => {
    const weekInfo = getCurrentWeekInfo();
    const currentWeekEntries = entries.filter(e => {
      if (!e.createdAt) return false;
      const entryDate = new Date(e.createdAt);
      return entryDate >= weekInfo.monday && entryDate <= weekInfo.sunday;
    });

    const targetEntries = currentWeekEntries.length > 0 ? currentWeekEntries : entries.slice(0, 7);
    if (targetEntries.length === 0 || isGeneratingDigest) return;

    setIsGeneratingDigest(true);
    setDigestError(null);

    try {
      const resp = await fetch('/api/reflect/weekly-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: targetEntries,
          weekStart: weekInfo.weekStart,
          weekEnd: weekInfo.weekEnd,
          cognitivePatterns: cognitivePatterns || undefined
        })
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || 'Could not generate weekly digest.');
      }

      const data = await resp.json();
      const newDigest: WeeklyDigest = {
        id: weekInfo.weekId,
        userId: currentUser?.uid || '',
        weekStart: data.weekStart || weekInfo.weekStart,
        weekEnd: data.weekEnd || weekInfo.weekEnd,
        generatedAt: new Date().toISOString(),
        sentAt: weeklyDigest?.sentAt || null,
        recipientEmail: weeklyDigest?.recipientEmail || null,
        entryCount: data.entryCount || targetEntries.length,
        content: data.content
      };

      setWeeklyDigest(newDigest);

      if (currentUser?.uid) {
        await saveWeeklyDigest(currentUser.uid, weekInfo.weekId, newDigest);
      }
    } catch (e: any) {
      console.error('Failed to generate weekly digest:', e);
      setDigestError(e?.message || 'Failed to synthesize weekly digest. Please try again.');
    } finally {
      setIsGeneratingDigest(false);
    }
  };

  // Send Digest Email via Gmail API route
  const handleSendDigestEmail = async (recipientEmail?: string) => {
    if (!weeklyDigest) throw new Error('No digest generated yet.');

    const targetEmail = recipientEmail || currentUser?.email;
    if (!targetEmail) throw new Error('No valid recipient email address.');

    const resp = await fetch('/api/reflect/send-digest-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        digest: weeklyDigest,
        recipientEmail: targetEmail,
        userDisplayName: currentUser?.displayName
      })
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to send digest email via Gmail API.');
    }

    const data = await resp.json();

    const updatedDigest: WeeklyDigest = {
      ...weeklyDigest,
      sentAt: new Date().toISOString(),
      recipientEmail: targetEmail
    };

    setWeeklyDigest(updatedDigest);

    if (currentUser?.uid) {
      await saveWeeklyDigest(currentUser.uid, weeklyDigest.id, updatedDigest);
    }

    return data;
  };

  // Reflection Canvas Handlers
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
    setIsReflecting(true);
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setIsReflecting(true);
  };

  const handleCloseCanvas = () => {
    setIsReflecting(false);
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

  // 3. Active Reflection Canvas Flow
  if (isReflecting) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 p-2 sm:p-6 flex items-center justify-center">
        <ReflectionCanvas
          key={activeEntry?.id || 'new_reflection'}
          initialEntry={activeEntry}
          userId={currentUser.uid}
          allEntries={entries}
          cognitivePatterns={cognitivePatterns}
          onSaveEntry={handleSaveEntry}
          onClose={handleCloseCanvas}
          onOpenEntryById={(entryId) => {
            const target = entries.find(e => e.id === entryId);
            if (target) {
              setActiveEntry(target);
            }
          }}
          isSaving={isSavingEntry}
        />
      </div>
    );
  }

  // 4. Authenticated Multi-Page Application Shell
  return (
    <AppLayout
      currentPath={currentPath}
      onNavigate={handleNavigate}
      user={currentUser}
      onSignOut={handleSignOut}
      onNewReflection={handleStartNewReflection}
      reflectionCount={entries.length}
    >
      {/* Route-Based Page Views */}
      {(() => {
        switch (currentPath) {
          case '/reflections':
            return (
              <ReflectionsPage
                entries={entries}
                onNewReflection={handleStartNewReflection}
                onSelectEntry={handleSelectEntry}
                onDeleteEntry={handleDeleteEntry}
                isLoading={entriesLoading}
              />
            );

          case '/memory':
            return (
              <CognitiveMemoryPage
                userId={currentUser.uid}
                entries={entries}
                patterns={cognitivePatterns}
                onSynthesizePatterns={handleSynthesizePatterns}
                isSynthesizing={isSynthesizingPatterns}
                error={patternError}
                onNewReflection={handleStartNewReflection}
              />
            );

          case '/weekly-insights':
            return (
              <WeeklyInsightsPage
                user={currentUser}
                entries={entries}
                weeklyDigest={weeklyDigest}
                cognitivePatterns={cognitivePatterns}
                onGenerateDigest={handleGenerateWeeklyDigest}
                isGenerating={isGeneratingDigest}
                error={digestError}
                onNewReflection={handleStartNewReflection}
                onSendDigestEmail={handleSendDigestEmail}
              />
            );

          case '/calendar':
            return (
              <CalendarPlacesPage
                entries={entries}
                onNewReflection={handleStartNewReflection}
                onSelectEntry={handleSelectEntry}
                onUpdateEntry={handleSaveEntry}
              />
            );

          case '/settings':
            return (
              <SettingsPage
                user={currentUser}
                onSignOut={handleSignOut}
              />
            );

          case '/dashboard':
          default:
            return (
              <DashboardPage
                user={currentUser}
                entries={entries}
                cognitivePatterns={cognitivePatterns}
                weeklyDigest={weeklyDigest}
                onNewReflection={handleStartNewReflection}
                onSelectEntry={handleSelectEntry}
                onDeleteEntry={handleDeleteEntry}
                onNavigate={handleNavigate}
              />
            );
        }
      })()}
    </AppLayout>
  );
}
