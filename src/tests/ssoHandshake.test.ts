import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SsoAuthService } from '../services/ssoAuthService';
import { SsoConfigRecord } from '../types/integration';

const mockFirestoreData: Record<string, any> = {};

let mockCurrentUser: any = null;

vi.mock('../firebase', () => ({
  db: {},
  auth: {
    get currentUser() {
      return mockCurrentUser;
    },
    signOut: vi.fn(async () => {
      mockCurrentUser = null;
    })
  }
}));

vi.mock('firebase/auth', () => {
  class MockSAMLAuthProvider {
    public providerId: string;
    constructor(providerId: string) {
      this.providerId = providerId;
    }
  }
  class MockOAuthProvider {
    public providerId: string;
    constructor(providerId: string) {
      this.providerId = providerId;
    }
  }
  class MockGoogleAuthProvider {
    public customParams: any = {};
    setCustomParameters(params: any) {
      this.customParams = params;
    }
  }

  return {
    SAMLAuthProvider: MockSAMLAuthProvider,
    OAuthProvider: MockOAuthProvider,
    GoogleAuthProvider: MockGoogleAuthProvider,
    signInWithPopup: vi.fn(async (_auth: any, provider: any) => {
      if (!mockCurrentUser) {
        throw new Error('auth/popup-closed-by-user');
      }
      return { user: mockCurrentUser };
    })
  };
});

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, ...pathSegments) => pathSegments.join('/')),
    doc: vi.fn((_db, ...pathSegments) => pathSegments.join('/')),
    getDoc: vi.fn(async (docPath: string) => {
      const data = mockFirestoreData[docPath];
      return {
        exists: () => !!data,
        id: docPath.split('/').pop() || '',
        data: () => data
      };
    }),
    getDocs: vi.fn(async (queryOrCol: any) => {
      const path = typeof queryOrCol === 'string' ? queryOrCol : (queryOrCol?.path || '');
      const prefix = path.endsWith('/') ? path : `${path}/`;
      const docs = Object.keys(mockFirestoreData)
        .filter(k => k.startsWith(prefix) && k.split('/').length === prefix.split('/').length)
        .map(k => ({
          id: k.split('/').pop() || '',
          data: () => mockFirestoreData[k]
        }));
      return {
        empty: docs.length === 0,
        docs
      };
    }),
    query: vi.fn((col, ..._filters) => col),
    where: vi.fn(() => ({}))
  };
});

describe('SSO Authentication, SAML/OIDC/Google Workspace Handshake & Strict Fail-Closed Isolation', () => {
  const targetCompanyId = 'COMP-ALPHA';
  const rogueCompanyId = 'COMP-BETA';

  const baseSsoConfig: SsoConfigRecord = {
    id: 'primary',
    companyId: targetCompanyId,
    protocol: 'GOOGLE_WORKSPACE',
    isEnabled: true,
    displayName: 'Google Workspace Enterprise SSO',
    oidcIssuerUrl: 'acme-corp.com',
    enforceSsoOnly: true,
    defaultRoleLevel: 'A7_SKILLED_GUARD',
    updatedAt: '2026-09-02T10:00:00Z'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const key in mockFirestoreData) {
      delete mockFirestoreData[key];
    }
    mockCurrentUser = null;
  });

  it('1. configures Google Workspace Directory provider with hd domain restriction parameter', () => {
    const provider = SsoAuthService.getAuthProvider(baseSsoConfig, targetCompanyId);
    expect(provider).toBeDefined();
    expect(provider.customParams.prompt).toBe('select_account');
    expect(provider.customParams.hd).toBe('acme-corp.com');
  });

  it('2. successfully logs in verified employee belonging to the target companyId', async () => {
    mockCurrentUser = {
      uid: 'UID-EMP-001',
      email: 'john.doe@acme-corp.com',
      displayName: 'John Doe',
      emailVerified: true,
      getIdToken: vi.fn().mockResolvedValue('jwt-valid-token')
    };

    // User is legitimately registered under target company
    mockFirestoreData[`users/UID-EMP-001`] = {
      companyId: targetCompanyId,
      employeeId: 'EMP-001',
      fullName: 'John Doe',
      role: 'EMPLOYEE',
      authorityLevel: 'A7_SKILLED_GUARD',
      accountStatus: 'ACTIVE'
    };

    const res = await SsoAuthService.executeSsoHandshake(targetCompanyId, baseSsoConfig);

    expect(res.success).toBe(true);
    expect(res.userSession).toBeDefined();
    expect(res.userSession?.companyId).toBe(targetCompanyId);
    expect(res.userSession?.email).toBe('john.doe@acme-corp.com');
    expect(res.userSession?.role).toBe('EMPLOYEE');
  });

  it('3. FAILS CLOSED when authenticated identity belongs to a DIFFERENT company (Cross-Tenant Attack Blocked)', async () => {
    mockCurrentUser = {
      uid: 'UID-ROGUE-002',
      email: 'attacker@evil-corp.com',
      displayName: 'Malicious Actor',
      emailVerified: true,
      getIdToken: vi.fn().mockResolvedValue('jwt-rogue-token')
    };

    // User is registered in a different tenant (COMP-BETA)
    mockFirestoreData[`users/UID-ROGUE-002`] = {
      companyId: rogueCompanyId,
      employeeId: 'EMP-ROGUE',
      fullName: 'Malicious Actor'
    };

    const res = await SsoAuthService.executeSsoHandshake(targetCompanyId, baseSsoConfig);

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('UNMATCHED_COMPANY_ID');
    expect(res.error).toContain('Cross-tenant access is strictly prohibited');
    expect(res.userSession).toBeUndefined();
  });

  it('4. FAILS CLOSED when authenticated identity is not recognized in any company roster', async () => {
    mockCurrentUser = {
      uid: 'UID-UNKNOWN-999',
      email: 'stranger@gmail.com',
      displayName: 'Stranger',
      emailVerified: true,
      getIdToken: vi.fn().mockResolvedValue('jwt-stranger-token')
    };

    // No user or employee record in mockFirestoreData
    const res = await SsoAuthService.executeSsoHandshake(targetCompanyId, baseSsoConfig);

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('UNMATCHED_COMPANY_ID');
    expect(res.userSession).toBeUndefined();
  });

  it('5. returns SSO_DISABLED when company has not enabled Single Sign-On', async () => {
    const disabledConfig: SsoConfigRecord = {
      ...baseSsoConfig,
      isEnabled: false
    };

    const res = await SsoAuthService.executeSsoHandshake(targetCompanyId, disabledConfig);

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('SSO_DISABLED');
  });
});
