import React from 'react';
import { 
  BrainCircuit, 
  LayoutDashboard, 
  BookOpen, 
  TrendingUp, 
  Mail, 
  Calendar, 
  Settings, 
  Plus, 
  LogOut, 
  X, 
  Sparkles, 
  FileText,
  Radio,
  Camera,
  Users
} from 'lucide-react';
import { UserProfile, ReflectionIntent } from '../types';

export interface NavRouteItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
}

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  user: UserProfile;
  onSignOut: () => void;
  onNewReflection: (intent?: ReflectionIntent) => void;
  reflectionCount?: number;
  capsulesCount?: number;
  galleryPhotosCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  user,
  onSignOut,
  onNewReflection,
  reflectionCount = 0,
  capsulesCount = 0,
  galleryPhotosCount = 0,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const navItems: NavRouteItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      path: '/reflections',
      label: 'Reflections',
      icon: BookOpen,
      badge: reflectionCount > 0 ? String(reflectionCount) : null
    },
    {
      path: '/capsules',
      label: 'Life Archives',
      icon: Users,
      badge: capsulesCount > 0 ? String(capsulesCount) : null
    },
    {
      path: '/memories',
      label: 'Life Gallery',
      icon: Camera,
      badge: galleryPhotosCount > 0 ? String(galleryPhotosCount) : null
    },
    {
      path: '/memory',
      label: 'Cognitive Memory',
      icon: TrendingUp,
      badge: null
    },
    {
      path: '/weekly-insights',
      label: 'Weekly Insights',
      icon: Mail,
      badge: 'New'
    },
    {
      path: '/live',
      label: 'Valeria Live',
      icon: Radio,
      badge: 'LIVE'
    },
    {
      path: '/documents',
      label: 'Documents',
      icon: FileText,
      badge: null
    },
    {
      path: '/calendar',
      label: 'Calendar & Places',
      icon: Calendar,
      badge: null
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  const handleItemClick = (path: string) => {
    onNavigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-stone-200">
      {/* Top Brand Header */}
      <div className="p-5 border-b border-stone-200/80 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleItemClick('/dashboard')}
          className="flex items-center gap-3 text-left cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs group-hover:bg-stone-800 transition">
            <BrainCircuit className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-tight text-stone-900 leading-tight">
              Valeria
            </span>
            <span className="text-[10px] text-stone-500 font-mono tracking-wider uppercase font-semibold">
              AI Cognitive Journal
            </span>
          </div>
        </button>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            type="button"
            id="close-mobile-sidebar-btn"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition md:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="p-4 border-b border-stone-100">
        <button
          type="button"
          id="sidebar-new-reflection-btn"
          onClick={() => {
            onNewReflection('deep_reflection');
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 active:scale-[0.98] transition shadow-xs cursor-pointer group"
        >
          <Plus className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-200" />
          <span>New Reflection</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-400">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          // Exact match or default / to /dashboard
          const isActive = currentPath === item.path || (item.path === '/dashboard' && (currentPath === '/' || currentPath === ''));

          return (
            <button
              key={item.path}
              id={`nav-item-${item.path.replace('/', '')}`}
              type="button"
              onClick={() => handleItemClick(item.path)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100/90'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-stone-500'}`} />
                <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-stone-800 text-amber-300'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3.5 border-t border-stone-200/90 bg-stone-50/50 space-y-2">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-7 h-7 rounded-full object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-stone-800 text-stone-100 text-xs flex items-center justify-center font-bold shrink-0">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-stone-900 truncate">
                {user.displayName || user.email}
              </div>
              <div className="text-[10px] font-mono text-stone-500 truncate">
                {user.email || 'Authenticated'}
              </div>
            </div>
          </div>

          <button
            type="button"
            id="sidebar-signout-btn"
            onClick={onSignOut}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer shrink-0"
            title="Sign Out"
            aria-label="Sign out of Valeria"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside 
        id="desktop-sidebar-nav"
        className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 z-30 flex-col"
        aria-label="Sidebar navigation"
      >
        {renderSidebarContent()}
      </aside>

      {/* 2. Mobile Drawer & Backdrop */}
      {isOpenMobile && (
        <div
          id="mobile-sidebar-backdrop"
          className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        >
          <div
            id="mobile-sidebar-drawer"
            className="w-64 h-full bg-white shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSidebarContent()}
          </div>
        </div>
      )}
    </>
  );
};
