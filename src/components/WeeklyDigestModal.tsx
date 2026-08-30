import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Sparkles, 
  Calendar, 
  Trophy, 
  AlertCircle, 
  TrendingUp, 
  Lightbulb, 
  CheckCircle2, 
  RefreshCw,
  Send,
  Loader2,
  Check
} from 'lucide-react';
import { WeeklyDigest, UserProfile } from '../types';
import { sendWeeklyDigestEmail } from '../lib/gmailService';
import { saveWeeklyDigest } from '../lib/firebase';

interface WeeklyDigestModalProps {
  digest: WeeklyDigest;
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: () => Promise<void>;
  isRegenerating: boolean;
  onDigestUpdated: (updated: WeeklyDigest) => void;
}

export const WeeklyDigestModal: React.FC<WeeklyDigestModalProps> = ({
  digest,
  user,
  isOpen,
  onClose,
  onRegenerate,
  isRegenerating,
  onDigestUpdated
}) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const { content, weekStart, weekEnd, entryCount } = digest;

  const handleSendToGmail = async () => {
    if (!user?.email) {
      setErrorMessage('No authenticated Google email found. Please ensure you are signed in.');
      return;
    }

    setIsSendingEmail(true);
    setErrorMessage(null);
    setSendSuccess(false);

    try {
      await sendWeeklyDigestEmail(digest, user.email, user.displayName || undefined);
      
      const sentTimestamp = new Date().toISOString();
      const updatedDigest: WeeklyDigest = {
        ...digest,
        sentAt: sentTimestamp,
        recipientEmail: user.email
      };

      // Persist sentAt to Firestore
      if (user.uid) {
        await saveWeeklyDigest(user.uid, digest.id, updatedDigest);
      }

      onDigestUpdated(updatedDigest);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to send Weekly Digest to Gmail:', err);
      setErrorMessage(err?.message || 'Could not send digest via Gmail. Please grant permissions and retry.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div 
      id="weekly-digest-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="weekly-digest-modal-panel"
        className="relative w-full max-w-2xl bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-stone-900 text-stone-50 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-mono uppercase tracking-wider font-semibold">
                Valeria Synthesis
              </span>
              <div className="flex items-center gap-1.5 text-xs text-stone-400 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>{weekStart} – {weekEnd}</span>
              </div>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
              Weekly Reflection Digest
            </h2>
            <p className="text-xs text-stone-400">
              Synthesized from {entryCount} reflection session{entryCount === 1 ? '' : 's'} this week
            </p>
          </div>

          <button
            type="button"
            id="close-digest-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banners */}
        {sendSuccess && (
          <div 
            id="digest-send-success-toast"
            className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5 animate-in slide-in-from-top-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Digest sent to {user.email}!</span> Check your Gmail inbox for your formatted cognitive summary.
            </div>
          </div>
        )}

        {errorMessage && (
          <div 
            id="digest-send-error-toast"
            className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between gap-2 animate-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleSendToGmail}
              className="px-2.5 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold text-[11px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Section 1: Weekly Overview */}
          <div 
            id="digest-section-overview"
            className="p-4 sm:p-5 rounded-xl bg-stone-50 border border-stone-200/90 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-stone-600 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Weekly Overview</span>
            </div>
            <p className="text-sm font-sans text-stone-800 leading-relaxed font-medium">
              {content.weeklyOverview}
            </p>
          </div>

          {/* Section 2: Win & Challenge Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Biggest Win */}
            <div 
              id="digest-section-win"
              className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2"
            >
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-900 uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-amber-700" />
                <span>Biggest Win</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                {content.biggestWin}
              </p>
            </div>

            {/* Biggest Challenge */}
            <div 
              id="digest-section-challenge"
              className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-2"
            >
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-rose-900 uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                <span>Biggest Challenge</span>
              </div>
              <p className="text-xs sm:text-sm text-rose-950 leading-relaxed">
                {content.biggestChallenge}
              </p>
            </div>
          </div>

          {/* Section 3: Growth Insight */}
          <div 
            id="digest-section-growth"
            className="p-4 sm:p-5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-900 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
              <span>Growth Insight</span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed">
              {content.growthInsight}
            </p>
          </div>

          {/* Section 4: Next Week Focus */}
          <div 
            id="digest-section-next-focus"
            className="p-4 sm:p-5 rounded-xl bg-white border border-stone-200 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-stone-700 uppercase tracking-wider">
              <Lightbulb className="w-3.5 h-3.5 text-stone-800" />
              <span>Next Week Focus</span>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-800">
              {content.nextWeekFocus.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-900 mt-2 shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sent Timestamp Meta */}
          {digest.sentAt && (
            <div className="text-center text-[11px] font-mono text-stone-400">
              Dispatched via Gmail on {new Date(digest.sentAt).toLocaleString()} to {digest.recipientEmail || user.email}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            id="regenerate-digest-btn"
            onClick={onRegenerate}
            disabled={isRegenerating || isSendingEmail}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Digest'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition cursor-pointer"
            >
              Done
            </button>

            <button
              type="button"
              id="send-to-gmail-btn"
              onClick={handleSendToGmail}
              disabled={isSendingEmail || isRegenerating}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending via Gmail...</span>
                </>
              ) : sendSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sent to Gmail</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 text-amber-300" />
                  <span>Send to Gmail</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
