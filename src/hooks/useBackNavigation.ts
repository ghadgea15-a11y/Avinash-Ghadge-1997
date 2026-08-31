import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to manage browser history for local component states (modals, detail views, tabs).
 * 
 * @param isActive Whether the nested view is currently active.
 * @param onNavigateBack Callback to execute when the browser Back button is pressed.
 * @param stateKey A unique key for this state in the history stack.
 * @returns A function to be called by the IN-APP back/close buttons.
 */
export function useBackNavigation(
  isActive: boolean,
  onNavigateBack: () => void,
  stateKey: string = 'nestedView'
) {
  const activeRef = useRef(isActive);
  const backTriggeredByBrowser = useRef(false);

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      // Push state when it becomes active
      const currentState = window.history.state || {};
      const newState = { ...currentState, [stateKey]: true };
      window.history.pushState(newState, '', window.location.href);
      backTriggeredByBrowser.current = false;
    } else {
      // If it became inactive NOT by the browser back button, we need to pop it!
      if (!backTriggeredByBrowser.current && window.history.state && window.history.state[stateKey]) {
        // This is tricky. If we just history.back(), it might trigger popstate.
        // We can just go back and set the flag so the popstate handler ignores it.
        backTriggeredByBrowser.current = true;
        window.history.back();
      }
    }
  }, [isActive, stateKey]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state || {};
      if (activeRef.current && !state[stateKey]) {
        // The browser back button popped our state!
        backTriggeredByBrowser.current = true;
        onNavigateBack();
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onNavigateBack, stateKey]);

  // Provide this function for in-app "Close" buttons
  const triggerBack = useCallback(() => {
    if (activeRef.current) {
      onNavigateBack(); // This sets isActive to false, triggering the useEffect to call history.back()
    }
  }, [onNavigateBack]);

  return triggerBack;
}
