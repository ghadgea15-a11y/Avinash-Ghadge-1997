import { PhaseAScreen } from '../types';

export const getCurrentPathname = () => {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
};

export const ROUTE_PATH_MAP: Record<string, { screen: PhaseAScreen }> = {
  '/': { screen: 'LANDING' },
  '/login': { screen: 'LOGIN' },
  '/signup': { screen: 'SIGN_UP' },
  '/forgot-password': { screen: 'FORGOT_PASSWORD' },
  '/company-code': { screen: 'COMPANY_CODE' },
  '/legal': { screen: 'LEGAL_POLICIES' }
};

export const navigateToUrl = (url: string) => {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
