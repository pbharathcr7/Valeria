import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, 
  Plus, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  BrainCircuit, 
  LogOut, 
  BookOpen, 
  CheckCircle, 
  TrendingUp, 
  HeartHandshake, 
  Compass, 
  Zap, 
  ListTodo, 
  FileText,
  AlertTriangle,
  X
} from 'lucide-react';
import { JournalEntry, ReflectionIntent, UserProfile } from '../types';

interface DashboardProps {
  user: UserProfile;
  entries: JournalEntry[];
  onNewReflection: (intent?: ReflectionIntent) => void;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onSignOut: () => void;
  isLoading: boolean;
}

const INTENT_BADGES: Record<ReflectionIntent, { label: string; bg: string; text: string; icon: any }> = {
  deep_reflection: { label: 'Deep Reflection', bg: 'bg-stone-100', text: 'text-stone-800', icon: Compass },
  brainstorm: { label: 'Brainstorm', bg: 'bg-amber-50', text: 'text-amber-900', icon: Zap },
  cognitive_restructuring: { label: 'Reframing', bg: 'bg-blue-50', text: 'text-blue-900', icon: BrainCircuit },
  action_plan: { label: 'Action Plan', bg: 'bg-emerald-50', text: 'text-emerald-900', icon: ListTodo },
  gratitude: { label: 'Gratitude', bg: 'bg-rose-50', text: 'text-rose-900', icon: HeartHandshake },
  summary: { label: 'Summary', bg: 'bg-stone-100', text: 'text-stone-700', icon: FileText }
};

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  entries,
  onNewReflection,
  onSelectEntry,
  onDeleteEntry,
  onSignOut,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [weeklyInsights, setWeeklyInsights] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter entries based on search & intent
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      entry.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (entry.tags && entry.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (selectedFilter === 'all') return matchesSearch;
    return matchesSearch && entry.intent === selectedFilter;
  });

  // Calculate Cognitive Metrics
  const totalTurns = entries.reduce((acc, e) => acc + e.messages.length, 0);
  const synthesizedCount = entries.filter(e => Boolean(e.insights)).length;

  const handleGenerateWeeklyInsights = async () => {
    if (entries.length === 0 || isGeneratingInsights) return;
    setIsGeneratingInsights(true);

    try {
      const resp = await fetch('/api/reflect/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries })
      });

      if (!resp.ok) throw new Error('Could not analyze patterns.');
      const data = await resp.json();
      setWeeklyInsights(data.insights || 'No pattern data found.');
    } catch (e: any) {
      console.error(e);
      setWeeklyInsights('Failed to generate insights. Please try again.');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handlePromptDelete = (e: React.MouseEvent, entry: JournalEntry) => {
    e.stopPropagation();
    e.preventDefault();
    setEntryToDelete(entry);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteEntry(entryToDelete.id);
      setEntryToDelete(null);
    } catch (err) {
      console.error('Failed to delete reflection:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="dashboard-view" className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* Top App Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs">
              <BrainCircuit className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl font-bold tracking-tight text-stone-900">MindMirror</span>
              <span className="text-xs text-stone-500 font-mono hidden sm:inline-block">AI Cognitive Journal</span>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200/80">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-6 h-6 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-stone-800 text-stone-100 text-xs flex items-center justify-center font-bold">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-stone-800 max-w-[120px] sm:max-w-[160px] truncate">
                {user.displayName || user.email}
              </span>
            </div>

            <button
              id="dashboard-signout-btn"
              onClick={onSignOut}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Welcome & Quick Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Welcome back, {user.displayName ? user.displayName.split(' ')[0] : 'Thinker'}
            </h2>
            <p className="text-sm text-stone-600">
              What idea or dilemma would you like to explore with Gemini today?
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              id="new-reflection-main-btn"
              onClick={() => onNewReflection('deep_reflection')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-stone-50 font-medium text-sm hover:bg-stone-800 active:scale-[0.98] transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start Reflection</span>
            </button>
          </div>
        </div>

        {/* Quick Launch Intent Chips */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-stone-500 font-semibold">
            Choose a reflection mode
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: 'deep_reflection', label: 'Deep Reflection', desc: 'Unpack motives' },
              { id: 'brainstorm', label: 'Brainstorm', desc: 'Divergent ideas' },
              { id: 'cognitive_restructuring', label: 'Cognitive Reframing', desc: 'Challenge bias' },
              { id: 'action_plan', label: 'Action & Clarity', desc: 'Next micro-steps' },
              { id: 'gratitude', label: 'Gratitude', desc: 'Positive anchors' },
              { id: 'summary', label: 'Executive Summary', desc: 'Distill thoughts' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => onNewReflection(item.id as ReflectionIntent)}
                className="p-3 rounded-xl bg-white border border-stone-200 hover:border-stone-400 text-left transition hover:shadow-xs group cursor-pointer"
              >
                <div className="text-xs font-bold text-stone-800 group-hover:text-stone-900">{item.label}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cognitive Metric Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-stone-900">{entries.length}</div>
              <div className="text-xs text-stone-500">Reflections Logged</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-stone-900">{synthesizedCount}</div>
              <div className="text-xs text-stone-500">AI Synthesized Sessions</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-stone-900">{totalTurns}</div>
              <div className="text-xs text-stone-500">Total Dialogue Turns</div>
            </div>
          </div>
        </div>

        {/* Long Term Cognitive Memory & Pattern Analysis Banner */}
        {entries.length >= 2 && (
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-stone-900 text-amber-300">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Long-Term Cognitive Memory &amp; Growth
                  </h3>
                  <p className="text-xs text-stone-500">
                    Gemini synthesizes overarching patterns across your past reflections.
                  </p>
                </div>
              </div>

              <button
                id="generate-patterns-btn"
                onClick={handleGenerateWeeklyInsights}
                disabled={isGeneratingInsights}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingInsights ? 'animate-spin' : ''}`} />
                <span>{isGeneratingInsights ? 'Analyzing Memory...' : 'Analyze My Cognitive Patterns'}</span>
              </button>
            </div>

            {weeklyInsights && (
              <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 prose prose-stone max-w-none prose-headings:text-sm prose-headings:font-bold">
                <ReactMarkdown>{weeklyInsights}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Search, Filter and History List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Past Reflections ({filteredEntries.length})
            </h3>

            {/* Search Input & Intent Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  id="search-entries-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reflections, tags..."
                  className="pl-9 pr-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-stone-500 w-48 sm:w-64"
                />
              </div>

              <select
                id="filter-intent-select"
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="text-xs bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-stone-800 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Modes</option>
                <option value="deep_reflection">Deep Reflection</option>
                <option value="brainstorm">Brainstorm</option>
                <option value="cognitive_restructuring">Reframing</option>
                <option value="action_plan">Action Plan</option>
                <option value="gratitude">Gratitude</option>
                <option value="summary">Summary</option>
              </select>
            </div>
          </div>

          {/* Entries Grid / List */}
          {isLoading ? (
            <div className="py-16 text-center text-stone-500 text-sm">
              <div className="inline-block w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-2" />
              <p>Loading your private reflections from Firestore...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-white border border-dashed border-stone-300 space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-800">
                {searchQuery ? 'No matching reflections found' : 'No reflections recorded yet'}
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {searchQuery 
                  ? 'Try tweaking your search keywords or filter settings.' 
                  : 'Start your very first session to converse with Gemini and unlock long-term memory.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => onNewReflection('deep_reflection')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start First Reflection</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEntries.map(entry => {
                const badge = INTENT_BADGES[entry.intent] || INTENT_BADGES.deep_reflection;
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className="p-5 rounded-2xl bg-white border border-stone-200/90 hover:border-stone-400 hover:shadow-xs transition cursor-pointer flex flex-col justify-between group space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${badge.bg} ${badge.text}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>

                        <span className="text-[11px] text-stone-400 font-mono">
                          {new Date(entry.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <h4 className="font-serif text-base font-bold text-stone-900 group-hover:text-stone-800 line-clamp-1">
                        {entry.title}
                      </h4>

                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {entry.summary || (entry.messages[0]?.content ?? 'No content yet')}
                      </p>
                    </div>

                    {/* Bottom Metadata & Delete Action */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-stone-400">
                          {entry.messages.length} {entry.messages.length === 1 ? 'turn' : 'turns'}
                        </span>
                        {entry.insights && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                            <Sparkles className="w-2.5 h-2.5" /> Synthesized
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handlePromptDelete(e, entry)}
                          className="p-1.5 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Reflection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ArrowUpRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* In-App Confirmation Modal for Deleting Reflection */}
      {entryToDelete && (
        <div 
          id="delete-confirmation-backdrop"
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isDeleting && setEntryToDelete(null)}
        >
          <div 
            id="delete-confirmation-modal"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Delete Reflection?
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-semibold text-stone-900">"{entryToDelete.title}"</span>? This will remove the conversation history and synthesis from Firestore.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-delete-btn"
                type="button"
                disabled={isDeleting}
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Reflection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

