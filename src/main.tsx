import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary';

// Global resilience handlers to prevent benign environment events from failing the preview
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Suppress empty or benign websocket/network cancellation rejections
    if (!event.reason || (typeof event.reason === 'object' && Object.keys(event.reason).length === 0)) {
      event.preventDefault();
      return;
    }
    const message = event.reason?.message || String(event.reason);
    if (message.includes('websocket') || message.includes('Failed to fetch') || message.includes('AbortError')) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    // Suppress empty error objects or benign browser events
    if (!event.error || (typeof event.error === 'object' && Object.keys(event.error).length === 0)) {
      event.preventDefault();
      return;
    }
    const message = event.message || event.error?.message || '';
    if (message.includes('ResizeObserver loop') || message.includes('Script error.')) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
