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

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string; // ISO string
  actions?: DetectedAction[];
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
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  totalReflections?: number;
}
