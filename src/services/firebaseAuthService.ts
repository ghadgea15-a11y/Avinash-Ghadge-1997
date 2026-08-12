import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { CompanyTenant, UserSession, UserRole } from '../types';
import { MOCK_TENANTS, MOCK_USERS } from './mockData';

export class FirebaseAuthService {
  /**
   * Validates and retrieves company tenant information by Company Code
   */
  static async verifyCompanyCode(companyCode: string): Promise<CompanyTenant> {
    const cleanCode = companyCode.trim().toUpperCase();

    // 1. Check local mock registry
    if (MOCK_TENANTS[cleanCode]) {
      return MOCK_TENANTS[cleanCode];
    }

    // 2. Query Firestore if configured
    try {
      const companyDocRef = doc(db, 'companies', cleanCode);
      const companySnap = await getDoc(companyDocRef);

      if (companySnap.exists()) {
        const data = companySnap.data() as CompanyTenant;
        if (data.status !== 'ACTIVE') {
          throw new Error('This company account has been suspended. Please contact system administrator.');
        }
        return data;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('suspended')) {
        throw err;
      }
      console.log('Firestore company verify fallback to mock');
    }

    throw new Error(`Company code '${cleanCode}' was not found. Please verify with your HR or Operations Manager.`);
  }

  /**
   * Performs authentication using Email/Password or Employee ID + PIN
   */
  static async authenticateUser(params: {
    companyId: string;
    emailOrId: string;
    passwordOrPin: string;
    isPinMode: boolean;
  }): Promise<UserSession> {
    const { companyId, emailOrId, passwordOrPin, isPinMode } = params;
    const cleanInput = emailOrId.trim();

    // 1. Try mock users
    const mockUser = MOCK_USERS.find(u => 
      (u.companyId === companyId || u.role === 'SUPER_ADMIN') &&
      (isPinMode 
        ? (u.employeeId.toLowerCase() === cleanInput.toLowerCase() || u.email.toLowerCase() === cleanInput.toLowerCase()) && u.pin === passwordOrPin
        : u.email.toLowerCase() === cleanInput.toLowerCase() && u.password === passwordOrPin
      )
    );

    if (mockUser) {
      const session: UserSession = {
        userId: `USR-${mockUser.employeeId}`,
        employeeId: mockUser.employeeId,
        fullName: mockUser.fullName,
        email: mockUser.email,
        role: mockUser.role,
        companyId: mockUser.companyId,
        branchId: mockUser.branchId,
        assignedSiteId: mockUser.assignedSiteId,
        avatarUrl: mockUser.avatarUrl,
        token: `JWT-TOKEN-${Date.now()}-${mockUser.employeeId}`,
        tokenExpiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        isBiometricEnabled: true,
        lastActiveAt: Date.now(),
        loginMode: isPinMode ? 'PIN' : 'PASSWORD'
      };
      return session;
    }

    // 2. Try Firebase Auth if email/password mode
    if (!isPinMode && cleanInput.includes('@')) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanInput, passwordOrPin);
        const fbUser = userCredential.user;

        // Try to fetch profile from Firestore root 'users' collection
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userDocRef);

        let role: UserRole = 'GUARD';
        let employeeId = 'EMP-001';
        let fullName = fbUser.displayName || 'Authenticated Guard';
        let branchId = 'MAIN_BRANCH';

        if (userSnap.exists()) {
          const uData = userSnap.data();
          
          // Verify company authorization
          if (uData.companyId && uData.companyId !== companyId) {
            throw new Error(`User is not authorized for company: ${companyId}`);
          }
          
          role = uData.role || 'GUARD';
          employeeId = uData.employeeId || 'EMP-001';
          fullName = uData.fullName || fullName;
          branchId = uData.branchId || branchId;
        }

        const session: UserSession = {
          userId: fbUser.uid,
          employeeId: employeeId,
          fullName: fullName,
          email: fbUser.email || cleanInput,
          role: role,
          companyId: companyId,
          branchId: branchId,
          token: await fbUser.getIdToken(),
          tokenExpiresAt: Date.now() + (12 * 60 * 60 * 1000),
          isBiometricEnabled: false,
          lastActiveAt: Date.now(),
          loginMode: 'PASSWORD'
        };
        return session;
      } catch (err: unknown) {
        const firebaseErr = err as { code?: string; message?: string };
        if (firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/invalid-credential') {
          throw new Error('Invalid email or password. Please verify your login details.');
        }
      }
    }

    throw new Error('Invalid credentials or PIN entered. Please check your credentials and try again.');
  }

  /**
   * Password Reset Request
   */
  static async requestPasswordReset(companyCode: string, emailOrId: string): Promise<string> {
    const cleanInput = emailOrId.trim();

    // Check mock or Firebase
    if (cleanInput.includes('@')) {
      try {
        await sendPasswordResetEmail(auth, cleanInput);
      } catch {
        // Fallback gracefully
      }
    }

    return `Password reset instruction email has been sent to ${cleanInput}. Please check your inbox.`;
  }
}
