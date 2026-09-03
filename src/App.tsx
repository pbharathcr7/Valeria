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
  limit,
  sanitizePayload,
  loadCognitivePatterns,
  saveCognitivePatterns,
  loadWeeklyDigest,
  saveWeeklyDigest,
  loadMemoryCapsules,
  authFetch
} from './lib/firebase';
import { sendWeeklyDigestEmail } from './lib/gmailService';
import { LandingPage } from './components/LandingPage';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ReflectionsPage } from './pages/ReflectionsPage';
import { MemoryCapsulesPage } from './pages/MemoryCapsulesPage';
import { CapsuleDetailPage } from './pages/CapsuleDetailPage';
import { CapsuleGuestView } from './components/CapsuleGuestView';
import { CognitiveMemoryPage } from './pages/CognitiveMemoryPage';
import { WeeklyInsightsPage } from './pages/WeeklyInsightsPage';
import { CalendarPlacesPage } from './pages/CalendarPlacesPage';
import { SettingsPage } from './pages/SettingsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { LivePage } from './pages/LivePage';
import { MemoriesPage } from './pages/MemoriesPage';
import { ReflectionCanvas } from './components/ReflectionCanvas';
import { 
  UserProfile, 
  JournalEntry, 
  ReflectionIntent, 
  CognitivePatternAnalysis, 
  WeeklyDigest,
  MemoryCapsule
} from './types';
import { User } from 'firebase/auth';
import { getWeekBounds, formatLocalDate } from './lib/dateUtils';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Journal Entries state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState<boolean>(false);
  const [isSavingEntry, setIsSavingEntry] = useState<boolean>(false);

  // Memory Capsules state for accurate Life Archive & Life Gallery counts
  const [capsules, setCapsules] = useState<MemoryCapsule[]>([]);

  // Selected capsule detail ID for routing
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string | null>(null);

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
    const validPaths = ['/dashboard', '/reflections', '/capsules', '/memories', '/memory', '/weekly-insights', '/live', '/documents', '/calendar', '/settings'];
    if (validPaths.includes(path)) {
      return path;
    }
    return '/dashboard';
  };

  const [currentPath, setCurrentPath] = useState<string>(getInitialPath());
  const [livePreselectedDocId, setLivePreselectedDocId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('docId');
  });

  // Memory Capsule direct share link parameters (via ?capsuleInvite=... or ?capsuleId=...)
  const [sharedCapsuleInvite, setSharedCapsuleInvite] = useState<{ capsuleId?: string; inviteCode?: string } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('capsuleInvite') || params.get('invite');
    const capId = params.get('capsuleId') || params.get('capsuleOwner');
    if (invite || capId) {
      return { 
        inviteCode: invite || undefined, 
        capsuleId: capId || undefined 
      };
    }
    return null;
  });

  // Listen to browser forward/backward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const validPaths = ['/dashboard', '/reflections', '/capsules', '/memories', '/memory', '/weekly-insights', '/live', '/documents', '/calendar', '/settings'];
      const params = new URLSearchParams(window.location.search);
      const docId = params.get('docId');
      if (docId) {
        setLivePreselectedDocId(docId);
      }
      const invite = params.get('capsuleInvite') || params.get('invite');
      const capId = params.get('capsuleId') || params.get('capsuleOwner');
      if (invite || capId) {
        setSharedCapsuleInvite({ 
          inviteCode: invite || undefined, 
          capsuleId: capId || undefined 
        });
      } else {
        setSharedCapsuleInvite(null);
      }
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
    const basePath = path.split('?')[0];
    const queryPart = path.includes('?') ? path.split('?')[1] : '';
    const params = new URLSearchParams(queryPart);
    const docId = params.get('docId');
    if (docId) {
      setLivePreselectedDocId(docId);
    } else if (basePath !== '/live') {
      setLivePreselectedDocId(null);
    }

    setCurrentPath(basePath);
    if (window.location.pathname + window.location.search !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper for current week ID calculation using local calendar time
  const getCurrentWeekInfo = () => {
    return getWeekBounds();
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
        loadUserCapsules(user.uid);
      } else {
        setCurrentUser(null);
        setEntries([]);
        setCapsules([]);
        setCognitivePatterns(null);
        setWeeklyDigest(null);
        setIsReflecting(false);
        setActiveEntry(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch memory capsules to keep sidebar badge counts accurately synchronized
  const loadUserCapsules = async (userId: string) => {
    try {
      const loaded = await loadMemoryCapsules(userId);
      setCapsules(loaded);
    } catch (err) {
      console.error('Error fetching capsules for sidebar counts:', err);
    }
  };

  // Fetch entries from Firestore isolated by user UID
  const loadUserEntries = async (userId: string) => {
    setEntriesLoading(true);
    try {
      const { db } = await initFirebase();
      const entriesRef = collection(db, 'users', userId, 'interactions');
      const q = query(entriesRef, orderBy('createdAt', 'desc'), limit(10));
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

      // Completely overwrite the document in Firestore to ensure deleted fields (e.g. location, deleted photos) are deleted
      await setDoc(entryRef, cleanData);

      // Keep activeEntry in sync with cleanData
      setActiveEntry(prev => (prev && prev.id === entryToSave.id ? (cleanData as JournalEntry) : prev));

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
      const resp = await authFetch('/api/reflect/patterns', {
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
      const entryLocalDate = formatLocalDate(new Date(e.createdAt));
      return entryLocalDate >= weekInfo.weekStart && entryLocalDate <= weekInfo.weekEnd;
    });

    const targetEntries = currentWeekEntries.length > 0 ? currentWeekEntries : entries.slice(0, 7);
    if (targetEntries.length === 0 || isGeneratingDigest) return;

    setIsGeneratingDigest(true);
    setDigestError(null);

    try {
      const resp = await authFetch('/api/reflect/weekly-digest', {
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
      const mindShareData = data.mindShare || data.content?.mindShare;
      const newDigest: WeeklyDigest = {
        id: weekInfo.weekId,
        userId: currentUser?.uid || '',
        weekStart: data.weekStart || weekInfo.weekStart,
        weekEnd: data.weekEnd || weekInfo.weekEnd,
        generatedAt: new Date().toISOString(),
        sentAt: weeklyDigest?.sentAt || null,
        recipientEmail: weeklyDigest?.recipientEmail || null,
        entryCount: data.entryCount || targetEntries.length,
        content: {
          ...data.content,
          mindShare: mindShareData
        },
        weeklyInsights: {
          mindShare: mindShareData
        },
        mindShare: mindShareData
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

    // 1. Direct dispatch via authenticated Google OAuth Token & Gmail REST API
    const result = await sendWeeklyDigestEmail(
      weeklyDigest,
      targetEmail,
      currentUser?.displayName || undefined
    );

    const updatedDigest: WeeklyDigest = {
      ...weeklyDigest,
      sentAt: new Date().toISOString(),
      recipientEmail: targetEmail
    };

    setWeeklyDigest(updatedDigest);

    if (currentUser?.uid) {
      await saveWeeklyDigest(currentUser.uid, weeklyDigest.id, updatedDigest);
    }

    return { success: true, messageId: result.messageId };
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
          <p className="text-xs font-mono text-stone-500">Initializing Valeria &amp; Auth...</p>
        </div>
      </div>
    );
  }

  // 2. Collaborative Memory Capsule Shared / Guest View
  if (sharedCapsuleInvite) {
    return (
      <CapsuleGuestView
        capsuleId={sharedCapsuleInvite.capsuleId}
        inviteCode={sharedCapsuleInvite.inviteCode}
        currentUser={currentUser}
        onBackToApp={() => {
          setSharedCapsuleInvite(null);
          window.history.pushState({}, '', '/dashboard');
          setCurrentPath('/dashboard');
        }}
        onSignIn={handleSignIn}
      />
    );
  }

  // 3. Unauthenticated User -> Landing Page
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

  // Life Archive & Life Gallery counts accurately calculated from Memory Capsules
  const capsulesCount = capsules.length;
  const galleryPhotosCount = capsules.reduce((acc, c) => acc + (c.photoCount || (c.coverPhoto ? 1 : 0)), 0);

  // 4. Authenticated Multi-Page Application Shell
  return (
    <AppLayout
      currentPath={currentPath}
      onNavigate={(path) => {
        if (path === '/capsules') {
          setSelectedCapsuleId(null);
        }
        if (currentUser?.uid && (path === '/capsules' || path === '/memories' || path === '/dashboard')) {
          loadUserCapsules(currentUser.uid);
        }
        handleNavigate(path);
      }}
      user={currentUser}
      onSignOut={handleSignOut}
      onNewReflection={handleStartNewReflection}
      reflectionCount={entries.length}
      capsulesCount={capsulesCount}
      galleryPhotosCount={galleryPhotosCount}
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

          case '/capsules':
            if (selectedCapsuleId) {
              return (
                <CapsuleDetailPage
                  capsuleId={selectedCapsuleId}
                  userId={currentUser.uid}
                  userName={currentUser.displayName || 'Me'}
                  onBack={() => setSelectedCapsuleId(null)}
                  onOpenCapsuleLink={(inviteCode) => {
                    setSharedCapsuleInvite({ inviteCode });
                  }}
                />
              );
            }
            return (
              <MemoryCapsulesPage
                userId={currentUser.uid}
                userName={currentUser.displayName || 'Me'}
                selectedCapsuleId={selectedCapsuleId}
                onSelectCapsuleId={(id) => setSelectedCapsuleId(id)}
                onOpenCapsuleLink={(inviteCode) => {
                  setSharedCapsuleInvite({ inviteCode });
                }}
              />
            );

          case '/memories':
            return (
              <MemoriesPage
                userId={currentUser.uid}
                userName={currentUser.displayName || 'Me'}
                onOpenCapsule={(capsuleId) => {
                  setSelectedCapsuleId(capsuleId);
                  handleNavigate('/capsules');
                }}
                onNavigate={handleNavigate}
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

          case '/live':
            return (
              <LivePage
                user={currentUser}
                entries={entries}
                cognitivePatterns={cognitivePatterns}
                initialDocId={livePreselectedDocId}
                onNavigate={handleNavigate}
                onNewReflection={handleStartNewReflection}
                onRefreshEntries={() => currentUser && loadUserEntries(currentUser.uid)}
              />
            );

          case '/documents':
            return (
              <DocumentsPage
                user={currentUser}
                onNewReflection={handleStartNewReflection}
                onNavigate={handleNavigate}
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
