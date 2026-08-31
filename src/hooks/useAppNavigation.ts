import { useState, useEffect, useCallback } from 'react';
import { PhaseAScreen } from '../types';

export interface AppNavState {
  screen: PhaseAScreen;
  [key: string]: any;
}

export function useAppNavigation(initialScreen: PhaseAScreen) {
  const [navState, setNavState] = useState<AppNavState>(() => {
    if (typeof window !== 'undefined' && window.history.state && window.history.state.screen) {
      return window.history.state;
    }
    return { screen: initialScreen };
  });

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setNavState(event.state);
      } else {
        setNavState({ screen: initialScreen });
      }
    };
    window.addEventListener('popstate', handlePopState);
    
    // Initialize if empty
    if (!window.history.state || !window.history.state.screen) {
      window.history.replaceState({ screen: initialScreen }, '', `?screen=${initialScreen}`);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialScreen]);

  const navigate = useCallback((screen: PhaseAScreen, payload?: Record<string, any>, replace = false) => {
    const newState = { screen, ...payload };
    setNavState(newState);
    
    const url = new URL(window.location.href);
    url.searchParams.set('screen', screen);
    if (payload) {
      Object.keys(payload).forEach(key => {
        if (payload[key]) {
          url.searchParams.set(key, String(payload[key]));
        } else {
          url.searchParams.delete(key);
        }
      });
    }

    if (replace) {
      window.history.replaceState(newState, '', url.pathname + url.search);
    } else {
      window.history.pushState(newState, '', url.pathname + url.search);
    }
  }, []);

  const updatePayload = useCallback((payload: Record<string, any>, replace = false) => {
    setNavState(prev => {
      const newState = { ...prev, ...payload };
      
      const url = new URL(window.location.href);
      Object.keys(payload).forEach(key => {
        if (payload[key] !== undefined && payload[key] !== null) {
          url.searchParams.set(key, String(payload[key]));
        } else {
          url.searchParams.delete(key);
        }
      });
      
      if (replace) {
        window.history.replaceState(newState, '', url.pathname + url.search);
      } else {
        window.history.pushState(newState, '', url.pathname + url.search);
      }
      return newState;
    });
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  return {
    currentScreen: navState.screen,
    navState,
    navigate,
    updatePayload,
    goBack
  };
}
