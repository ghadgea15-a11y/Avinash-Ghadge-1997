import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AppLogo } from './AppLogo';

interface MobileTopHeaderProps {
  onOpenDrawer: () => void;
  unreadNotifCount: number;
  onNavigateNotifications: () => void;
  activeCompany?: import('../../types').CompanyTenant | null;
}

export const MobileTopHeader: React.FC<MobileTopHeaderProps> = ({
  onOpenDrawer,
  unreadNotifCount,
  onNavigateNotifications,
  activeCompany
}) => {
  const { isDark } = useTheme();

  return (
    <header className={`w-full flex items-center justify-between px-4 py-3 shrink-0 z-20 shadow-sm ${
      isDark ? 'bg-slate-900 border-b border-slate-800 text-slate-100' : 'bg-white border-b border-slate-200 text-black'
    }`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenDrawer}
          className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
        >
          <Menu className="w-5 h-5" />
        </button>
        <AppLogo size="sm" company={activeCompany} />
      </div>

      <button
        onClick={onNavigateNotifications}
        className={`relative p-2 rounded-xl transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
      >
        <Bell className="w-5 h-5" />
        {unreadNotifCount > 0 && (
          <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
            {unreadNotifCount}
          </span>
        )}
      </button>
    </header>
  );
};
