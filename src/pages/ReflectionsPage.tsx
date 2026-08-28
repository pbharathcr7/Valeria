import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  Tag, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Filter, 
  X,
  AlertTriangle,
  FileText,
  Sparkles
} from 'lucide-react';
import { JournalEntry, ReflectionIntent } from '../types';

interface ReflectionsPageProps {
  entries: JournalEntry[];
  onNewReflection: (intent?: ReflectionIntent) => void;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  isLoading?: boolean;
}

export const ReflectionsPage: React.FC<ReflectionsPageProps> = ({
  entries,
  onNewReflection,
  onSelectEntry,
  onDeleteEntry,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<string>('all');
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const intentOptions: { id: string; label: string }[] = [
    { id: 'all', label: 'All Intents' },
    { id: 'deep_reflection', label: 'Deep Reflection' },
    { id: 'brainstorm', label: 'Brainstorm' },
    { id: 'action_plan', label: 'Action Plan' },
    { id: 'cognitive_restructuring', label: 'Cognitive Restructuring' },
    { id: 'summary', label: 'Summary' },
    { id: 'gratitude', label: 'Gratitude' }
  ];

  // Filter entries based on search & intent
  const filteredEntries = entries.filter(entry => {
    const matchesIntent = selectedIntent === 'all' || entry.intent === selectedIntent;
    
    if (!searchQuery.trim()) return matchesIntent;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = entry.title?.toLowerCase().includes(query);
    const summaryMatch = entry.summary?.toLowerCase().includes(query);
    const tagsMatch = entry.tags?.some(tag => tag.toLowerCase().includes(query));
    const contentMatch = entry.messages?.some(m => m.content?.toLowerCase().includes(query));
    const themesMatch = entry.insights?.keyThemes?.some(theme => theme.toLowerCase().includes(query));

    return matchesIntent && (titleMatch || summaryMatch || tagsMatch || contentMatch || themesMatch);
  });

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteEntry(entryToDelete.id);
      setEntryToDelete(null);
    } catch (err) {
      console.error('Failed to delete entry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="reflections-page-container" className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 uppercase tracking-wider font-semibold">
              Archive &amp; Inquiries
            </span>
            <span className="text-xs text-stone-500 font-mono">
              {entries.length} Total Saved
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Past Reflections
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl">
            Explore your complete introspective history, search key themes, and revisit previous dialogues.
          </p>
        </div>

        <button
          type="button"
          id="reflections-new-btn"
          onClick={() => onNewReflection('deep_reflection')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs shrink-0 group"
        >
          <Plus className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-200" />
          <span>New Reflection</span>
        </button>
      </div>

      {/* 2. Search & Intent Filters */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="reflections-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reflections by title, key insights, themes, or message contents..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 text-xs sm:text-sm transition text-stone-900 placeholder:text-stone-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Intent filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {intentOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              id={`filter-intent-${opt.id}`}
              onClick={() => setSelectedIntent(opt.id)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition cursor-pointer ${
                selectedIntent === opt.id
                  ? 'bg-stone-900 text-stone-50 shadow-2xs font-semibold'
                  : 'bg-stone-100/90 text-stone-600 hover:bg-stone-200/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Reflections Grid / List */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-stone-200">
          <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-stone-500">Loading your reflections from Cloud Firestore...</p>
        </div>
      ) : filteredEntries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => {
            const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            // Action count badges
            const calendarCount = entry.messages?.flatMap(m => m.actions || []).filter(a => a.type === 'calendar').length || 0;
            const mapsCount = entry.messages?.flatMap(m => m.actions || []).filter(a => a.type === 'maps').length || 0;

            return (
              <div
                key={entry.id}
                id={`reflection-card-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 hover:shadow-md transition text-left flex flex-col justify-between space-y-4 cursor-pointer group relative"
              >
                <div className="space-y-3">
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 uppercase tracking-wider truncate">
                      {entry.intent?.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-stone-400">
                        {formattedDate}
                      </span>
                      <button
                        type="button"
                        id={`delete-entry-btn-${entry.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEntryToDelete(entry);
                        }}
                        className="p-1 text-stone-300 hover:text-rose-600 transition rounded hover:bg-rose-50 cursor-pointer"
                        title="Delete reflection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <div>
                    <h4 className="font-serif font-bold text-base text-stone-900 group-hover:text-stone-800 line-clamp-1">
                      {entry.title || 'Untitled Reflection'}
                    </h4>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                      {entry.summary || (entry.messages?.[0]?.content ? entry.messages[0].content.slice(0, 140) + '...' : 'No dialogue recorded yet.')}
                    </p>
                  </div>

                  {/* Tags / Key Themes */}
                  {((entry.tags && entry.tags.length > 0) || (entry.insights?.keyThemes && entry.insights.keyThemes.length > 0)) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(entry.tags || entry.insights?.keyThemes || []).slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-medium"
                        >
                          <Tag className="w-2.5 h-2.5 text-stone-400" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Detected Action Indicators */}
                  {(calendarCount > 0 || mapsCount > 0) && (
                    <div className="flex items-center gap-2 pt-1">
                      {calendarCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          <Calendar className="w-2.5 h-2.5 text-amber-700" />
                          <span>{calendarCount} Event{calendarCount === 1 ? '' : 's'}</span>
                        </span>
                      )}
                      {mapsCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                          <MapPin className="w-2.5 h-2.5 text-stone-500" />
                          <span>{mapsCount} Place{mapsCount === 1 ? '' : 's'}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-[11px] text-stone-400">
                  <span className="font-mono">{entry.messages?.length || 0} messages</span>
                  <span className="font-semibold text-stone-900 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    <span>Revisit</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-white border border-dashed border-stone-200 text-center space-y-4">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-serif font-bold text-base text-stone-800">
              {searchQuery || selectedIntent !== 'all' ? 'No matching reflections found' : 'No reflections recorded yet'}
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {searchQuery || selectedIntent !== 'all' 
                ? 'Try adjusting your search query or removing intent filters to view other entries.' 
                : 'Start your first guided reflection session with Gemini to build your cognitive archive.'}
            </p>
          </div>

          {searchQuery || selectedIntent !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedIntent('all');
              }}
              className="px-4 py-2 rounded-xl bg-stone-100 text-stone-800 text-xs font-semibold hover:bg-stone-200 transition cursor-pointer"
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNewReflection('deep_reflection')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Start Reflection</span>
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div 
          id="delete-confirmation-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-stone-200 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Delete Reflection?
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-stone-900">"{entryToDelete.title || 'Untitled'}"</strong>? This will permanently remove this reflection session and its dialogue history from Cloud Firestore.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-entry-btn"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
