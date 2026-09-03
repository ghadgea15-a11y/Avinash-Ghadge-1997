import { useState, useEffect, useCallback } from 'react';
import { PhaseAScreen } from '../types';

export interface AppNavState {
  screen: PhaseAScreen;
  [key: string]: any;
}

export function useAppNavigation(initialScreen: PhaseAScreen) {
  const [navState, setNavState] = useState<AppNavState>(() => {
    try {
      if (typeof window !== 'undefined' && window.history && window.history.state && window.history.state.screen) {
        return window.history.state;
      }
    } catch {
      // In sandboxed iframes, accessing window.history.state may throw SecurityError
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
    
    try {
      window.addEventListener('popstate', handlePopState);
    } catch {}
    
    // Initialize if empty
    try {
      if (typeof window !== 'undefined' && window.history && (!window.history.state || !window.history.state.screen)) {
        window.history.replaceState({ screen: initialScreen }, '', `?screen=${initialScreen}`);
      }
    } catch {
      // In sandboxed cross-origin iframes, replaceState throws SecurityError; ignore safely
    }
    
    return () => {
      try {
        window.removeEventListener('popstate', handlePopState);
      } catch {}
    };
  }, [initialScreen]);

  const navigate = useCallback((screen: PhaseAScreen, payload?: Record<string, any>, replace = false) => {
    const newState = { screen, ...payload };
    setNavState(newState);
    
    try {
      if (typeof window !== 'undefined' && window.history) {
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
      }
    } catch {
      // Push/replace state may be blocked in sandboxed iframe; state is still updated in React state
    }
  }, []);

  const updatePayload = useCallback((payload: Record<string, any>, replace = false) => {
    setNavState(prev => {
      const newState = { ...prev, ...payload };
      
      try {
        if (typeof window !== 'undefined' && window.history) {
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
        }
      } catch {
        // Push/replace state may be blocked in sandboxed iframe
      }
      return newState;
    });
  }, []);

  const goBack = useCallback(() => {
    try {
      window.history.back();
    } catch {}
  }, []);

  return {
    currentScreen: navState.screen,
    navState,
    navigate,
    updatePayload,
    goBack
  };
}
