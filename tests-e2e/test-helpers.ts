import { Page } from '@playwright/test';

export async function injectMockSession(page: Page, role = 'SUPER_ADMIN') {
  await page.addInitScript((mockRole) => {
    const session = {
      userId: 'mock-user-1',
      companyId: mockRole === 'SUPER_ADMIN' ? 'GLOBAL_ADMIN' : 'COMP-TEST',
      email: 'admin@system.local',
      role: mockRole,
      accountStatus: 'ACTIVE',
      permissions: [],
      token: 'mock-token',
      lastActiveAt: Date.now(),
      isMfaVerified: true,
      mfaVerifiedAt: Date.now()
    };
    const company = {
      companyId: mockRole === 'SUPER_ADMIN' ? 'GLOBAL_ADMIN' : 'COMP-TEST',
      companyLegalName: 'Mock Company',
      status: 'ACTIVE',
      enabledModules: ['BPM', 'PAYROLL', 'INVENTORY', 'EAM', 'OPERATIONS', 'WFM'],
      licenseTier: 'ENTERPRISE'
    };
    window.localStorage.setItem('lsm_user_session_v1', JSON.stringify(session));
    window.localStorage.setItem('lsm_active_company_v1', JSON.stringify(company));
  }, role);
}
