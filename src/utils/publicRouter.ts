export function getCurrentPathname(): string {
  return window.location.pathname;
}

export function navigateToUrl(url: string) {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new Event('app-route-change'));
}

export const ROUTE_PATH_MAP: Record<string, { screen: any }> = {
  '/login': { screen: 'LOGIN' },
  '/signup': { screen: 'SIGN_UP' },
  '/forgot-password': { screen: 'FORGOT_PASSWORD' },
  '/hrms': { screen: 'LANDING' },
};
