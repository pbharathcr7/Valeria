import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Sparkles, 
  BrainCircuit, 
  CheckCircle2, 
  RefreshCw, 
  FileText, 
  ArrowLeft,
  HeartHandshake,
  Compass,
  Zap,
  ListTodo,
  AlertCircle,
  Lock
} from 'lucide-react';
import { 
  JournalEntry, 
  ChatMessage, 
  ReflectionIntent, 
  CognitiveInsight, 
  DetectedAction, 
  CognitivePatternAnalysis, 
  MemoryReference 
} from '../types';
import { ActionCards } from './ActionCards';
import { RelatedMemoriesCard } from './RelatedMemoriesCard';
import { retrieveRelevantMemories } from '../lib/memoryRetriever';

interface ReflectionCanvasProps {
  initialEntry?: JournalEntry | null;
  userId: string;
  allEntries?: JournalEntry[];
  cognitivePatterns?: CognitivePatternAnalysis | null;
  onSaveEntry: (entry: JournalEntry) => Promise<void>;
  onClose: () => void;
  onOpenEntryById?: (entryId: string) => void;
  isSaving: boolean;
}

const INTENT_OPTIONS: { id: ReflectionIntent; label: string; icon: any; description: string }[] = [
  { 
    id: 'deep_reflection', 
    label: 'Deep Reflection', 
    icon: Compass, 
    description: 'Unpack underlying motives, core values & emotional nuances' 
  },
  { 
    id: 'brainstorm', 
    label: 'Brainstorm & Ideas', 
    icon: Zap, 
    description: 'Explore creative angles, strategic options & divergent concepts' 
  },
  { 
    id: 'cognitive_restructuring', 
    label: 'Cognitive Reframing', 
    icon: BrainCircuit, 
    description: 'Inspect cognitive distortions and challenge unhelpful self-talk' 
  },
  { 
    id: 'action_plan', 
    label: 'Action & Clarity', 
    icon: ListTodo, 
    description: 'Convert muddy thoughts into focused, low-friction next steps' 
  },
  { 
    id: 'gratitude', 
    label: 'Gratitude & Savoring', 
    icon: HeartHandshake, 
    description: 'Anchor on grounded appreciation and positive psychological anchors' 
  },
  { 
    id: 'summary', 
    label: 'Executive Summary', 
    icon: FileText, 
    description: 'Distill messy thoughts into clear executive synthesis' 
  }
];

