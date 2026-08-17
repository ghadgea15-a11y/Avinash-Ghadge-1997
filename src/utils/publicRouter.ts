/**
 * Public URL Router & History Synchronization for Log Sheet Muster SEO Architecture
 */

import { PhaseAScreen } from '../types';
import { updatePageSEO } from './seo';

export type PublicPageRoute =
  | '/'
  | '/hrms'
  | '/hrms-software'
  | '/employee-management'
  | '/attendance-management'
  | '/leave-management'
  | '/payroll'
  | '/shift-management'
  | '/workforce-management'
  | '/facility-management'
  | '/security-management'
  | '/employee-self-service'
  | '/reports-analytics'
  | '/compliance'
  | '/features'
  | '/pricing'
  | '/about'
  | '/contact'
  | '/security'
  | '/privacy'
  | '/privacy-policy'
  | '/terms'
  | '/terms-of-service';

export const ROUTE_PATH_MAP: Record<string, { screen: PhaseAScreen; publicRoute?: PublicPageRoute }> = {
  '/': { screen: 'LANDING', publicRoute: '/' },
  '/hrms': { screen: 'LANDING', publicRoute: '/hrms' },
  '/hrms-software': { screen: 'LANDING', publicRoute: '/hrms' },
  '/employee-management': { screen: 'LANDING', publicRoute: '/employee-management' },
  '/attendance-management': { screen: 'LANDING', publicRoute: '/attendance-management' },
  '/leave-management': { screen: 'LANDING', publicRoute: '/leave-management' },
  '/payroll': { screen: 'LANDING', publicRoute: '/payroll' },
  '/shift-management': { screen: 'LANDING', publicRoute: '/shift-management' },
  '/workforce-management': { screen: 'LANDING', publicRoute: '/workforce-management' },
  '/facility-management': { screen: 'LANDING', publicRoute: '/facility-management' },
  '/security-management': { screen: 'LANDING', publicRoute: '/security-management' },
  '/employee-self-service': { screen: 'LANDING', publicRoute: '/employee-self-service' },
  '/reports-analytics': { screen: 'LANDING', publicRoute: '/reports-analytics' },
  '/compliance': { screen: 'LANDING', publicRoute: '/compliance' },
  '/features': { screen: 'LANDING', publicRoute: '/features' },
  '/pricing': { screen: 'LANDING', publicRoute: '/pricing' },
  '/about': { screen: 'LANDING', publicRoute: '/about' },
  '/contact': { screen: 'LANDING', publicRoute: '/contact' },
  '/security': { screen: 'LANDING', publicRoute: '/security' },
  '/privacy': { screen: 'LEGAL_POLICIES', publicRoute: '/privacy' },
  '/privacy-policy': { screen: 'LEGAL_POLICIES', publicRoute: '/privacy' },
  '/terms': { screen: 'LEGAL_POLICIES', publicRoute: '/terms' },
  '/terms-of-service': { screen: 'LEGAL_POLICIES', publicRoute: '/terms' },
  '/login': { screen: 'LOGIN' },
  '/signup': { screen: 'SIGN_UP' },
  '/forgot-password': { screen: 'FORGOT_PASSWORD' },
  '/company-code': { screen: 'COMPANY_CODE' }
};

/**
 * Returns current normalized pathname
 */
export function getCurrentPathname(): string {
  let path = window.location.pathname.toLowerCase().trim();
  if (!path.startsWith('/')) path = '/' + path;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

/**
 * Navigate to a public route with History pushState and update SEO meta
 */
export function navigateToUrl(path: string, replace: boolean = false): void {
  let normalizedPath = path.toLowerCase().trim();
  if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath;
  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) normalizedPath = normalizedPath.slice(0, -1);

  if (window.location.pathname !== normalizedPath) {
    if (replace) {
      window.history.replaceState({ path: normalizedPath }, '', normalizedPath);
    } else {
      window.history.pushState({ path: normalizedPath }, '', normalizedPath);
    }
  }

  // Update SEO head tags
  const isPrivate = ['/login', '/signup', '/forgot-password', '/company-code', '/dashboard', '/app'].some(p => normalizedPath.startsWith(p));
  updatePageSEO(normalizedPath, isPrivate);

  // Dispatch custom popstate event so App can react
  window.dispatchEvent(new Event('app-route-change'));
}
