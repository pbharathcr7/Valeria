import React, { useState } from 'react';
import { 
  Mail, 
  Sparkles, 
  RefreshCw, 
  Calendar, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Target, 
  ShieldCheck,
  FileText,
  ExternalLink,
  Plus
} from 'lucide-react';
import { WeeklyDigest, JournalEntry, UserProfile, CognitivePatternAnalysis, ReflectionIntent } from '../types';
import { WeeklyDigestModal } from '../components/WeeklyDigestModal';
import { WeeklyVisualAnalytics } from '../components/WeeklyVisualAnalytics';
import { getWeekBounds, formatLocalDate } from '../lib/dateUtils';

interface WeeklyInsightsPageProps {
  user: UserProfile;
  entries: JournalEntry[];
  weeklyDigest: WeeklyDigest | null;
  cognitivePatterns: CognitivePatternAnalysis | null;
  onGenerateDigest: () => Promise<void>;
  isGenerating?: boolean;
  error?: string | null;
  onNewReflection: (intent?: ReflectionIntent) => void;
  onSendDigestEmail: (recipientEmail?: string) => Promise<any>;
}

export const WeeklyInsightsPage: React.FC<WeeklyInsightsPageProps> = ({
  user,
  entries,
  weeklyDigest,
  cognitivePatterns,
  onGenerateDigest,
  isGenerating = false,
  error = null,
  onNewReflection,
  onSendDigestEmail
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Calculate current week bounds in strict local calendar time
  const { monday, sunday, weekStart: weekStartStr, weekEnd: weekEndStr } = getWeekBounds();

  // Current week entries matching the 7 calendar days
  const currentWeekEntries = entries.filter(e => {
    if (!e.createdAt) return false;
    const entryDateStr = formatLocalDate(new Date(e.createdAt));
    return entryDateStr >= weekStartStr && entryDateStr <= weekEndStr;
  });

  const handleSendEmail = async () => {
    if (!weeklyDigest) return;
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await onSendDigestEmail(user.email || undefined);
      setEmailStatus({
        success: true,
        message: res?.previewMode 
          ? `Digest prepared for ${user.email || 'your email'} (Workspace OAuth integration enabled)`
          : `Weekly reflection digest successfully sent to ${user.email}!`
      });
    } catch (err: any) {
      setEmailStatus({
        success: false,
        message: err?.message || 'Failed to dispatch email via Gmail API.'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div id="weekly-insights-page-container" className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 uppercase tracking-wider font-semibold">
              Weekly Synthesis &amp; Gmail
            </span>
            <span className="text-xs text-stone-500 font-mono">
              Week: {weekStartStr} – {weekEndStr}
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Weekly Cognitive Insights
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl">
            Synthesize weekly reflection highlights into an executive summary and send structured digests directly to your Gmail inbox.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            id="generate-weekly-digest-main-btn"
            onClick={onGenerateDigest}
            disabled={entries.length === 0 || isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.99]"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                <span>Synthesizing Weekly Digest...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{weeklyDigest ? 'Regenerate Weekly Digest' : "Generate This Week's Digest"}</span>
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

      {/* Email Status Alert */}
      {emailStatus && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
          emailStatus.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          {emailStatus.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>{emailStatus.message}</span>
        </div>
      )}

      {/* 2. Visual Analytics Summary Layer */}
      <WeeklyVisualAnalytics
        entries={entries}
        weeklyDigest={weeklyDigest}
        weekStart={weekStartStr}
        weekEnd={weekEndStr}
        isLoading={isGenerating}
      />

      {/* 3. Main Weekly Digest View */}
      {weeklyDigest ? (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-6">
            
            {/* Digest Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100/70 text-amber-950 border border-amber-200/80">
                  <Mail className="w-5 h-5 text-amber-900" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">
                    Executive Digest: {weeklyDigest.weekStart} to {weeklyDigest.weekEnd}
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    Synthesized from {weeklyDigest.entryCount} reflection session{weeklyDigest.entryCount === 1 ? '' : 's'}
                    {weeklyDigest.generatedAt && ` • Generated ${new Date(weeklyDigest.generatedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="weekly-send-gmail-btn"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSendingEmail ? 'Dispatching to Gmail...' : 'Send to Gmail'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-medium transition cursor-pointer"
                >
                  Open Modal View
                </button>
              </div>
            </div>

            {/* Digest Sections */}
            <div className="space-y-4">
              {/* Executive Overview */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-stone-500 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Executive Overview</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-sans">
                  {weeklyDigest.content.weeklyOverview}
                </p>
              </div>

              {/* Wins & Challenges Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-800 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Biggest Win / Breakthrough</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
                    {weeklyDigest.content.biggestWin}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-900 uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Primary Friction / Challenge</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
                    {weeklyDigest.content.biggestChallenge}
                  </p>
                </div>
              </div>

              {/* Growth Insight */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-stone-500 uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-stone-700" />
                  <span>Metacognitive Growth Insight</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
                  {weeklyDigest.content.growthInsight}
                </p>
              </div>

              {/* Next Week Focus */}
              {weeklyDigest.content.nextWeekFocus && weeklyDigest.content.nextWeekFocus.length > 0 && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-stone-500 uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5 text-stone-700" />
                    <span>Next Week Strategic Focus</span>
                  </div>
                  <div className="space-y-1.5">
                    {weeklyDigest.content.nextWeekFocus.map((focus, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-900 mt-1.5 shrink-0" />
                        <span>{focus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-white border border-dashed border-stone-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              No Digest Generated for This Week
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              {entries.length > 0
                ? `You have ${currentWeekEntries.length > 0 ? currentWeekEntries.length : entries.length} reflection entries available. Generate your weekly executive synthesis to review your momentum and dispatch to Gmail.`
                : 'Complete reflection sessions this week to generate an executive synthesis.'}
            </p>
          </div>

          {entries.length > 0 ? (
            <button
              type="button"
              onClick={onGenerateDigest}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Synthesizing Digest...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate This Week's Digest</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNewReflection('deep_reflection')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Start a Reflection Session</span>
            </button>
          )}
        </div>
      )}

      {/* Popup Modal View */}
      {weeklyDigest && (
        <WeeklyDigestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          digest={weeklyDigest}
          user={user}
          onRegenerate={onGenerateDigest}
          isRegenerating={isGenerating}
          onDigestUpdated={(updated) => {
            // Updated handled internally
          }}
        />
      )}
    </div>
  );
};
