import React, { useState } from 'react';
import { 
  Target, 
  AlertCircle, 
  Sparkles, 
  TrendingUp, 
  Lightbulb, 
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CognitivePatternAnalysis } from '../types';

interface CognitivePatternsViewProps {
  patterns: CognitivePatternAnalysis;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/**
 * Format a human-readable, rich Markdown narrative from the structured patterns
 * so that raw JSON or syntax tokens are NEVER exposed in the UI.
 */
function formatCleanNarrative(patterns: CognitivePatternAnalysis): string {
  // If rawAnalysis exists and is already clean markdown (not starting with { or ```json)
  if (
    patterns.rawAnalysis && 
    !patterns.rawAnalysis.trim().startsWith('{') && 
    !patterns.rawAnalysis.trim().startsWith('```json') &&
    !patterns.rawAnalysis.trim().startsWith('```')
  ) {
    return patterns.rawAnalysis;
  }

  // Construct a polished, readable cognitive narrative
  const sections: string[] = [];

  if (patterns.overview) {
    sections.push(`### 🧠 Executive Synthesis\n${patterns.overview}`);
  }

  if (patterns.growthTrend) {
    sections.push(`### 📈 Mindset Evolution & Trajectory\n${patterns.growthTrend}`);
  }

  if (patterns.recurringGoals && patterns.recurringGoals.length > 0) {
    sections.push(`### 🎯 Recurring Ambitions & Desired States\n${patterns.recurringGoals.map(g => `- **Ambition**: ${g}`).join('\n')}`);
  }

  if (patterns.recurringChallenges && patterns.recurringChallenges.length > 0) {
    sections.push(`### ⚖️ Friction Points & Cognitive Hurdles\n${patterns.recurringChallenges.map(c => `- **Friction Point**: ${c}`).join('\n')}`);
  }

  if (patterns.strengthsObserved && patterns.strengthsObserved.length > 0) {
    sections.push(`### 🌟 Metacognitive & Resilience Strengths\n${patterns.strengthsObserved.map(s => `- **Strength**: ${s}`).join('\n')}`);
  }

  if (patterns.recommendedFocus && patterns.recommendedFocus.length > 0) {
    sections.push(`### 🧭 Strategic Focus for Next Reflections\n${patterns.recommendedFocus.map(f => `- **Focus Area**: ${f}`).join('\n')}`);
  }

  return sections.join('\n\n') || 'Cognitive analysis synthesis complete across your past reflections.';
}

export const CognitivePatternsView: React.FC<CognitivePatternsViewProps> = ({
  patterns,
  onRefresh,
  isRefreshing = false
}) => {
  // Detailed narrative defaults to collapsed
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(false);

  const formattedDate = patterns.analyzedAt 
    ? new Date(patterns.analyzedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : 'Recently';

  const cleanNarrative = formatCleanNarrative(patterns);

  return (
    <div id="cognitive-patterns-container" className="space-y-4 pt-1">
      {/* 1. Visible Top Executive Summary & Metadata Banner */}
      <div 
        id="cognitive-overview-banner"
        className="p-5 rounded-2xl bg-stone-100/90 border border-stone-200/90 space-y-2 shadow-2xs"
      >
        <div className="flex items-center gap-2 text-xs font-mono text-stone-500 uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5 text-stone-600" />
          <span>Last Analyzed: {formattedDate}</span>
          <span>•</span>
          <span>{patterns.entryCount || 0} Reflections Synthesized</span>
        </div>
        
        {patterns.overview ? (
          <p className="text-sm font-medium text-stone-900 leading-relaxed font-sans">
            {patterns.overview}
          </p>
        ) : (
          <p className="text-sm font-medium text-stone-900 leading-relaxed font-sans">
            Overarching cognitive synthesis and longitudinal growth trajectory across your reflections.
          </p>
        )}
      </div>

      {/* 2. Primary 5-Card Structured Cognitive Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Recurring Goals */}
        <div 
          id="card-recurring-goals"
          className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between hover:border-stone-300 transition"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/60">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-stone-900">Recurring Goals</h4>
                <p className="text-[11px] text-stone-500 font-mono">Long-term aspirations &amp; aims</p>
              </div>
            </div>

            {patterns.recurringGoals && patterns.recurringGoals.length > 0 ? (
              <ul className="space-y-2 text-xs text-stone-700">
                {patterns.recurringGoals.map((goal, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{goal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">No recurring goals identified yet.</p>
            )}
          </div>
        </div>

        {/* Card 2: Recurring Challenges */}
        <div 
          id="card-recurring-challenges"
          className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between hover:border-stone-300 transition"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-900 border border-rose-200/60">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-stone-900">Recurring Challenges</h4>
                <p className="text-[11px] text-stone-500 font-mono">Friction points &amp; cognitive biases</p>
              </div>
            </div>

            {patterns.recurringChallenges && patterns.recurringChallenges.length > 0 ? (
              <ul className="space-y-2 text-xs text-stone-700">
                {patterns.recurringChallenges.map((challenge, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{challenge}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">No recurring challenges detected yet.</p>
            )}
          </div>
        </div>

        {/* Card 3: Strengths Gemini Observed */}
        <div 
          id="card-strengths-observed"
          className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between hover:border-stone-300 transition"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
              <div className="p-2 rounded-lg bg-stone-900 text-amber-300 border border-stone-800">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-stone-900">Strengths Gemini Observed</h4>
                <p className="text-[11px] text-stone-500 font-mono">Metacognition &amp; resilience</p>
              </div>
            </div>

            {patterns.strengthsObserved && patterns.strengthsObserved.length > 0 ? (
              <ul className="space-y-2 text-xs text-stone-700">
                {patterns.strengthsObserved.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-800 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">No strengths highlighted yet.</p>
            )}
          </div>
        </div>

        {/* Card 4: Growth Trend (Wide 2-column card) */}
        <div 
          id="card-growth-trend"
          className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between md:col-span-2 lg:col-span-2 hover:border-stone-300 transition"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/60">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-stone-900">Growth Trend</h4>
                <p className="text-[11px] text-stone-500 font-mono">Longitudinal mindset &amp; emotional trajectory</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/70 text-xs text-stone-800 leading-relaxed font-sans">
              {patterns.growthTrend || 'Your reflections show steady cognitive momentum and constructive emotional integration.'}
            </div>
          </div>
        </div>

        {/* Card 5: Recommended Focus */}
        <div 
          id="card-recommended-focus"
          className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between hover:border-stone-300 transition"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
              <div className="p-2 rounded-lg bg-stone-100 text-stone-800 border border-stone-300/80">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-stone-900">Recommended Focus</h4>
                <p className="text-[11px] text-stone-500 font-mono">Next prompt questions &amp; exercises</p>
              </div>
            </div>

            {patterns.recommendedFocus && patterns.recommendedFocus.length > 0 ? (
              <ul className="space-y-2 text-xs text-stone-700">
                {patterns.recommendedFocus.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-800 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">No specific recommendations yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Collapsible "Gemini's Full Cognitive Analysis" Section */}
      <div id="collapsible-full-analysis" className="pt-2">
        <button
          id="toggle-full-analysis-btn"
          type="button"
          onClick={() => setIsNarrativeExpanded(!isNarrativeExpanded)}
          className="w-full flex items-center justify-between p-3.5 px-4 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 border border-stone-200/90 text-stone-800 text-xs font-semibold transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-stone-700" />
            <span className="font-medium">Gemini&apos;s Full Cognitive Analysis</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-500">
            <span>{isNarrativeExpanded ? 'Hide Narrative' : 'Expand Narrative'}</span>
            {isNarrativeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isNarrativeExpanded && (
          <div 
            id="full-cognitive-analysis-content"
            className="mt-3 p-5 rounded-2xl bg-white border border-stone-200 text-xs text-stone-700 prose prose-stone max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:text-stone-900 prose-headings:text-xs prose-headings:mt-3 prose-headings:mb-1.5 prose-p:leading-relaxed prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 shadow-2xs"
          >
            <ReactMarkdown>{cleanNarrative}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
