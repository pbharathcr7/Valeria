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
  DetectedAction
} from '../types';
import { ActionCards } from './ActionCards';

interface ReflectionCanvasProps {
  initialEntry?: JournalEntry | null;
  userId: string;
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

/**
 * Strips raw action JSON structures, ```actions blocks, and dangling fences from conversational text.
 */
export function cleanReflectionContent(rawText?: string): string {
  if (!rawText) return '';
  let text = rawText;

  // 1. Strip ```actions ... ``` (both complete and unclosed during streaming)
  text = text.replace(/```actions\s*[\s\S]*?(?:```|$)/gi, '');
  // 2. Strip <!--ACTIONS: ... -->
  text = text.replace(/<!--ACTIONS:\s*[\s\S]*?(?:-->|$)/gi, '');
  // 3. Strip ```json containing calendar/maps actions
  text = text.replace(/```(?:json)?\s*\[\s*\{[\s\S]*?"type"\s*:\s*"(?:calendar|maps)"[\s\S]*?(?:```|$)/gi, '');
  // 4. Strip raw JSON array of calendar/maps actions [ { "type": "calendar" ... } ]
  text = text.replace(/\[\s*\{\s*"type"\s*:\s*"(?:calendar|maps)"[\s\S]*?(?:\]|$)/gi, '');
  text = text.replace(/\[\s*\{\s*"(?:type|placeName|title)"[\s\S]*?"(?:calendar|maps)"[\s\S]*?(?:\]|$)/gi, '');
  // 5. Strip trailing unclosed ```actions
  text = text.replace(/```actions[\s\S]*$/gi, '');
  // 6. Strip ```title ... ``` (both complete and unclosed during streaming)
  text = text.replace(/```title\s*[\s\S]*?(?:```|$)/gi, '');
  text = text.replace(/<!--TITLE:\s*[\s\S]*?(?:-->|$)/gi, '');
  // 7. Strip dangling triple backtick fences at the end
  text = text.replace(/\n```\s*$/g, '');

  return text.trim();
}

export const ReflectionCanvas: React.FC<ReflectionCanvasProps> = ({
  initialEntry,
  userId,
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

  // Synchronize state only when switching to a different reflection entry ID
  useEffect(() => {
    if (initialEntry && initialEntry.id !== entryRef.current.id) {
      setEntry(initialEntry);
      entryRef.current = initialEntry;
    }
  }, [initialEntry?.id]);

  // Is the mode locked for this reflection session?
  const isModeLocked = entry.messages.length > 0;
  const isSaving = externalIsSaving || localSaving;

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGenerating]);

  // Handle Intent Change (locked after first message)
  const handleIntentChange = (newIntent: ReflectionIntent) => {
    if (isModeLocked) return;
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
    } finally {
      setLocalSaving(false);
    }
  };

  // Debounced title update
  const handleTitleChange = (newTitle: string) => {
    setEntry(prev => ({ ...prev, title: newTitle }));
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }
    titleDebounceRef.current = setTimeout(() => {
      triggerAutoSave({ ...entryRef.current, title: newTitle });
    }, 1000);
  };

  // Textarea auto-resize
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Submit message to Gemini Stream API
  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || isGenerating) return;

    const userMsgId = 'msg_user_' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...entry.messages, userMsg];
    const nextEntryState: JournalEntry = {
      ...entry,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
    };

    setEntry(nextEntryState);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsGenerating(true);
    setErrorMessage(null);

    // Auto-save user message
    triggerAutoSave(nextEntryState);

    // Placeholder for AI streaming
    const aiMsgId = 'msg_ai_' + (Date.now() + 1);
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      content: '',
      timestamp: new Date().toISOString()
    };

    setEntry(prev => ({
      ...prev,
      messages: [...prev.messages, initialAiMsg]
    }));

    try {
      const response = await fetch('/api/reflect/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          intent: entry.intent,
          title: entry.title
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errText}`);
      }

      if (!response.body) {
        throw new Error('No response body received from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.replace('data: ', '').trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            if (event.chunk) {
              accumulatedText += event.chunk;
              const displayStreamText = cleanReflectionContent(accumulatedText);
              setEntry(prev => {
                const msgs = prev.messages.map(m => 
                  m.id === aiMsgId ? { ...m, content: displayStreamText } : m
                );
                return { ...prev, messages: msgs };
              });
            } else if (event.done) {
              const rawFinal = event.content || event.fullText || event.cleanedContent || accumulatedText;
              const finalContent = cleanReflectionContent(rawFinal) || "I've reflected on your thought.";
              const finalActions: DetectedAction[] = event.actions || [];

              const finalAiMsg: ChatMessage = {
                id: aiMsgId,
                role: 'model',
                content: finalContent,
                actions: finalActions,
                timestamp: event.timestamp || new Date().toISOString()
              };

              // Auto-title reflection if title is still the default 'New Reflection' or empty
              const isDefaultTitle = !nextEntryState.title || nextEntryState.title.trim() === 'New Reflection' || nextEntryState.title.trim() === '';
              const resolvedTitle = (isDefaultTitle && event.suggestedTitle?.trim())
                ? event.suggestedTitle.trim()
                : nextEntryState.title;

              const finalEntryWithAi: JournalEntry = {
                ...nextEntryState,
                title: resolvedTitle,
                messages: [...updatedMessages, finalAiMsg],
                updatedAt: new Date().toISOString()
              };

              setEntry(finalEntryWithAi);
              setIsGenerating(false);
              triggerAutoSave(finalEntryWithAi);
            } else if (event.error) {
              throw new Error(event.error);
            }
          } catch (e: any) {
            console.error('Error parsing SSE chunk:', e);
          }
        }
      }
    } catch (err: any) {
      console.error('Error in chat generation:', err);
      setIsGenerating(false);
      setErrorMessage(err?.message || 'Failed to connect to reflection assistant.');
      
      // Rollback placeholder message if nothing arrived
      setEntry(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.id !== aiMsgId)
      }));
    }
  };

  // Update an individual action card
  const handleUpdateAction = (messageId: string, updatedAction: DetectedAction) => {
    setEntry(prev => {
      const updatedMessages = prev.messages.map(msg => {
        if (msg.id !== messageId || !msg.actions) return msg;
        const newActions = msg.actions.map(a => a.id === updatedAction.id ? updatedAction : a);
        return { ...msg, actions: newActions };
      });
      const updated = {
        ...prev,
        messages: updatedMessages,
        updatedAt: new Date().toISOString()
      };
      triggerAutoSave(updated);
      return updated;
    });
  };

  // Request Cognitive Synthesis (Summary, Takeaways, Mood, Key Themes)
  const handleSynthesize = async () => {
    if (entry.messages.length < 2 || isSynthesizing) return;
    setIsSynthesizing(true);
    setErrorMessage(null);

    try {
      const resp = await fetch('/api/reflect/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: entry.messages,
          title: entry.title
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to synthesize cognitive insights.');
      }

      const data = await resp.json();
      const synth = data.synthesis || data.insights || data;
      const insights: CognitiveInsight = {
        mood: synth.mood || 'Reflective',
        keyThemes: synth.keyThemes || [],
        takeaways: synth.takeaways || [],
        actionItems: synth.actionItems || [],
        cognitiveBiases: synth.cognitiveBiases || [],
        suggestedPromptForNextTime: synth.suggestedPromptForNextTime || synth.suggestedPrompt
      };

      const isDefaultTitle = !entry.title || entry.title.trim() === 'New Reflection' || entry.title.trim() === '';
      const resolvedTitle = (isDefaultTitle && synth.title?.trim())
        ? synth.title.trim()
        : entry.title;

      const finalEntry: JournalEntry = {
        ...entry,
        title: resolvedTitle,
        summary: synth.summary || data.summary || entry.summary,
        insights,
        tags: Array.from(new Set([...(entry.tags || []), ...(insights.keyThemes || [])])),
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
    <div id="reflection-canvas" className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full bg-white sm:rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Top Header bar */}
      <div className="px-4 py-3.5 border-b border-stone-200/90 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="back-to-dashboard-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition cursor-pointer"
            title="Back to Reflections"
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
                  Cognitive Journal: {INTENT_OPTIONS.find(i => i.id === entry.intent)?.label}
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
                      type="button"
                      onClick={() => {
                        setInputMessage(promptIdea);
                        textareaRef.current?.focus();
                      }}
                      className="px-3 py-1.5 rounded-full bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200 text-xs transition shadow-2xs text-left cursor-pointer"
                    >
                      {promptIdea}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Stream */}
            {entry.messages.map((msg, msgIdx) => {
              const isUser = msg.role === 'user';
              const displayContent = isUser ? msg.content : cleanReflectionContent(msg.content);
              const isThinking = !isUser && !displayContent && isGenerating && msgIdx === entry.messages.length - 1;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col space-y-2 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[11px] font-mono text-stone-400">
                      {isUser ? 'You' : 'Valeria AI'}
                    </span>
                    <span className="text-[10px] font-mono text-stone-300">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-stone-900 text-stone-50 rounded-tr-xs shadow-xs'
                        : 'bg-white text-stone-900 border border-stone-200/90 rounded-tl-xs shadow-xs prose prose-stone max-w-none'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : isThinking ? (
                      <div className="flex items-center gap-3 py-1 text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-600/70 animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-2 h-2 rounded-full bg-amber-600/70 animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-2 h-2 rounded-full bg-amber-600/70 animate-bounce"></span>
                        </div>
                        <span className="text-xs font-serif italic text-stone-500">
                          Valeria is reflecting on your thoughts...
                        </span>
                      </div>
                    ) : (
                      <div className="markdown-body">
                        <ReactMarkdown>{displayContent || '...'}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Detected Action Cards for Calendar & Maps */}
                  {!isUser && msg.actions && msg.actions.length > 0 && (
                    <div className="w-full max-w-[90%] sm:max-w-[82%] pt-1">
                      <ActionCards
                        actions={msg.actions}
                        messageId={msg.id}
                        onUpdateAction={(updated) => handleUpdateAction(msg.id, updated)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="pt-3 max-w-3xl mx-auto w-full">
            <div className="relative flex items-end rounded-2xl bg-white border border-stone-300 focus-within:border-stone-500 focus-within:ring-2 focus-within:ring-stone-900/10 shadow-xs transition p-2">
              <textarea
                ref={textareaRef}
                id="reflection-chat-input"
                rows={1}
                value={inputMessage}
                onChange={handleTextareaInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Explore your thoughts with Valeria (Shift+Enter for newline)..."
                disabled={isGenerating}
                className="flex-1 max-h-44 min-h-[44px] px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 bg-transparent border-0 focus:outline-hidden resize-none"
              />

              <div className="flex items-center gap-1.5 pl-2 pb-1 shrink-0">
                <button
                  type="button"
                  id="send-reflection-message-btn"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isGenerating}
                  className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-white transition shadow-2xs cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center font-mono text-stone-400 mt-2">
              Private AI cognitive conversation. Thoughts, decisions, and goals are securely protected.
            </p>
          </div>
        </div>

        {/* Right Sidebar: Cognitive Synthesis Insights */}
        {entry.insights && (
          <div className="hidden lg:flex flex-col w-80 bg-white border-l border-stone-200/90 p-5 overflow-y-auto space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4 className="font-serif font-bold text-sm text-stone-900">Cognitive Synthesis</h4>
            </div>

            {/* Executive Summary */}
            {entry.summary && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Executive Summary</span>
                <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                  {entry.summary}
                </p>
              </div>
            )}

            {/* Mood & Tone */}
            {entry.insights.mood && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Observed Mindset</span>
                <div className="inline-block px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 text-xs font-semibold">
                  {entry.insights.mood}
                </div>
              </div>
            )}

            {/* Key Themes */}
            {entry.insights.keyThemes && entry.insights.keyThemes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Key Themes</span>
                <div className="flex flex-wrap gap-1.5">
                  {entry.insights.keyThemes.map((theme, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">
                      {theme}
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
