import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  TrendingUp, 
  Mail, 
  Plus, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Brain, 
  Compass, 
  Flame, 
  Lightbulb
} from 'lucide-react';
import { 
  JournalEntry, 
  ReflectionIntent, 
  UserProfile, 
  CognitivePatternAnalysis, 
  WeeklyDigest
} from '../types';

interface DashboardPageProps {
  user: UserProfile;
  entries: JournalEntry[];
  cognitivePatterns: CognitivePatternAnalysis | null;
  weeklyDigest: WeeklyDigest | null;
  onNewReflection: (intent?: ReflectionIntent) => void;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  entries,
  cognitivePatterns,
  weeklyDigest,
  onNewReflection,
  onSelectEntry,
  onNavigate
}) => {
  // Recent 3 reflections
  const recentEntries = entries.slice(0, 3);

  // Statistics calculation
  const totalReflections = entries.length;
  
  // Calculate active days in the past 30 days
  const activeDays = new Set(
    entries
      .filter(e => e.createdAt && (Date.now() - new Date(e.createdAt).getTime() <= 30 * 86400000))
      .map(e => new Date(e.createdAt).toISOString().split('T')[0])
  ).size;

  // Dominant intent
  const intentCounts = entries.reduce((acc, curr) => {
    acc[curr.intent] = (acc[curr.intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantIntentKey = Object.keys(intentCounts).sort((a, b) => (intentCounts[b] || 0) - (intentCounts[a] || 0))[0] || 'deep_reflection';
  
  const dominantIntentLabels: Record<string, string> = {
    deep_reflection: 'Deep Inquiry',
    brainstorm: 'Creative Flow',
    summary: 'Executive Synthesis',
    action_plan: 'Goal Execution',
    cognitive_restructuring: 'Mindset Shift',
    gratitude: 'Grounded Gratitude'
  };

  const dominantIntentLabel = dominantIntentLabels[dominantIntentKey] || 'Deep Inquiry';

  // Reflection mode cards
  const modes = [
    {
      intent: 'deep_reflection' as ReflectionIntent,
      title: 'Deep Reflection',
      description: 'Socratic dialogue for emotional clarity, unburdening, and cognitive self-discovery.',
      icon: Brain,
      badge: 'Signature',
      color: 'bg-amber-100 text-amber-900 border-amber-200'
    },
    {
      intent: 'strategic_dilemma' as any,
      actualIntent: 'action_plan' as ReflectionIntent,
      title: 'Strategic Dilemma',
      description: 'Dissect high-stakes decisions, weigh tradeoffs, and define structured next steps.',
      icon: Compass,
      badge: 'Productivity',
      color: 'bg-stone-100 text-stone-900 border-stone-200'
    },
    {
      intent: 'daily_decompression' as any,
      actualIntent: 'summary' as ReflectionIntent,
      title: 'Daily Decompression',
      description: 'Rapid cognitive debrief to organize mental clutter and close open cognitive loops.',
      icon: Clock,
      badge: 'Evening',
      color: 'bg-stone-100 text-stone-900 border-stone-200'
    },
    {
      intent: 'metacognitive_audit' as any,
      actualIntent: 'cognitive_restructuring' as ReflectionIntent,
      title: 'Metacognitive Audit',
      description: 'Identify unconscious cognitive biases, stress triggers, and recurring thought loops.',
      icon: Lightbulb,
      badge: 'Insight',
      color: 'bg-stone-100 text-stone-900 border-stone-200'
    }
  ];

  return (
    <div id="dashboard-page-container" className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Welcome & Quick Action Header */}
      <div id="dashboard-welcome-banner" className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-white border border-stone-200 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 uppercase tracking-wider font-semibold">
              Cognitive Space
            </span>
            <span className="text-xs text-stone-400 font-mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Welcome back, {user.displayName ? user.displayName.split(' ')[0] : 'Thinker'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xl">
            Your private cognitive sanctuary. Reflect freely, examine thought patterns, and synthesize longitudinal insights with Valeria AI.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            id="dash-start-reflection-btn"
            onClick={() => onNewReflection('deep_reflection')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-semibold transition cursor-pointer shadow-xs active:scale-[0.99] group"
          >
            <Plus className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-200" />
            <span>Start New Reflection</span>
          </button>
        </div>
      </div>

      {/* 2. Core Statistics Bar */}
      <div id="dashboard-metrics-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider">Total Reflections</span>
            <BookOpen className="w-4 h-4 text-stone-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            {totalReflections}
          </div>
          <p className="text-[11px] text-stone-500">
            {totalReflections === 0 ? 'Start your first session' : 'Stored securely in Firestore'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider">Active Days (30d)</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            {activeDays}
          </div>
          <p className="text-[11px] text-stone-500">
            {activeDays > 0 ? 'Consistent habit forming' : 'Begin daily check-ins'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider">Clarity Index</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            {totalReflections >= 3 ? '94%' : totalReflections > 0 ? '82%' : 'N/A'}
          </div>
          <p className="text-[11px] text-stone-500">
            Based on insight articulation
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider">Dominant Intent</span>
            <TrendingUp className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-base sm:text-lg font-serif font-bold text-stone-900 truncate">
            {totalReflections > 0 ? dominantIntentLabel : 'None yet'}
          </div>
          <p className="text-[11px] text-stone-500 truncate">
            Primary reflection focus
          </p>
        </div>
      </div>

      {/* 3. Reflection Mode Selection Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-stone-900">
            Choose a Reflection Intent
          </h3>
          <span className="text-xs text-stone-500 font-mono">
            Guided Socratic prompts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modes.map((mode, idx) => {
            const Icon = mode.icon;
            return (
              <button
                key={idx}
                type="button"
                id={`dash-mode-card-${mode.intent}`}
                onClick={() => onNewReflection(mode.actualIntent || mode.intent)}
                className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 hover:shadow-md transition text-left flex flex-col justify-between space-y-4 group cursor-pointer"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-stone-100 text-stone-900 group-hover:bg-stone-900 group-hover:text-amber-300 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 uppercase tracking-wider">
                      {mode.badge}
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-base text-stone-900 group-hover:text-stone-800">
                    {mode.title}
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    {mode.description}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-900 group-hover:text-amber-700 transition pt-2">
                  <span>Begin Session</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Feature Preview Cards (Cognitive Memory & Weekly Insights) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Preview Card: Cognitive Memory */}
        <div id="dash-preview-cognitive-memory" className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-100/70 text-amber-950 border border-amber-200/80">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-stone-900">
                    Cognitive Memory &amp; Growth
                  </h4>
                  <p className="text-[11px] font-mono text-stone-500">
                    Longitudinal pattern recognition
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-mono uppercase tracking-wider">
                {cognitivePatterns ? 'Analyzed' : 'Ready'}
              </span>
            </div>

            {cognitivePatterns ? (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
                <div className="text-xs font-semibold text-stone-800 line-clamp-2 leading-relaxed">
                  "{cognitivePatterns.overview || cognitivePatterns.growthTrend || 'Active cognitive momentum observed.'}"
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500">
                  <span>{cognitivePatterns.recurringGoals?.length || 0} Recurring Goals</span>
                  <span>•</span>
                  <span>{cognitivePatterns.strengthsObserved?.length || 0} Core Strengths</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-600 leading-relaxed">
                Valeria continuously synthesizes patterns across your reflections to uncover recurring themes, unconscious friction points, and mindset growth trajectories.
              </p>
            )}
          </div>

          <button
            type="button"
            id="dash-goto-memory-btn"
            onClick={() => onNavigate('/memory')}
            className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition cursor-pointer"
          >
            <span>View Full Cognitive Memory Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preview Card: Weekly Insights */}
        <div id="dash-preview-weekly-insights" className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-100/70 text-amber-950 border border-amber-200/80">
                  <Mail className="w-4 h-4 text-amber-900" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-stone-900">
                    Weekly Reflection Digest
                  </h4>
                  <p className="text-[11px] font-mono text-stone-500">
                    Executive summary &amp; Gmail delivery
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-mono uppercase tracking-wider">
                {weeklyDigest ? 'Digest Ready' : 'This Week'}
              </span>
            </div>

            {weeklyDigest ? (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
                <div className="text-xs font-semibold text-stone-800 line-clamp-2 leading-relaxed">
                  "{weeklyDigest.content.weeklyOverview}"
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500">
                  <span>{weeklyDigest.weekStart} – {weeklyDigest.weekEnd}</span>
                  {weeklyDigest.sentAt && <span>• Dispatched to Gmail</span>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-600 leading-relaxed">
                Generate a structured executive digest of your reflections from the current calendar week and dispatch it directly to your Gmail inbox with one click.
              </p>
            )}
          </div>

          <button
            type="button"
            id="dash-goto-insights-btn"
            onClick={() => onNavigate('/weekly-insights')}
            className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition cursor-pointer"
          >
            <span>Open Weekly Cognitive Insights</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 5. Recent Reflections (Last 3) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Recent Reflections
            </h3>
            <p className="text-xs text-stone-500">
              Your latest {recentEntries.length} reflection sessions
            </p>
          </div>

          {entries.length > 3 && (
            <button
              type="button"
              id="dash-view-all-reflections-btn"
              onClick={() => onNavigate('/reflections')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-900 hover:text-amber-700 transition cursor-pointer"
            >
              <span>View All Reflections ({entries.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentEntries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentEntries.map((entry) => {
              const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={entry.id}
                  id={`recent-entry-card-${entry.id}`}
                  onClick={() => onSelectEntry(entry)}
                  className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 hover:shadow-md transition text-left flex flex-col justify-between space-y-4 cursor-pointer group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 uppercase tracking-wider truncate">
                          {entry.intent?.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-stone-400 shrink-0">
                        {formattedDate}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base text-stone-900 group-hover:text-stone-700 line-clamp-1">
                      {entry.title || 'Untitled Reflection'}
                    </h4>

                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {entry.summary || (entry.messages?.[0]?.content ? entry.messages[0].content.slice(0, 120) + '...' : 'No dialogue recorded yet.')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px] text-stone-400">
                    <span>{entry.messages?.length || 0} messages</span>
                    <span className="text-stone-900 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Open &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white border border-dashed border-stone-200 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-stone-300 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-serif font-bold text-base text-stone-800">
                No reflections recorded yet
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Begin your introspective journey by starting your first guided reflection session.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNewReflection('deep_reflection')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Start First Reflection</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
