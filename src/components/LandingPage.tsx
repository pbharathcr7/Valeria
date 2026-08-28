import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ShieldCheck, 
  BrainCircuit, 
  ArrowRight, 
  Lock, 
  BookOpen, 
  Flame, 
  Clock, 
  Search, 
  Bot,
  Lightbulb,
  FileCheck
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, isLoading, error }) => {
  return (
    <div id="landing-page" className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs">
              <BrainCircuit className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-stone-900">MindMirror</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                Cognitive Journal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="nav-signin-button"
              onClick={onSignIn}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-[0.98] transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-stone-300 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex-1 flex flex-col justify-center">
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
            <span className="font-semibold">Authentication Notice:</span> {error}
          </div>
        )}

        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Powered by Gemini 3.6 Flash & Cloud Firestore</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 leading-[1.15]">
            Your second brain for <span className="italic text-stone-600 font-normal">thinking</span>, not just writing.
          </h1>

          <p className="text-lg sm:text-xl text-stone-600 font-normal max-w-2xl mx-auto leading-relaxed">
            MindMirror transforms journaling into an ongoing, structured dialogue with Gemini. 
            Reflect on difficult choices, brainstorm breakthrough ideas, and uncover latent patterns in your thinking.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-signin-button"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-semibold rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-[0.98] transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating with Google...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-6 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Isolated Firestore Security
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500" /> Private & Encrypted
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto w-full">
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:border-stone-300 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-900">Multi-Turn AI Dialogue</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Don't just write monologue notes. Converse with Gemini 3.6 Flash using Socratic questions, cognitive restructuring, and brainstorming.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:border-stone-300 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-900">User Data Isolation</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Every journal entry is strictly scoped to your authenticated Firebase UID. No cross-user leaks, protected by rigorous Firestore security rules.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:border-stone-300 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-900">Instant Synthesis & History</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Synthesize key takeaways, identify recurring cognitive themes, formulate action items, and browse past reflection sessions at any time.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <p>MindMirror — Google AI Studio Developer Challenge 2026</p>
      </footer>
    </div>
  );
};
