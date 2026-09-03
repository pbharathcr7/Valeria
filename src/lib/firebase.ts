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
  collectionGroup,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { MemoryCapsule, CapsuleContributor } from '../types';

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

// -------------------------------------------------------------
// Document Intelligence Firestore Helpers
// -------------------------------------------------------------

export async function loadUserDocuments(userId: string) {
  try {
    const { db } = await initFirebase();
    const docsRef = collection(db, 'users', userId, 'documents');
    const q = query(docsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const documents: any[] = [];
    snapshot.forEach((snap) => {
      documents.push({ ...snap.data(), id: snap.id });
    });
    return documents;
  } catch (error) {
    console.error('Failed to load documents from Firestore:', error);
    return [];
  }
}

export async function saveDocument(userId: string, documentId: string, docData: any) {
  const { db } = await initFirebase();
  const docRef = doc(db, 'users', userId, 'documents', documentId);
  const sanitized = sanitizePayload({
    ...docData,
    id: documentId,
    userId,
    updatedAt: new Date().toISOString()
  });
  await setDoc(docRef, sanitized, { merge: true });
  return sanitized;
}

export async function saveDocumentChunks(userId: string, documentId: string, chunks: any[]) {
  const { db } = await initFirebase();
  for (const chunk of chunks) {
    const chunkId = `chunk_${chunk.chunkIndex}`;
    const chunkRef = doc(db, 'users', userId, 'documents', documentId, 'chunks', chunkId);
    const sanitized = sanitizePayload({
      ...chunk,
      id: chunkId,
      documentId,
      userId,
      createdAt: chunk.createdAt || new Date().toISOString()
    });
    await setDoc(chunkRef, sanitized, { merge: true });
  }
}

export async function loadDocumentChunks(userId: string, documentId: string) {
  try {
    const { db } = await initFirebase();
    const chunksRef = collection(db, 'users', userId, 'documents', documentId, 'chunks');
    const snapshot = await getDocs(chunksRef);
    const chunks: any[] = [];
    snapshot.forEach((snap) => {
      chunks.push({ ...snap.data(), id: snap.id });
    });
    return chunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
  } catch (error) {
    console.error('Failed to load document chunks from Firestore:', error);
    return [];
  }
}

export async function loadDocumentConversations(userId: string, documentId: string) {
  try {
    const { db } = await initFirebase();
    const convRef = collection(db, 'users', userId, 'documents', documentId, 'conversations');
    const q = query(convRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    const messages: any[] = [];
    snapshot.forEach((snap) => {
      messages.push({ ...snap.data(), id: snap.id });
    });
    return messages;
  } catch (error) {
    console.error('Failed to load document conversations from Firestore:', error);
    return [];
  }
}

export async function saveDocumentChatMessage(userId: string, documentId: string, messageData: any) {
  const { db } = await initFirebase();
  const messageId = messageData.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const messageRef = doc(db, 'users', userId, 'documents', documentId, 'conversations', messageId);
  const sanitized = sanitizePayload({
    ...messageData,
    id: messageId,
    timestamp: messageData.timestamp || new Date().toISOString()
  });
  await setDoc(messageRef, sanitized, { merge: true });
  return sanitized;
}

export async function deleteUserDocument(userId: string, documentId: string) {
  const { db } = await initFirebase();
  
  // 1. Delete all subcollection chunk documents
  try {
    const chunksRef = collection(db, 'users', userId, 'documents', documentId, 'chunks');
    const chunksSnap = await getDocs(chunksRef);
    const deletePromises = chunksSnap.docs.map((cSnap) => deleteDoc(cSnap.ref));
    await Promise.all(deletePromises);
  } catch (chunkErr) {
    console.warn('Error deleting document chunks:', chunkErr);
  }

  // 2. Delete all conversation history documents
  try {
    const convRef = collection(db, 'users', userId, 'documents', documentId, 'conversations');
    const convSnap = await getDocs(convRef);
    const deleteConvPromises = convSnap.docs.map((cSnap) => deleteDoc(cSnap.ref));
    await Promise.all(deleteConvPromises);
  } catch (convErr) {
    console.warn('Error deleting document conversations:', convErr);
  }

  // 3. Delete parent document record
  const docRef = doc(db, 'users', userId, 'documents', documentId);
  await deleteDoc(docRef);
}

// -------------------------------------------------------------
// First-Class Memory Capsules & Contributors Firestore Operations
// -------------------------------------------------------------

export async function saveMemoryCapsule(capsuleData: any) {
  const { db } = await initFirebase();
  const capsuleId = capsuleData.id || `capsule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const capsuleRef = doc(db, 'memoryCapsules', capsuleId);
  const ownerId = capsuleData.ownerId;
  const initialParticipants = Array.from(
    new Set([...(Array.isArray(capsuleData.participantIds) ? capsuleData.participantIds : []), ownerId].filter(Boolean))
  );
  const initialContribUids = Array.from(
    new Set([...(Array.isArray(capsuleData.contributorUids) ? capsuleData.contributorUids : []), ownerId].filter(Boolean))
  );

  const sanitized = sanitizePayload({
    ...capsuleData,
    id: capsuleId,
    participantIds: initialParticipants,
    contributorUids: initialContribUids,
    updatedAt: new Date().toISOString()
  });
  await setDoc(capsuleRef, sanitized, { merge: true });

  // Maintain fast, direct public lookup index for shareable invite codes
  if (sanitized.inviteCode) {
    try {
      const inviteRefUpper = doc(db, 'capsuleInvites', sanitized.inviteCode.toUpperCase());
      await setDoc(inviteRefUpper, {
        capsuleId: sanitized.id,
        inviteCode: sanitized.inviteCode.toUpperCase(),
        ownerId: sanitized.ownerId,
        createdAt: sanitized.createdAt || new Date().toISOString()
      }, { merge: true });
    } catch (inviteErr) {
      console.warn('Could not index capsule invite code:', inviteErr);
    }
  }

  return sanitized;
}

export async function loadMemoryCapsules(currentUserId?: string): Promise<MemoryCapsule[]> {
  try {
    // RBAC check: Unauthenticated or empty userId must never list archives
    if (!currentUserId || !currentUserId.trim()) {
      return [];
    }

    const { db } = await initFirebase();
    const capsulesRef = collection(db, 'memoryCapsules');
    const targetUid = currentUserId.trim();
    const capsuleMap = new Map<string, MemoryCapsule>();

    // 1. Fetch archives created by the user
    try {
      const qOwner = query(capsulesRef, where('ownerId', '==', targetUid));
      const ownerSnap = await getDocs(qOwner);
      ownerSnap.forEach((snap) => {
        const data = snap.data() as Record<string, any>;
        capsuleMap.set(snap.id, { ...data, id: snap.id } as MemoryCapsule);
      });
    } catch (ownerErr) {
      console.warn('Error querying owner capsules:', ownerErr);
    }

    // 2. Fetch archives where user is explicitly in participantIds
    try {
      const qPart = query(capsulesRef, where('participantIds', 'array-contains', targetUid));
      const partSnap = await getDocs(qPart);
      partSnap.forEach((snap) => {
        const data = snap.data() as Record<string, any>;
        capsuleMap.set(snap.id, { ...data, id: snap.id } as MemoryCapsule);
      });
    } catch {
      // Handled silently: participantIds populated when user accepts invite
    }

    // 3. Also discover any archives where the user contributed to the contributors subcollection
    const userContributedCapsuleIds = new Set<string>();
    try {
      const contribGroup = collectionGroup(db, 'contributors');
      const qContribs = query(contribGroup, where('userId', '==', targetUid));
      const contribSnap = await getDocs(qContribs);
      
      const missingCapsuleIds: string[] = [];
      contribSnap.forEach((docSnap) => {
        // Parent path: memoryCapsules/{capsuleId}/contributors/{contribId}
        const parentCapRef = docSnap.ref.parent.parent;
        if (parentCapRef && parentCapRef.id) {
          userContributedCapsuleIds.add(parentCapRef.id);
          if (!capsuleMap.has(parentCapRef.id)) {
            missingCapsuleIds.push(parentCapRef.id);
          }
        }
      });

      // Fetch missing parent capsules
      if (missingCapsuleIds.length > 0) {
        const fetchMissingPromises = missingCapsuleIds.map(async (capId) => {
          try {
            const capDocRef = doc(db, 'memoryCapsules', capId);
            const capSnap = await getDoc(capDocRef);
            if (capSnap.exists()) {
              const data = capSnap.data() as Record<string, any>;
              capsuleMap.set(capSnap.id, { ...data, id: capSnap.id } as MemoryCapsule);
            }
          } catch (e) {
            console.warn(`Could not fetch contributed capsule ${capId}:`, e);
          }
        });
        await Promise.all(fetchMissingPromises);
      }
    } catch {
      // Handled silently to avoid console noise if no contributors exist
    }

    // 5. Strictly filter to guarantee zero cross-user leakage
    const rawCapsules = Array.from(capsuleMap.values()).filter((cap) => {
      const isOwner = cap.ownerId === targetUid;
      const isParticipant = Array.isArray(cap.participantIds) && cap.participantIds.includes(targetUid);
      const isContributor = Array.isArray(cap.contributorUids) && cap.contributorUids.includes(targetUid);
      const hasContributed = userContributedCapsuleIds.has(cap.id);
      return isOwner || isParticipant || isContributor || hasContributed;
    });

    // Sort descending by eventDate (when memory happened) or createdAt
    rawCapsules.sort((a, b) => {
      const timeA = new Date(a.eventDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.eventDate || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // Concurrently enrich capsules with exact real-time contributor count & photo count
    const enrichedCapsules = await Promise.all(
      rawCapsules.map(async (cap) => {
        // Opportunistically ensure capsule invite is indexed
        if (cap.inviteCode) {
          try {
            const inviteRef = doc(db, 'capsuleInvites', cap.inviteCode.toUpperCase());
            setDoc(inviteRef, {
              capsuleId: cap.id,
              inviteCode: cap.inviteCode.toUpperCase(),
              ownerId: cap.ownerId,
              createdAt: cap.createdAt || new Date().toISOString()
            }, { merge: true }).catch(() => {});
          } catch {}
        }

        try {
          const contribs = await loadCapsuleContributors(cap.id);
          const trueContributorCount = contribs.length;
          const contribPhotosCount = contribs.filter(c => Boolean(c.photoUrl)).length;
          const truePhotoCount = contribPhotosCount + (cap.coverPhoto ? 1 : 0);

          return {
            ...cap,
            contributorCount: trueContributorCount,
            photoCount: truePhotoCount
          };
        } catch (enrichErr) {
          console.warn(`Could not enrich counts for capsule ${cap.id}:`, enrichErr);
          const fallbackPhotos = cap.coverPhoto ? 1 : 0;
          return {
            ...cap,
            contributorCount: cap.contributorCount ?? 0,
            photoCount: cap.photoCount ?? fallbackPhotos
          };
        }
      })
    );

    return enrichedCapsules;
  } catch (error) {
    console.error('Failed to load Memory Capsules from Firestore:', error);
    return [];
  }
}

export async function loadMemoryCapsuleById(capsuleId: string): Promise<MemoryCapsule | null> {
  try {
    const { db } = await initFirebase();
    const capsuleRef = doc(db, 'memoryCapsules', capsuleId);
    const snap = await getDoc(capsuleRef);
    if (snap.exists()) {
      const data = snap.data() as Record<string, any>;
      const cap = { ...data, id: snap.id } as MemoryCapsule;
      try {
        const contribs = await loadCapsuleContributors(capsuleId);
        const trueContribCount = contribs.length;
        const contribPhotos = contribs.filter(c => Boolean(c.photoUrl)).length;
        const truePhotoCount = contribPhotos + (cap.coverPhoto ? 1 : 0);
        return {
          ...cap,
          contributorCount: trueContribCount,
          photoCount: truePhotoCount
        };
      } catch {
        return cap;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load Memory Capsule by ID:', error);
    return null;
  }
}

export async function loadMemoryCapsuleByInviteCode(inviteCode: string): Promise<MemoryCapsule | null> {
  if (!inviteCode || !inviteCode.trim()) return null;
  const rawCode = inviteCode.trim();
  const normalizedCode = rawCode.toUpperCase();

  try {
    const { db } = await initFirebase();

    // 1. Fast direct document lookup in capsuleInvites index (Allowed by rules for any guest/user)
    try {
      const inviteRefUpper = doc(db, 'capsuleInvites', normalizedCode);
      const inviteSnapUpper = await getDoc(inviteRefUpper);
      if (inviteSnapUpper.exists()) {
        const inviteData = inviteSnapUpper.data() as Record<string, any>;
        if (inviteData?.capsuleId) {
          const cap = await loadMemoryCapsuleById(inviteData.capsuleId);
          if (cap) return cap;
        }
      }

      if (rawCode !== normalizedCode) {
        const inviteRefRaw = doc(db, 'capsuleInvites', rawCode);
        const inviteSnapRaw = await getDoc(inviteRefRaw);
        if (inviteSnapRaw.exists()) {
          const inviteData = inviteSnapRaw.data() as Record<string, any>;
          if (inviteData?.capsuleId) {
            const cap = await loadMemoryCapsuleById(inviteData.capsuleId);
            if (cap) return cap;
          }
        }
      }
    } catch (inviteLookupErr) {
      console.warn('Error reading capsuleInvites index:', inviteLookupErr);
    }

    // 2. Direct document read on memoryCapsules (in case the code itself is a capsule ID)
    const directDoc = await loadMemoryCapsuleById(rawCode);
    if (directDoc) return directDoc;

    // 3. Fallback query if authorized or indexed
    try {
      const capsulesRef = collection(db, 'memoryCapsules');
      const q = query(capsulesRef, where('inviteCode', '==', normalizedCode));
      const snapshot = await getDocs(q);

      let matchedDoc: MemoryCapsule | null = null;
      if (!snapshot.empty) {
        const snap = snapshot.docs[0];
        const data = snap.data() as Record<string, any>;
        matchedDoc = { ...data, id: snap.id } as MemoryCapsule;
      } else {
        const qRaw = query(capsulesRef, where('inviteCode', '==', rawCode));
        const snapRaw = await getDocs(qRaw);
        if (!snapRaw.empty) {
          const snap = snapRaw.docs[0];
          const data = snap.data() as Record<string, any>;
          matchedDoc = { ...data, id: snap.id } as MemoryCapsule;
        }
      }

      if (matchedDoc) {
        // Backfill capsuleInvites index for future fast lookups
        try {
          const inviteRefUpper = doc(db, 'capsuleInvites', normalizedCode);
          setDoc(inviteRefUpper, {
            capsuleId: matchedDoc.id,
            inviteCode: normalizedCode,
            ownerId: matchedDoc.ownerId,
            createdAt: matchedDoc.createdAt || new Date().toISOString()
          }, { merge: true }).catch(() => {});
        } catch {}

        try {
          const contribs = await loadCapsuleContributors(matchedDoc.id);
          const trueContribCount = contribs.length;
          const contribPhotos = contribs.filter(c => Boolean(c.photoUrl)).length;
          const truePhotoCount = contribPhotos + (matchedDoc.coverPhoto ? 1 : 0);
          return {
            ...matchedDoc,
            contributorCount: trueContribCount,
            photoCount: truePhotoCount
          };
        } catch {
          return matchedDoc;
        }
      }
    } catch (queryErr) {
      console.warn('Fallback query on memoryCapsules failed (likely RBAC restricted for unauthenticated guest):', queryErr);
    }

    return null;
  } catch (error) {
    console.error('Failed to load Memory Capsule by invite code:', error);
    return null;
  }
}

export async function deleteMemoryCapsule(capsuleId: string) {
  const { db } = await initFirebase();
  
  // 1. Fetch capsule to retrieve inviteCode for index cleanup
  let inviteCode: string | undefined;
  try {
    const capDocRef = doc(db, 'memoryCapsules', capsuleId);
    const snap = await getDoc(capDocRef);
    if (snap.exists()) {
      const data = snap.data();
      inviteCode = data?.inviteCode;
    }
  } catch (e) {
    console.warn('Could not read capsule before deletion:', e);
  }

  // 2. Delete all subcollection contributor documents
  try {
    const contribRef = collection(db, 'memoryCapsules', capsuleId, 'contributors');
    const contribSnap = await getDocs(contribRef);
    const deletePromises = contribSnap.docs.map((cSnap) => deleteDoc(cSnap.ref));
    await Promise.all(deletePromises);
  } catch (contribErr) {
    console.warn('Error deleting capsule contributors:', contribErr);
  }

  // 3. Delete invite code index if present
  if (inviteCode) {
    try {
      const inviteRef = doc(db, 'capsuleInvites', inviteCode.toUpperCase());
      await deleteDoc(inviteRef);
    } catch (invErr) {
      console.warn('Error deleting invite code lookup:', invErr);
    }
  }

  // 4. Delete parent capsule record
  const capsuleRef = doc(db, 'memoryCapsules', capsuleId);
  await deleteDoc(capsuleRef);
}

export async function loadCapsuleContributors(capsuleIdOrOwnerId: string, legacyReflectionId?: string): Promise<CapsuleContributor[]> {
  try {
    const { db } = await initFirebase();
    let contribRef;
    if (legacyReflectionId) {
      // Backward compatibility for legacy reflection subcollection
      contribRef = collection(db, 'users', capsuleIdOrOwnerId, 'interactions', legacyReflectionId, 'contributors');
    } else {
      // First-class Memory Capsule subcollection
      contribRef = collection(db, 'memoryCapsules', capsuleIdOrOwnerId, 'contributors');
    }
    const q = query(contribRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);

    const contributors: CapsuleContributor[] = [];
    snapshot.forEach((snap) => {
      const data = snap.data() as Record<string, any>;
      contributors.push({ ...data, id: snap.id } as CapsuleContributor);
    });
    return contributors;
  } catch (error) {
    console.error('Failed to load capsule contributors from Firestore:', error);
    return [];
  }
}

export async function saveCapsuleContribution(capsuleIdOrOwnerId: string, contributionOrReflectionId: any, maybeContrib?: any) {
  const { db } = await initFirebase();
  let contribRef;
  let contribution;
  let isFirstClass = false;
  let capsuleId = '';
  
  if (maybeContrib && typeof contributionOrReflectionId === 'string') {
    // Legacy: (ownerId, reflectionId, contribution)
    const ownerId = capsuleIdOrOwnerId;
    const reflectionId = contributionOrReflectionId;
    contribution = maybeContrib;
    const contribId = contribution.id || contribution.userId;
    contribRef = doc(db, 'users', ownerId, 'interactions', reflectionId, 'contributors', contribId);
  } else {
    // First-class: (capsuleId, contribution)
    capsuleId = capsuleIdOrOwnerId;
    isFirstClass = true;
    contribution = contributionOrReflectionId;
    const contribId = contribution.id || contribution.userId;
    contribRef = doc(db, 'memoryCapsules', capsuleId, 'contributors', contribId);
  }

  const sanitized = sanitizePayload({
    ...contribution,
    id: contribution.id || contribution.userId,
    updatedAt: new Date().toISOString()
  });
  await setDoc(contribRef, sanitized, { merge: true });

  // For first-class capsule, ensure the contributor's userId is added to capsule participantIds/contributorUids
  if (isFirstClass && capsuleId && contribution.userId) {
    try {
      const capsuleRef = doc(db, 'memoryCapsules', capsuleId);
      const capSnap = await getDoc(capsuleRef);
      if (capSnap.exists()) {
        const capData = capSnap.data() as Record<string, any>;
        const currentParticipants: string[] = Array.isArray(capData.participantIds)
          ? capData.participantIds
          : (capData.ownerId ? [capData.ownerId] : []);
        const currentContribs: string[] = Array.isArray(capData.contributorUids)
          ? capData.contributorUids
          : (capData.ownerId ? [capData.ownerId] : []);
        
        if (!currentParticipants.includes(contribution.userId) || !currentContribs.includes(contribution.userId)) {
          const updatedParticipants = Array.from(new Set([...currentParticipants, contribution.userId]));
          const updatedContribs = Array.from(new Set([...currentContribs, contribution.userId]));
          await updateDoc(capsuleRef, {
            participantIds: updatedParticipants,
            contributorUids: updatedContribs,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (participantErr) {
      console.warn('Could not update capsule participant list:', participantErr);
    }
  }

  return sanitized;
}

export async function deleteCapsuleContribution(capsuleIdOrOwnerId: string, contributorIdOrReflectionId: string, maybeContribId?: string) {
  const { db } = await initFirebase();
  let contribRef;
  if (maybeContribId) {
    // Legacy: (ownerId, reflectionId, contributorId)
    contribRef = doc(db, 'users', capsuleIdOrOwnerId, 'interactions', contributorIdOrReflectionId, 'contributors', maybeContribId);
  } else {
    // First-class: (capsuleId, contributorId)
    contribRef = doc(db, 'memoryCapsules', capsuleIdOrOwnerId, 'contributors', contributorIdOrReflectionId);
  }
  await deleteDoc(contribRef);
}

// Legacy alias
export const loadCapsuleEntry = loadMemoryCapsuleById;

/**
 * Retrieves the current authenticated user's Firebase ID token.
 * Forces token refresh if expired.
 */
export async function getAuthToken(forceRefresh = false): Promise<string | null> {
  const { auth } = await initFirebase();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.warn('Failed to retrieve Firebase ID token:', err);
    return null;
  }
}

/**
 * Authenticated fetch helper that injects the Firebase Authorization Bearer token.
 */
export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, {
    ...init,
    headers
  });
}

export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  deleteDoc, 
  serverTimestamp 
};