export const ReflectionCanvas: React.FC<ReflectionCanvasProps> = ({
  initialEntry,
  userId,
  allEntries = [],
  cognitivePatterns = null,
  onSaveEntry,
  onClose,
  onOpenEntryById,
  isSaving: externalIsSaving
}) => {
  const [entry, setEntry] = useState<JournalEntry>(() => {
    if (initialEntry) {
      return initialEntry;
    }
    const newId = 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    return {
      id: newId,
      userId,
      title: 'New Reflection',
      intent: 'deep_reflection',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      tags: []
    };
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const entryRef = useRef<JournalEntry>(entry);

  useEffect(() => {
    entryRef.current = entry;
  }, [entry]);

  // Synchronize state if initialEntry changes
  useEffect(() => {
    if (initialEntry) {
      setEntry(initialEntry);
      entryRef.current = initialEntry;
    }
  }, [initialEntry]);

  // Is the mode locked for this reflection session?
  const isModeLocked = entry.messages.length > 0;
  const isSaving = externalIsSaving || localSaving;

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGenerating]);

  // Handle Intent Change (locked after first message)
  const handleIntentChange = (newIntent: ReflectionIntent) => {
    if (isModeLocked) return; // Locked once conversation starts
    setEntry(prev => {
      const updated = {
        ...prev,
        intent: newIntent,
        updatedAt: new Date().toISOString()
      };
      return updated;
    });
  };

  // Auto-save helper
  const triggerAutoSave = async (entryToPersist: JournalEntry) => {
    setLocalSaving(true);
    setSaveStatus('saving');
    try {
      await onSaveEntry(entryToPersist);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Auto-save failed:', err);
      setSaveStatus('error');
      setErrorMessage('Auto-save encountered an issue. Changes will retry.');
    } finally {
      setLocalSaving(false);
    }
  };

  // Auto-save title changes with debounce
  const handleTitleChange = (newTitle: string) => {
    const updated = { ...entry, title: newTitle, updatedAt: new Date().toISOString() };
    setEntry(updated);

    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }
    titleDebounceRef.current = setTimeout(() => {
      triggerAutoSave(updated);
    }, 1000);
  };

  // Submit a turn to Gemini
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputMessage.trim();
    if (!content || isGenerating) return;

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...entry.messages, userMsg];
    
    // Auto-derive a sensible title from the first prompt if default
    let updatedTitle = entry.title;
    if (entry.title === 'New Reflection' && content.length > 0) {
      updatedTitle = content.slice(0, 45) + (content.length > 45 ? '...' : '');
    }

    const nextEntryState: JournalEntry = {
      ...entry,
      title: updatedTitle,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
    };

    setEntry(nextEntryState);
    setInputMessage('');
    setIsGenerating(true);

    // Immediate auto-save of the user message state in background
    triggerAutoSave(nextEntryState);

    // Retrieve relevant previous memories for context injection
    let memoryContextPayload: any = null;
    let retrievedMemoriesForUI: MemoryReference[] = [];

    try {
      const memoryRetrievalResult = retrieveRelevantMemories({
        currentMessage: content,
        currentMessages: updatedMessages,
        pastEntries: allEntries,
        cognitivePatterns: cognitivePatterns,
        currentEntryId: nextEntryState.id,
        maxResults: 4
      });

      if (memoryRetrievalResult.relevantMemories.length > 0 || memoryRetrievalResult.cognitiveContext) {
        memoryContextPayload = memoryRetrievalResult;
        retrievedMemoriesForUI = memoryRetrievalResult.relevantMemories;
      }
    } catch (memErr) {
      console.warn('Memory retrieval encountered a non-blocking issue, continuing without memory context:', memErr);
    }

    try {
      const resp = await fetch('/api/reflect/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          intent: nextEntryState.intent,
          memoryContext: memoryContextPayload
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${resp.status}`);
      }

      const data = await resp.json();
      const aiMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_ai',
        role: 'model',
        content: data.content || "I've reflected on your thought.",
        actions: Array.isArray(data.actions) && data.actions.length > 0 ? data.actions : undefined,
        memoryReferences: retrievedMemoriesForUI.length > 0 ? retrievedMemoriesForUI : undefined,
        timestamp: data.timestamp || new Date().toISOString()
      };

      const finalEntryWithAi: JournalEntry = {
        ...nextEntryState,
        messages: [...updatedMessages, aiMsg],
        updatedAt: new Date().toISOString()
      };

      // Set entry with response and IMMEDIATELY hide the contemplation indicator
      setEntry(finalEntryWithAi);
      setIsGenerating(false);

      // Auto-save the complete dialogue turn with Gemini's response in background
      triggerAutoSave(finalEntryWithAi);
    } catch (err: any) {
      console.error('Error contacting Gemini:', err);
      setErrorMessage(err?.message || 'Unable to reach Gemini AI. Please check your connection or API status.');
      setIsGenerating(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle action updates (e.g. Google Calendar event created or undone)
  const handleUpdateAction = (messageId: string, updatedAction: DetectedAction) => {
    setEntry(prev => {
      const updatedMessages = prev.messages.map(msg => {
        if (msg.id !== messageId || !msg.actions) return msg;
        const updatedActions = msg.actions.map(act => act.id === updatedAction.id ? updatedAction : act);
        return {
          ...msg,
          actions: updatedActions
        };
      });
      const updatedEntry: JournalEntry = {
        ...prev,
        messages: updatedMessages,
        updatedAt: new Date().toISOString()
      };
      triggerAutoSave(updatedEntry);
      return updatedEntry;
    });
  };

  // Synthesize session & extract Cognitive Insights
  const handleSynthesize = async () => {
    if (entry.messages.length === 0 || isSynthesizing) return;
    setIsSynthesizing(true);
    setErrorMessage(null);

    try {
      const resp = await fetch('/api/reflect/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: entry.messages,
          intent: entry.intent
        })
      });

      if (!resp.ok) {
        throw new Error('Failed to generate cognitive synthesis.');
      }

      const data = await resp.json();
      const synthesis = data.synthesis || {};

      const finalEntry: JournalEntry = {
        ...entry,
        title: synthesis.title || entry.title,
        summary: synthesis.summary || entry.summary,
        insights: {
          mood: synthesis.mood,
          keyThemes: synthesis.keyThemes || [],
          cognitiveBiases: synthesis.cognitiveBiases || [],
          takeaways: synthesis.takeaways || [],
          actionItems: synthesis.actionItems || [],
          suggestedPromptForNextTime: synthesis.suggestedPromptForNextTime
        },
        tags: synthesis.keyThemes || entry.tags || [],
        updatedAt: new Date().toISOString()
      };

      setEntry(finalEntry);
      await triggerAutoSave(finalEntry);
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setErrorMessage(err?.message || 'Error synthesizing insights.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleRetrySave = () => {
    triggerAutoSave(entry);
  };

  return (
    <div id="reflection-canvas" className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto w-full bg-white sm:rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Top Header bar */}
      <div className="px-4 py-3.5 border-b border-stone-200/90 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="back-to-dashboard-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <input
            id="reflection-title-input"
            type="text"
            value={entry.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={() => triggerAutoSave(entry)}
            placeholder="Reflection Title..."
            className="font-serif text-lg font-bold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-stone-500 focus:outline-hidden px-1 py-0.5 max-w-xs sm:max-w-md truncate"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Intent Dropdown with locked state */}
          <div className="relative flex items-center">
            <select
              id="reflection-intent-select"
              value={entry.intent}
              disabled={isModeLocked}
              onChange={(e) => handleIntentChange(e.target.value as ReflectionIntent)}
              title={isModeLocked ? 'Mode is locked for this reflection session' : 'Select reflection mode'}
              className={`text-xs font-medium rounded-lg px-3 py-1.5 transition ${
                isModeLocked 
                  ? 'bg-stone-100/90 text-stone-600 border border-stone-200 cursor-not-allowed' 
                  : 'bg-white border border-stone-300 text-stone-800 hover:border-stone-400 focus:outline-hidden focus:ring-1 focus:ring-stone-500 cursor-pointer'
              }`}
            >
              {INTENT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {isModeLocked && (
              <span 
                className="ml-1.5 p-1 rounded bg-stone-100 text-stone-400 border border-stone-200/80" 
                title="Mode is locked for this session"
              >
                <Lock className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* AI Synthesize Button */}
          {entry.messages.length >= 2 && (
            <button
              id="ai-synthesize-btn"
              onClick={handleSynthesize}
              disabled={isSynthesizing || isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 border border-amber-300/80 text-amber-900 hover:bg-amber-100 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              title="Extract cognitive themes, summaries, and action items"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isSynthesizing ? 'animate-spin' : ''}`} />
              <span>{isSynthesizing ? 'Synthesizing...' : 'Synthesize Insights'}</span>
            </button>
          )}

          {/* Auto-Save Live Status Indicator */}
          <div id="auto-save-status-container" className="flex items-center">
            {isSaving ? (
              <div 
                id="auto-save-indicator-saving"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-100 text-stone-600 border border-stone-200"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-500" />
                <span>Auto-saving...</span>
              </div>
            ) : saveStatus === 'error' ? (
              <button
                id="auto-save-retry-btn"
                onClick={handleRetrySave}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                title="Click to retry saving to Firestore"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Retry Save</span>
              </button>
            ) : (
              <div 
                id="auto-save-indicator-saved"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-saved</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-rose-600 hover:text-rose-900 font-semibold text-xs ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main split canvas: Chat flow on left/center, Cognitive Summary panel if available on right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat / Reflection Stream */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-stone-50/40 p-4 sm:p-6">
          <div className="space-y-6 max-w-3xl mx-auto w-full pb-4">
            {/* Introductory intent banner */}
            <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-stone-100 text-stone-700 shrink-0">
                <BrainCircuit className="w-5 h-5 text-stone-800" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Current Mode: {INTENT_OPTIONS.find(i => i.id === entry.intent)?.label}
                </h4>
                <p className="text-xs text-stone-600">
                  {INTENT_OPTIONS.find(i => i.id === entry.intent)?.description}
                </p>
              </div>
            </div>

            {/* Empty state prompt */}
            {entry.messages.length === 0 && (
              <div className="text-center py-12 px-4 space-y-4">
                <p className="font-serif text-xl italic text-stone-500">
                  "What's occupying your thoughts right now?"
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {[
                    "I'm feeling conflicted between two competing priorities...",
                    "Help me unpack why I'm procrastinating on this project.",
                    "I had a meaningful conversation today that I want to process.",
                    "Brainstorm three novel perspectives on this challenge."
                  ].map((promptIdea, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputMessage(promptIdea)}
                      className="text-xs text-left px-3 py-2 rounded-lg bg-white border border-stone-200 hover:border-stone-400 text-stone-700 transition cursor-pointer shadow-xs"
                    >
                      {promptIdea}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message History */}
            {entry.messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <BrainCircuit className="w-4 h-4 text-amber-300" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-stone-900 text-stone-50 rounded-tr-xs shadow-xs'
                      : 'bg-white border border-stone-200/90 text-stone-800 rounded-tl-xs shadow-xs prose prose-stone max-w-none'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <>
                      <div className="prose prose-stone text-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.actions && msg.actions.length > 0 && (
                        <ActionCards 
                          actions={msg.actions} 
                          messageId={msg.id} 
                          onUpdateAction={(updatedAct) => handleUpdateAction(msg.id, updatedAct)} 
                        />
                      )}
                      {msg.memoryReferences && msg.memoryReferences.length > 0 && (
                        <RelatedMemoriesCard
                          memoryReferences={msg.memoryReferences}
                          onOpenMemory={onOpenEntryById ? (refId) => {
                            triggerAutoSave(entry);
                            onOpenEntryById(refId);
                          } : undefined}
                        />
                      )}
                    </>
                  )}
                  <div
                    className={`text-[10px] mt-2 font-mono ${
                      msg.role === 'user' ? 'text-stone-400 text-right' : 'text-stone-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* AI thinking state */}
            {isGenerating && (
              <div id="ai-contemplating-indicator" className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center shrink-0 shadow-xs">
                  <BrainCircuit className="w-4 h-4 text-amber-300" />
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-stone-200 text-stone-500 text-xs flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-serif italic text-stone-600">MindMirror is contemplating...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom input area */}
          <div className="max-w-3xl mx-auto w-full pt-2">
            <form onSubmit={handleSendMessage} className="relative">
              <textarea
                ref={textareaRef}
                id="reflection-prompt-textarea"
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Share your raw thought, dilemma, or reflection... (Press Enter to send)"
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-stone-400 shadow-xs resize-none placeholder:text-stone-400"
              />
              <button
                type="submit"
                id="submit-prompt-btn"
                disabled={!inputMessage.trim() || isGenerating}
                className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-95 transition disabled:opacity-40 cursor-pointer shadow-xs"
                title="Send to Gemini"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 pt-1.5">
              <span>Shift + Enter for new line</span>
              <span>Gemini 3.6 Flash Active</span>
            </div>
          </div>
        </div>

        {/* Cognitive Insights Panel (visible if synthesized or present) */}
        {entry.insights && (
          <div className="hidden lg:flex flex-col w-80 border-l border-stone-200 bg-white overflow-y-auto p-5 shrink-0 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-200">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="font-serif font-bold text-sm text-stone-900">Cognitive Synthesis</h3>
            </div>

            {/* Mood badge */}
            {entry.insights.mood && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Tone & Mood</span>
                <div className="p-2 rounded-lg bg-stone-100 text-xs font-medium text-stone-800 border border-stone-200/80">
                  {entry.insights.mood}
                </div>
              </div>
            )}

            {/* Executive Summary */}
            {entry.summary && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Executive Summary</span>
                <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                  {entry.summary}
                </p>
              </div>
            )}

            {/* Key Themes */}
            {entry.insights.keyThemes && entry.insights.keyThemes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Key Themes</span>
                <div className="flex flex-wrap gap-1.5">
                  {entry.insights.keyThemes.map((theme, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 bg-stone-100 border border-stone-200 rounded-md text-stone-700">
                      #{theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Core Takeaways */}
            {entry.insights.takeaways && entry.insights.takeaways.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Takeaways</span>
                <ul className="text-xs text-stone-700 space-y-1.5 pl-3 list-disc">
                  {entry.insights.takeaways.map((takeaway, i) => (
                    <li key={i} className="leading-snug">{takeaway}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {entry.insights.actionItems && entry.insights.actionItems.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Action Items</span>
                <ul className="text-xs text-stone-700 space-y-1.5">
                  {entry.insights.actionItems.map((action, i) => (
                    <li key={i} className="flex items-start gap-1.5 bg-emerald-50/60 p-2 rounded-md border border-emerald-200/60 text-emerald-950 leading-snug">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
