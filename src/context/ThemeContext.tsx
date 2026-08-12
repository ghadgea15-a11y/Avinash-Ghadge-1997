import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppThemeMode } from '../types';

interface ThemeContextType {
  themeMode: AppThemeMode;
  setThemeMode: (mode: AppThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'DARK',
  setThemeMode: () => {},
  isDark: true
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<AppThemeMode>(() => {
    const saved = localStorage.getItem('lsm_app_theme');
    return (saved as AppThemeMode) || 'DARK';
  });

  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    localStorage.setItem('lsm_app_theme', themeMode);
    if (themeMode === 'SYSTEM') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    } else {
      setIsDark(themeMode === 'DARK');
    }
  }, [themeMode]);

  const setThemeMode = (mode: AppThemeMode) => {
    setThemeModeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark }}>
      <div className={isDark ? 'dark bg-slate-950 text-slate-100' : 'light bg-slate-50 text-slate-900'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
