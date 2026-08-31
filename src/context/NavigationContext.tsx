import React, { createContext, useContext, ReactNode } from 'react';
import { PhaseAScreen } from '../types';
import { useAppNavigation, AppNavState } from '../hooks/useAppNavigation';

interface NavigationContextType {
  currentScreen: PhaseAScreen;
  navState: AppNavState;
  navigate: (screen: PhaseAScreen, payload?: Record<string, any>, replace?: boolean) => void;
  goBack: () => void;
  updatePayload: (payload: Record<string, any>, replace?: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider = ({ children, initialScreen }: { children: ReactNode, initialScreen: PhaseAScreen }) => {
  const nav = useAppNavigation(initialScreen);
  return (
    <NavigationContext.Provider value={nav}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
};
