import React, { useState } from 'react';
import { 
  Menu, 
  BrainCircuit
} from 'lucide-react';
import { UserProfile, ReflectionIntent } from '../types';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  user: UserProfile;
  onSignOut: () => Promise<void>;
  onNewReflection: (intent?: ReflectionIntent) => void;
  reflectionCount?: number;
  capsulesCount?: number;
  galleryPhotosCount?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  user,
  onSignOut,
  onNewReflection,
  reflectionCount = 0,
  capsulesCount = 0,
  galleryPhotosCount = 0
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div id="Valeria-app-layout" className="min-h-screen bg-stone-50 text-stone-900 flex flex-col md:pl-64">
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        user={user}
        onSignOut={onSignOut}
        onNewReflection={onNewReflection}
        reflectionCount={reflectionCount}
        capsulesCount={capsulesCount}
        galleryPhotosCount={galleryPhotosCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Mobile-Only Header Bar (Enables opening the sidebar drawer on mobile devices) */}
      <div className="md:hidden border-b border-stone-200 bg-white sticky top-0 z-20 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="open-mobile-sidebar-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs">
              <BrainCircuit className="w-4 h-4 text-amber-300" />
            </div>
            <span className="font-serif font-bold text-base tracking-tight text-stone-900">
              Valeria
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/settings')}
          className="flex items-center gap-2 cursor-pointer"
          title="View Settings & Profile"
        >
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-100 font-serif font-bold text-xs flex items-center justify-center overflow-hidden border border-stone-200">
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
        </button>
      </div>

      {/* Main Page Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full">
        {children}
      </main>
    </div>
  );
};
