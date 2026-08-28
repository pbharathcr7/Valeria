import React from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Mail, 
  Calendar, 
  MapPin, 
  LogOut, 
  Sparkles,
  Key,
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
      <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider">User Identity (UID)</span>
            <p className="text-stone-800 font-semibold truncate">{user.uid}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider">Authentication Provider</span>
            <p className="text-stone-800 font-semibold">Google Identity Services (OAuth 2.0)</p>
          </div>
        </div>
      </div>

      {/* 3. AI Model Infrastructure */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-stone-900">
              Gemini AI Engine &amp; Resilient Fallback Ladder
            </h3>
            <p className="text-xs text-stone-500">
              Server-side intelligence using the modern Google Gen AI SDK.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-stone-600 leading-relaxed">
            MindMirror leverages an automated multi-tier fallback protocol across high-availability Gemini models to guarantee uninterrupted uptime and low latency:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between">
              <div>
                <p className="font-mono font-semibold text-stone-900">1. Primary Model</p>
                <p className="text-stone-500 text-[11px]">gemini-3.6-flash</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px] font-semibold">Active</span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
              <div>
                <p className="font-mono font-semibold text-stone-900">2. High-Availability Fallback</p>
                <p className="text-stone-500 text-[11px]">gemini-3.1-flash-lite</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-mono text-[10px]">Standby</span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
              <div>
                <p className="font-mono font-semibold text-stone-900">3. Dynamic Alias</p>
                <p className="text-stone-500 text-[11px]">gemini-flash-latest</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-mono text-[10px]">Standby</span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
              <div>
                <p className="font-mono font-semibold text-stone-900">4. Deep Reasoning</p>
                <p className="text-stone-500 text-[11px]">gemini-3.7-flash</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-mono text-[10px]">Standby</span>
            </div>
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
              Connected Services &amp; Tenant Isolation
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
                <p className="text-[11px] text-stone-500">User data isolated by owner UID rules: <code>/users/&#123;userId&#125;/interactions/&#123;id&#125;</code></p>
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
