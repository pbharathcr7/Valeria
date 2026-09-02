import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  FileText, 
  Send, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Layers, 
  BookOpen, 
  Sparkles, 
  AlertCircle, 
  Trash2,
  FileCheck,
  Bot
} from 'lucide-react';
import { DocumentItem, DocumentChatMessage, UserProfile, DocumentChunk } from '../types';
import { 
  loadDocumentChunks, 
  loadDocumentConversations, 
  saveDocumentChatMessage 
} from '../lib/firebase';

interface DocumentChatCanvasProps {
  document: DocumentItem;
  user: UserProfile;
  onClose: () => void;
}

const STARTER_QUESTIONS = [
  'Summarize this document.',
  'Explain the key concepts.'
];

export const DocumentChatCanvas: React.FC<DocumentChatCanvasProps> = ({
  document: docItem,
  user,
  onClose
}) => {
  const [messages, setMessages] = useState<DocumentChatMessage[]>([]);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll chat history
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Load conversation history and document chunks on mount
  useEffect(() => {
    let isMounted = true;

    async function initDocumentChat() {
      setIsLoadingHistory(true);
      setErrorMessage(null);
      try {
        const [loadedMsgs, loadedChunks] = await Promise.all([
          loadDocumentConversations(user.uid, docItem.id),
          loadDocumentChunks(user.uid, docItem.id)
        ]);

        if (isMounted) {
          setMessages(loadedMsgs as DocumentChatMessage[]);
          setChunks(loadedChunks as DocumentChunk[]);
        }
      } catch (err: any) {
        console.error('Failed to initialize document chat:', err);
        if (isMounted) {
          setErrorMessage('Could not load prior conversation history or indexed chunks.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    }

    if (user?.uid && docItem?.id) {
      initDocumentChat();
    }

    return () => {
      isMounted = false;
    };
  }, [user.uid, docItem.id]);

  // Handle question submission
  const handleAskQuestion = async (questionText?: string) => {
    const query = (questionText || inputQuestion).trim();
    if (!query || isGenerating) return;

    setInputQuestion('');
    setErrorMessage(null);

    const userMessageId = `msg_${Date.now()}_user`;
    const userMsg: DocumentChatMessage = {
      id: userMessageId,
      role: 'user',
      message: query,
      timestamp: new Date().toISOString()
    };

    // Optimistically update UI
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    // Persist user question to Firestore
    try {
      await saveDocumentChatMessage(user.uid, docItem.id, userMsg);
    } catch (saveErr) {
      console.warn('Could not save user message to Firestore:', saveErr);
    }

    // Ensure chunks are loaded if empty
    let activeChunks = chunks;
    if (activeChunks.length === 0) {
      try {
        activeChunks = (await loadDocumentChunks(user.uid, docItem.id)) as DocumentChunk[];
        setChunks(activeChunks);
      } catch (cErr) {
        console.warn('Error reloading chunks:', cErr);
      }
    }

    // Check if document has chunks
    if (activeChunks.length === 0 && docItem.status !== 'indexed') {
      const fallbackAiMsg: DocumentChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'model',
        message: "**Answer**\n\nThis document hasn't finished indexing yet.\n\n**Evidence**\n* " + docItem.fileName + " — Not indexed",
        citedPages: [],
        retrievedChunkCount: 0,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, fallbackAiMsg]);
      setIsGenerating(false);
      await saveDocumentChatMessage(user.uid, docItem.id, fallbackAiMsg).catch(console.error);
      return;
    }

    try {
      const response = await fetch('/api/documents/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          documentId: docItem.id,
          fileName: docItem.fileName,
          question: query,
          chunks: activeChunks,
          conversationHistory: messages.slice(-6)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const result = await response.json();

      const aiMsg: DocumentChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'model',
        message: result.answer || "I couldn't find relevant information in this document.",
        citedPages: Array.isArray(result.citedPages) ? result.citedPages : [],
        retrievedChunkCount: result.retrievedChunkCount || 0,
        evidence: Array.isArray(result.evidence) ? result.evidence : [],
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMsg]);
      await saveDocumentChatMessage(user.uid, docItem.id, aiMsg);

    } catch (err: any) {
      console.error('Error during document RAG query:', err);
      const errorAiMsg: DocumentChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'model',
        message: `**Answer**\n\nI encountered an issue processing your request: ${err.message || 'Please check your connection and try again.'}\n\n**Evidence**\n* ${docItem.fileName} — Query failed`,
        citedPages: [],
        retrievedChunkCount: 0,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorAiMsg]);
      setErrorMessage(err.message || 'Unable to retrieve answer from document.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <div 
      id="document-chat-canvas" 
      className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto w-full bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. Top Header Bar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-stone-200/90 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            id="back-to-documents-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200/80 text-stone-600 hover:text-stone-900 transition cursor-pointer shrink-0"
            title="Back to Documents"
            aria-label="Back to Documents"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 rounded-lg bg-stone-200/70 text-stone-700 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-amber-900" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 
                className="font-serif font-bold text-base text-stone-900 truncate max-w-xs sm:max-w-md"
                title={docItem.fileName}
              >
                {docItem.fileName}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>Indexed</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500 mt-0.5">
              <span>{docItem.pageCount || 1} {docItem.pageCount === 1 ? 'page' : 'pages'}</span>
              <span>•</span>
              <span>{docItem.chunkCount || chunks.length} indexed chunks</span>
              <span>•</span>
              <span className="text-amber-800 font-medium">RAG Active</span>
            </div>
          </div>
        </div>

        {/* Action badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-600 hidden sm:inline-block">
            Document Grounded
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            type="button"
            onClick={() => setErrorMessage(null)} 
            className="text-rose-600 hover:text-rose-900 font-semibold text-xs ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Chat History Area */}
      <div className="flex-1 overflow-y-auto bg-stone-50/40 p-4 sm:p-6 space-y-6">
        {isLoadingHistory ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-stone-500">Loading document conversation & vector index...</p>
          </div>
        ) : messages.length === 0 ? (
          /* Empty / Welcome State with Starter Questions */
          <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-6 text-center animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-center justify-center mx-auto shadow-2xs">
              <BookOpen className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-serif font-bold text-xl text-stone-900">
                Ask anything about this document
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                Valeria retrieves semantic excerpts from <span className="font-semibold text-stone-700">"{docItem.fileName}"</span> and provides factual answers strictly grounded in the text with page references.
              </p>
            </div>

            {/* Suggested Starter Questions Chips */}
            <div className="pt-2 space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-semibold">
                Suggested Starter Questions
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
                {STARTER_QUESTIONS.map((question, idx) => (
                  <button
                    key={idx}
                    type="button"
                    id={`starter-question-chip-${idx}`}
                    onClick={() => handleAskQuestion(question)}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-200/90 text-stone-700 text-xs font-medium hover:bg-stone-100 hover:border-stone-400 active:scale-[0.98] transition cursor-pointer shadow-2xs text-left"
                  >
                    <Sparkles className="w-3 h-3 text-amber-700 shrink-0" />
                    <span>{question}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages Stream */
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                id={`document-chat-msg-${msg.id || index}`}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Bot className="w-4 h-4 text-amber-300" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-stone-900 text-stone-50 rounded-tr-xs shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-800 rounded-tl-xs shadow-xs space-y-4'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-stone-100">{msg.message}</p>
                  ) : (
                    <>
                      {/* Formatted Markdown AI Answer */}
                      <div className="prose prose-stone text-sm max-w-none prose-p:my-1.5 prose-headings:my-2.5 prose-ul:my-1.5 prose-li:my-0.5">
                        <ReactMarkdown>{msg.message}</ReactMarkdown>
                      </div>

                      {/* Cited Pages / Evidence Pills */}
                      {((msg.citedPages && msg.citedPages.length > 0) || (msg.evidence && msg.evidence.length > 0)) && (
                        <div className="pt-3 border-t border-stone-100/90 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono text-stone-400 font-semibold uppercase tracking-wider">
                            Referenced Pages:
                          </span>
                          {(msg.citedPages || []).map((pageNum, pIdx) => (
                            <span
                              key={pIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-amber-50 text-amber-900 border border-amber-200"
                            >
                              <FileCheck className="w-2.5 h-2.5 text-amber-700" />
                              <span>Page {pageNum}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Live Generating State */}
            {isGenerating && (
              <div className="flex gap-3 justify-start animate-in fade-in">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-amber-300 animate-pulse" />
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs p-4 shadow-xs text-xs text-stone-500 flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-700 shrink-0" />
                  <span className="font-mono">Searching document chunks & synthesizing answer...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 3. Starter Question Quick Chips (Compact bar if messages already exist) */}
      {messages.length > 0 && !isGenerating && (
        <div className="px-4 sm:px-6 py-2 bg-stone-50/90 border-t border-stone-200/60 overflow-x-auto flex items-center gap-2 text-xs shrink-0">
          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider whitespace-nowrap shrink-0">
            Quick Ask:
          </span>
          {STARTER_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              id={`quick-ask-chip-${idx}`}
              onClick={() => handleAskQuestion(q)}
              className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-400 text-xs whitespace-nowrap transition cursor-pointer shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 4. Chat Input Box */}
      <div className="p-3 sm:p-4 bg-white border-t border-stone-200/90 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="max-w-3xl mx-auto flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              id="document-chat-input"
              rows={2}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask anything about "${docItem.fileName}"...`}
              disabled={isGenerating}
              className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50/60 p-3 pr-10 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition"
            />
          </div>

          <button
            type="submit"
            id="send-document-question-btn"
            disabled={!inputQuestion.trim() || isGenerating}
            className="p-3 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-[0.96] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
            title="Send Question"
            aria-label="Send Question"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
            ) : (
              <Send className="w-5 h-5 text-amber-300" />
            )}
          </button>
        </form>
        <p className="text-[11px] text-center text-stone-400 font-mono mt-2">
          Press <kbd className="px-1 py-0.5 bg-stone-100 rounded text-stone-600">Enter</kbd> to ask • <kbd className="px-1 py-0.5 bg-stone-100 rounded text-stone-600">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
};
