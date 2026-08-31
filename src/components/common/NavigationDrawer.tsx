import React, { useState, useMemo } from 'react';
import { UserSession, CompanyTenant, PhaseAScreen } from '../../types';
import { 
  LogOut, 
  X, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  ShieldCheck, 
  Database, 
  Activity, 
  Sparkles,
  Lock,
  Building2,
  ExternalLink
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { 
  getGroupedNavForRole, 
  NavigationItemDef, 
  NavigationCategoryDef 
} from '../../config/navigationArchitecture';
import { AppLogo } from './AppLogo';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  onNavigate: (screen: PhaseAScreen) => void;
  onLockSession?: () => void;
  onLogout?: () => void;
  isOnline?: boolean;
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  unreadNotifCount?: number;
}

export function NavigationDrawer({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  userSession,
  activeCompany,
  unreadNotifCount = 0,
  onLogout,
  onLockSession
}: NavigationDrawerProps) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const isSuperAdmin = userSession?.role === 'SUPER_ADMIN';

  // Get grouped navigation items based on current user's role
  const groupedNavigation = useMemo(() => {
    return getGroupedNavForRole(userSession?.role, isSuperAdmin);
  }, [userSession?.role, isSuperAdmin]);

  // Filter items if searching
  const filteredNavigation = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedNavigation;
    }
    const q = searchQuery.toLowerCase();
    return groupedNavigation
      .map((group) => {
        const matchingItems = group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            (item.shortLabel && item.shortLabel.toLowerCase().includes(q))
        );
        return {
          ...group,
          items: matchingItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [groupedNavigation, searchQuery]);

  if (!isOpen) return null;

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getBadgeValue = (item: NavigationItemDef) => {
    if (item.badgeKey === 'unreadNotifCount' && unreadNotifCount > 0) {
      return unreadNotifCount;
    }
    return undefined;
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Drawer Panel */}
      <div className={`relative w-84 max-w-[88vw] h-full shadow-2xl flex flex-col z-10 transition-transform ${
        isDark ? 'bg-slate-900 border-r border-slate-800 text-slate-100' : 'bg-white border-r border-slate-200 text-black'
      }`}>
        
        {/* Drawer Header */}
        <div className={`p-4 border-b flex flex-col gap-2 shrink-0 ${
          isSuperAdmin 
            ? isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-500/10 border-amber-200'
            : isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 overflow-hidden">
              {isSuperAdmin ? (
                <>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-sm bg-amber-600 shadow-amber-600/30">
                    SA
                  </div>
                  <div className="overflow-hidden">
                    <h2 className="font-bold text-sm leading-tight truncate">Platform Super Admin</h2>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full border inline-block bg-amber-500/20 text-amber-400 border-amber-500/30">
                      SUPER ADMIN
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <AppLogo size="sm" company={activeCompany} />
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full border inline-block w-max bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    {userSession?.role || 'AUTHENTICATED'}
                  </span>
                </div>
              )}
            </div>

            <button 
              onClick={onClose} 
              className={`p-1.5 rounded-xl transition ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
              }`}
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative mt-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 15 enterprise modules..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border transition ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                  : 'bg-white border-slate-300 text-black placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {/* Drawer 15-Category List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-3 text-xs divide-y divide-slate-800/40 scrollbar-thin">
          {filteredNavigation.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <p className="font-semibold">No matching modules found</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Try searching with another keyword</p>
            </div>
          ) : (
            filteredNavigation.map((group) => {
              const CategoryIcon = group.category.icon;
              const isCollapsed = !searchQuery && !!collapsedCategories[group.category.id];

              return (
                <div key={group.category.id} className="pt-2 first:pt-0">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(group.category.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                      isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-md ${
                        isSuperAdmin 
                          ? 'bg-amber-500/10 text-amber-400' 
                          : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        <CategoryIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        {group.category.number}. {group.category.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="text-[10px] font-mono bg-slate-800/50 px-1.5 py-0.2 rounded text-slate-400">
                        {group.items.length}
                      </span>
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>

                  {/* Category Items */}
                  {!isCollapsed && (
                    <div className="mt-1 space-y-0.5 pl-1.5">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isCurrent = currentScreen === item.screen;
                        const badge = getBadgeValue(item);

                        return (
                          <button
                            key={item.screen}
                            onClick={() => {
                              onNavigate(item.screen);
                              onClose();
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all ${
                              isCurrent
                                ? isSuperAdmin
                                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                                  : 'bg-indigo-600 text-white font-bold shadow-sm'
                                : isDark
                                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                  : 'text-slate-900 hover:bg-slate-100 hover:text-black'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <ItemIcon className={`w-4 h-4 shrink-0 ${
                                isCurrent ? 'text-white' : 'text-slate-400'
                              }`} />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold leading-tight">
                                  {item.label}
                                </p>
                                <p className={`truncate text-[10px] leading-tight ${
                                  isCurrent ? 'text-indigo-100 opacity-90' : 'text-slate-500'
                                }`}>
                                  {item.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.dataType === 'MASTER_DATA' && !isCurrent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 hidden sm:inline-block">
                                  MASTER
                                </span>
                              )}
                              {badge !== undefined && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                                  {badge}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Drawer Footer */}
        <div className={`p-3 border-t flex items-center justify-between gap-2 shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {onLockSession && (
            <button
              onClick={() => {
                onLockSession();
                onClose();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                  : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-100'
              }`}
              title="Lock Session"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Lock</span>
            </button>
          )}

          {onLogout && (
            <button 
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-800/40 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
