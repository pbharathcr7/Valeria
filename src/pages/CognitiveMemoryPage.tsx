import React, { useState } from 'react';
import { 
  Brain, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  Plus, 
  TrendingUp, 
  Target, 
  Compass,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { JournalEntry, CognitivePatternAnalysis, ReflectionIntent } from '../types';
import { CognitivePatternsView } from '../components/CognitivePatternsView';

interface CognitiveMemoryPageProps {
  userId: string;
  entries: JournalEntry[];
  patterns: CognitivePatternAnalysis | null;
  onSynthesizePatterns: () => Promise<void>;
  isSynthesizing?: boolean;
  error?: string | null;
  onNewReflection: (intent?: ReflectionIntent) => void;
}

export const CognitiveMemoryPage: React.FC<CognitiveMemoryPageProps> = ({
  userId,
  entries,
  patterns,
  onSynthesizePatterns,
  isSynthesizing = false,
  error = null,
  onNewReflection
}) => {
  return (
    <div id="cognitive-memory-page-container" className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 uppercase tracking-wider font-semibold">
              Long-Term Metacognition
            </span>
            <span className="text-xs text-stone-500 font-mono">
              {entries.length} Reflections Available
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Cognitive Memory &amp; Growth
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl">
            Discover recurring thought patterns, emotional shifts, and long-term personal growth synthesized across your reflections.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            id="synthesize-patterns-main-btn"
            onClick={onSynthesizePatterns}
            disabled={entries.length === 0 || isSynthesizing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.99]"
          >
            {isSynthesizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                <span>Synthesizing Longitudinal Patterns...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{patterns ? 'Re-analyze Patterns' : 'Synthesize Patterns'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Patterns Content / Empty States */}
      {patterns ? (
        <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100/70 text-amber-950 border border-amber-200/80">
                <Brain className="w-5 h-5 text-amber-900" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Your Cognitive Growth Story
                </h3>
                <p className="text-xs text-stone-500 font-mono">
                  Synthesized from {patterns.entryCount || entries.length} reflection sessions • Stored in Firestore
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-medium">Private &amp; Tenant-Isolated</span>
            </div>
          </div>

          <CognitivePatternsView
            patterns={patterns}
            onRefresh={onSynthesizePatterns}
            isRefreshing={isSynthesizing}
          />
        </div>
      ) : entries.length >= 2 ? (
        <div className="p-10 rounded-2xl bg-white border border-dashed border-stone-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Ready for Cognitive Synthesis
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              You have {entries.length} reflections recorded. Click below to let Gemini analyze your recurring ambitions, cognitive friction points, and mindset growth trajectory.
            </p>
          </div>
          <button
            type="button"
            onClick={onSynthesizePatterns}
            disabled={isSynthesizing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            {isSynthesizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                <span>Analyzing Reflections...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Synthesize Patterns Now</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-white border border-dashed border-stone-200 text-center space-y-4">
          <Brain className="w-10 h-10 text-stone-300 mx-auto" />
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              More Reflections Needed
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Long-term cognitive pattern synthesis requires at least 2 reflection entries to detect recurring themes, friction points, and mindset evolution trends.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNewReflection('deep_reflection')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Start a Reflection Session</span>
          </button>
        </div>
      )}
    </div>
  );
};
