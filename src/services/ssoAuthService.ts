import { db, auth } from '../firebase';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { signInWithPopup, SAMLAuthProvider, OAuthProvider, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth';
import { SsoConfigRecord, SsoProtocol } from '../types/integration';
import { UserSession } from '../types';

export interface SsoHandshakeResult {
  success: boolean;
  userSession?: UserSession;
  accountStatus?: string;
  error?: string;
  errorCode?: 'UNMATCHED_COMPANY_ID' | 'SSO_DISABLED' | 'PROVIDER_ERROR' | 'UNREGISTERED_EMPLOYEE' | 'AUTH_FAILED';
}

export class SsoAuthService {
  /**
   * Generates or configures the real AuthProvider for SAML 2.0, OIDC, or Google Workspace Directory
   */
  static getAuthProvider(ssoConfig: SsoConfigRecord, companyId: string): any {
    if (!ssoConfig.isEnabled) {
      throw new Error('SSO is disabled for this organization.');
    }

    switch (ssoConfig.protocol) {
      case 'SAML_2_0': {
        const providerId = ssoConfig.samlEntityId
          ? (ssoConfig.samlEntityId.startsWith('saml.') ? ssoConfig.samlEntityId : `saml.${ssoConfig.samlEntityId}`)
          : `saml.${companyId}`;
        return new SAMLAuthProvider(providerId);
      }
      case 'OIDC': {
        const providerId = ssoConfig.oidcClientId
          ? (ssoConfig.oidcClientId.startsWith('oidc.') ? ssoConfig.oidcClientId : `oidc.${ssoConfig.oidcClientId}`)
          : `oidc.${companyId}`;
        return new OAuthProvider(providerId);
      }
      case 'GOOGLE_WORKSPACE': {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account',
          ...(ssoConfig.oidcIssuerUrl ? { hd: ssoConfig.oidcIssuerUrl.replace(/^https?:\/\//, '') } : {})
        });
        return provider;
      }
      default:
        throw new Error(`Unsupported SSO protocol: ${ssoConfig.protocol}`);
    }
  }

  /**
   * Executes real SSO handshake and enforces STRICT fail-closed tenant validation.
   * If authenticated user does not belong to expected target companyId, throws error and revokes access.
   */
  static async executeSsoHandshake(
    expectedCompanyId: string,
    ssoConfig: SsoConfigRecord
  ): Promise<SsoHandshakeResult> {
    // 1. Validate SSO configuration
    if (!ssoConfig || !ssoConfig.isEnabled) {
      return {
        success: false,
        error: 'Single Sign-On is disabled for this tenant.',
        errorCode: 'SSO_DISABLED'
      };
    }

    let provider: any;
    try {
      provider = this.getAuthProvider(ssoConfig, expectedCompanyId);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to initialize SSO Identity Provider.',
        errorCode: 'PROVIDER_ERROR'
      };
    }

    // 2. Perform popup authentication handshake
    let fbUser: FirebaseUser;
    try {
      const userCredential = await signInWithPopup(auth, provider);
      fbUser = userCredential.user;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-blocked') {
        return {
          success: false,
          error: 'SSO popup was blocked by browser. Please allow popups.',
          errorCode: 'AUTH_FAILED'
        };
      } else if (code === 'auth/popup-closed-by-user') {
        return {
          success: false,
          error: 'SSO login window was closed.',
          errorCode: 'AUTH_FAILED'
        };
      }
      return {
        success: false,
        error: err.message || 'SSO authentication failed.',
        errorCode: 'AUTH_FAILED'
      };
    }

    const cleanEmail = fbUser.email?.trim().toLowerCase();
    if (!cleanEmail) {
      return {
        success: false,
        error: 'Identity Provider did not return a verified email address.',
        errorCode: 'AUTH_FAILED'
      };
    }

    // 3. STRICT TENANT VERIFICATION (Fail-Closed)
    // Verify against global user directory & company employees collection
    const verification = await this.verifyTenantMembership(expectedCompanyId, fbUser.uid, cleanEmail);
    if (!verification.isAuthorized) {
      // FAIL-CLOSED: Attempted cross-tenant login or unauthorized user
      try {
        await auth.signOut();
      } catch {}
      return {
        success: false,
        error: `Access Denied: Authenticated account (${cleanEmail}) is not authorized for company "${expectedCompanyId}". Cross-tenant access is strictly prohibited.`,
        errorCode: 'UNMATCHED_COMPANY_ID'
      };
    }

    // 4. Build authenticated UserSession
    const userData = verification.userData;
    const token = await fbUser.getIdToken(true);
    const session: UserSession = {
      userId: fbUser.uid,
      uid: fbUser.uid,
      employeeId: userData?.employeeId || '',
      fullName: userData?.fullName || fbUser.displayName || 'SSO User',
      email: cleanEmail,
      role: (userData?.role || ssoConfig.defaultRoleLevel || 'EMPLOYEE') as any,
      authority: (userData?.authorityLevel || 'A8_WORKER') as any,
      companyId: expectedCompanyId, // Authoritative tenant binding
      branchId: userData?.branchId || 'HQ',
      token,
      departmentId: userData?.departmentId || '',
      departmentName: userData?.departmentName || '',
      companyAdminApproval: userData?.companyAdminApproval || 'APPROVED',
      hrApproval: userData?.hrApproval || 'APPROVED',
      loginMode: 'SSO',
      tokenExpiresAt: Date.now() + 3600000,
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      accountStatus: userData?.accountStatus || 'ACTIVE',
      emailVerified: fbUser.emailVerified || true
    };

    return {
      success: true,
      userSession: session,
      accountStatus: session.accountStatus
    };
  }

  /**
   * Verifies that the given authenticated UID / Email strictly belongs to the target companyId
   */
  static async verifyTenantMembership(
    targetCompanyId: string,
    uid: string,
    email: string
  ): Promise<{ isAuthorized: boolean; userData?: any }> {
    // Check 1: User registry
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      if (uData.companyId === targetCompanyId) {
        return { isAuthorized: true, userData: uData };
      } else if (uData.companyId && uData.companyId !== targetCompanyId) {
        // Cross-tenant mismatch detected
        return { isAuthorized: false };
      }
    }

    // Check 2: Tenant-isolated employee roster
    const empQuery = query(
      collection(db, 'companies', targetCompanyId, 'employees'),
      where('email', '==', email)
    );
    const empSnap = await getDocs(empQuery);
    if (!empSnap.empty) {
      const empData = empSnap.docs[0].data();
      return { isAuthorized: true, userData: empData };
    }

    // Unmatched
    return { isAuthorized: false };
  }
}
