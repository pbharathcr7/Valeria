import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Database, 
  Mail, 
  Calendar, 
  LogOut, 
  CheckCircle2
} from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsPageProps {
  user: UserProfile;
  onSignOut: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  onSignOut
}) => {
  return (
    <div id="settings-page-container" className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* 1. Page Header */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 uppercase tracking-wider font-semibold">
            Preferences &amp; Security
          </span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Settings &amp; Configuration
        </h2>
        <p className="text-xs sm:text-sm text-stone-500">
          Manage your account profile, AI model parameters, and connected Google services.
        </p>
      </div>

      {/* 2. User Profile Card */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 text-stone-100 font-serif font-bold text-lg flex items-center justify-center overflow-hidden border border-stone-800">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                {user.displayName || 'Authenticated Thinker'}
              </h3>
              <p className="text-xs text-stone-500 font-mono">
                {user.email || 'No email provided'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="settings-signout-btn"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-stone-700 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
          <span className="text-stone-500 font-medium">Authentication Provider</span>
          <span className="font-mono text-stone-800 font-semibold">Google Identity Services (OAuth 2.0)</span>
        </div>
      </div>

      {/* 3. AI Engine */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-stone-900">
              AI Engine
            </h3>
            <p className="text-xs text-stone-500">
              High-intelligence reflection analysis powered by Google Gen AI.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-stone-900 text-sm">Gemini 3.6 Flash</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono text-[10px] font-semibold border border-amber-200">
                Primary
              </span>
            </div>
            <p className="text-stone-500 text-[11px]">
              Reliability: Automatic fallback enabled.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-medium text-[11px] self-start sm:self-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Healthy / Active</span>
          </div>
        </div>
      </div>

      {/* 4. Connected Services Status */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-stone-900">
              Connected Google Services
            </h3>
            <p className="text-xs text-stone-500">
              Cloud services configured for your session.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-stone-700" />
              <div>
                <p className="font-semibold text-stone-900">Cloud Firestore Persistence</p>
                <p className="text-[11px] text-stone-500">Your cognitive memory is encrypted and isolated to your Google account.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-mono font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Connected</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-stone-700" />
              <div>
                <p className="font-semibold text-stone-900">Gmail API Dispatch</p>
                <p className="text-[11px] text-stone-500">Automated executive reflection digest delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-mono font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Enabled</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-stone-700" />
              <div>
                <p className="font-semibold text-stone-900">Google Calendar &amp; Maps</p>
                <p className="text-[11px] text-stone-500">Zero-effort action card extraction &amp; direct links</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-mono font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
