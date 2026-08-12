import React from 'react';
import { LayoutDashboard, User, Bell, Settings, QrCode, Users } from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface BottomNavigationBarProps {
  currentScreen: PhaseAScreen;
  onNavigate: (screen: PhaseAScreen) => void;
  unreadNotifCount: number;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  currentScreen,
  onNavigate,
  unreadNotifCount
}) => {
  const { isDark } = useTheme();

  const navItems = [
    {
      screen: 'ROLE_DASHBOARD' as PhaseAScreen,
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      screen: 'EMPLOYEES' as PhaseAScreen,
      label: 'Staff',
      icon: Users
    },
    {
      screen: 'NOTIFICATIONS' as PhaseAScreen,
      label: 'Alerts',
      icon: Bell,
      badge: unreadNotifCount
    },
    {
      screen: 'PROFILE' as PhaseAScreen,
      label: 'Profile',
      icon: User
    },
    {
      screen: 'SETTINGS' as PhaseAScreen,
      label: 'Settings',
      icon: Settings
    }
  ];

  return (
    <nav className={`w-full border-t px-2 py-1.5 grid grid-cols-5 gap-1 shrink-0 z-20 ${
      isDark ? 'bg-slate-900/95 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-700'
    }`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentScreen === item.screen;

        return (
          <button
            key={item.label}
            onClick={() => onNavigate(item.screen)}
            className={`relative py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center text-[10px] font-semibold transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold scale-105'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4 mb-0.5" />
              {!!item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="truncate max-w-full">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
