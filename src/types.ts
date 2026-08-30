export type ReflectionIntent = 'deep_reflection' | 'brainstorm' | 'summary' | 'action_plan' | 'cognitive_restructuring' | 'gratitude';

export type DetectedActionType = 'calendar' | 'maps';

export interface CalendarAction {
  id: string;
  type: 'calendar';
  title: string;
  date: string; // YYYY-MM-DD or readable date string
  time?: string; // e.g. "3:00 PM" or "15:00"
  duration?: string; // e.g. "30 mins", "1 hour"
  description?: string;
  location?: string;
  status?: 'pending' | 'created';
  googleEventId?: string;
  googleEventLink?: string;
}

export interface MapsAction {
  id: string;
  type: 'maps';
  placeName: string;
  query?: string;
}

export type DetectedAction = CalendarAction | MapsAction;

export interface MemoryReference {
  reflectionId: string;
  title: string;
  date: string;
  excerpt: string;
  reason?: string;
  relevanceBadge?: 'Highly relevant' | 'Related';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string; // ISO string
  actions?: DetectedAction[];
  memoryReferences?: MemoryReference[];
}

export interface CognitiveInsight {
  mood?: string;
  keyThemes: string[];
  cognitiveBiases?: string[];
  takeaways: string[];
  actionItems: string[];
  suggestedPromptForNextTime?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  intent: ReflectionIntent;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  messages: ChatMessage[];
  summary?: string;
  insights?: CognitiveInsight;
  tags?: string[];
  isFavorite?: boolean;
  memoryReferences?: MemoryReference[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  totalReflections?: number;
}

export interface CognitivePatternAnalysis {
  id?: string;
  userId?: string;
  analyzedAt: string; // ISO timestamp
  entryCount: number;
  overview?: string;
  recurringGoals: string[];
  recurringChallenges: string[];
  strengthsObserved: string[];
  growthTrend: string;
  recommendedFocus: string[];
  rawAnalysis?: string;
}

export interface MindShareTheme {
  theme: string;
  count: number;
  percentage: number;
  evidence: string[];
}

export interface MindShareAnalysis {
  generatedAt?: string;
  themes: MindShareTheme[];
  insight: string;
}

export interface WeeklyDigestContent {
  weeklyOverview: string;
  biggestWin: string;
  biggestChallenge: string;
  growthInsight: string;
  nextWeekFocus: string[];
  mindShare?: MindShareAnalysis;
}

export interface WeeklyDigest {
  id: string; // weekId e.g. "2026-W35" or ISO date range
  userId: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  generatedAt: string; // ISO string
  sentAt?: string | null; // ISO string
  recipientEmail?: string | null;
  entryCount: number;
  content: WeeklyDigestContent;
  weeklyInsights?: {
    mindShare?: MindShareAnalysis;
  };
  mindShare?: MindShareAnalysis;
}

export type DocumentStatus = 'uploading' | 'processing' | 'indexed' | 'failed';

export interface DocumentItem {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  pageCount?: number;
  uploadedAt: string;
  status: DocumentStatus;
  storagePath?: string;
  chunkCount?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  userId: string;
  text: string;
  pageNumber: number;
  chunkIndex: number;
  embedding?: number[];
  createdAt: string;
}

export interface DocumentChatMessage {
  id: string;
  role: 'user' | 'model';
  message: string;
  timestamp: string;
  citedPages?: number[];
  retrievedChunkCount?: number;
  evidence?: string[];
}

export type LiveConnectionState = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'error';

export type LiveVoiceName = 'Zephyr' | 'Aoede' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';

export interface LiveTranscriptItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isInterrupted?: boolean;
}


