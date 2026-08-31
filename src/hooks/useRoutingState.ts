import { useState, useEffect, useCallback } from 'react';

export function useRoutingState<T>(
  stateKey: string,
  initialState: T
): [T, (newState: T | ((prev: T) => T), replace?: boolean) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== 'undefined' && window.history.state && window.history.state[stateKey] !== undefined) {
      return window.history.state[stateKey];
    }
    return initialState;
  });

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state[stateKey] !== undefined) {
        setState(event.state[stateKey]);
      } else {
        setState(initialState);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [stateKey, initialState]);

  const setRoutingState = useCallback((newState: T | ((prev: T) => T), replace = false) => {
    setState((prev) => {
      const next = typeof newState === 'function' ? (newState as (prev: T) => T)(prev) : newState;
      
      const currentHistoryState = window.history.state || {};
      const newHistoryState = { ...currentHistoryState, [stateKey]: next };
      
      if (replace) {
        window.history.replaceState(newHistoryState, '', window.location.pathname);
      } else {
        window.history.pushState(newHistoryState, '', window.location.pathname);
      }
      return next;
    });
  }, [stateKey]);

  return [state, setRoutingState];
}
