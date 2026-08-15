import { auth, db, functions } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, getDocFromServer, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  CompanyTenant, 
  UserSession, 
  UserRole, 
  AccountStatus, 
  ApprovalStatus, 
  ApprovalRequestRecord,
  DepartmentRecord 
} from '../types';
import { FirestoreService } from './firestoreService';
import { SessionManager } from './sessionManager';

export const RESERVED_SUPER_ADMIN_EMAILS = [
  'admin@logsheetmuster.com',
  'superadmin@logsheetmuster.com',
  'ghadgea15@gmail.com',
  'sysadmin@logsheetmuster.com'
];

export class FirebaseAuthService {
  /**
   * Validates and retrieves company tenant information by Company Code from Firestore
   */
  static async verifyCompanyCode(companyCode: string): Promise<CompanyTenant> {
    const cleanCode = companyCode.trim().toUpperCase();
    
    if (cleanCode === 'GLOBAL_ADMIN') {
      return {
        companyId: 'GLOBAL_ADMIN',
        companyLegalName: 'Global Administrator',
        brandName: 'Global Administrator',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['HQ'],
        maxEmployeesAllowed: 9999,
        maxSitesAllowed: 9999,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      };
    }
    
    if (cleanCode === 'GLOBAL_ADMIN') {
      return {
        companyId: 'GLOBAL_ADMIN',
        companyLegalName: 'Global Administrator',
        brandName: 'Global Administrator',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['HQ'],
        maxEmployeesAllowed: 9999,
        maxSitesAllowed: 9999,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      };
    }

    if (!cleanCode) {
      throw new Error('Company Code is mandatory for registration.');
    }

    // Helper to safely fetch document with offline retry
    const safeGetDoc = async (docRef: any) => {
      try {
        return await getDoc(docRef);
      } catch (err: any) {
        const isOffline = err?.message?.toLowerCase().includes('offline') || err?.code === 'unavailable';
        if (isOffline) {
          // If offline/reconnecting, try once more with a short delay
          await new Promise(r => setTimeout(r, 400));
          try {
            return await getDoc(docRef);
          } catch (retryErr) {
            console.warn('[FirebaseAuthService] Firestore offline fallback mode for', cleanCode);
            return null;
          }
        }
        throw err;
      }
    };

    try {
      // 1. Direct document lookup in 'companies' collection
      const companyDocRef = doc(db, 'companies', cleanCode);
      const companySnap = await safeGetDoc(companyDocRef);

      if (companySnap && companySnap.exists()) {
        const data = companySnap.data() as CompanyTenant;
        if (data.status && data.status !== 'ACTIVE') {
          throw new Error('Company Code is inactive or expired');
        }
        return {
          companyId: data.companyId || cleanCode,
          companyLegalName: data.companyLegalName || cleanCode,
          brandName: data.brandName || cleanCode,
          licenseTier: data.licenseTier || 'ENTERPRISE',
          allowedBranches: data.allowedBranches || ['MAIN'],
          maxEmployeesAllowed: data.maxEmployeesAllowed || 1000,
          maxSitesAllowed: data.maxSitesAllowed || 50,
          primaryColorHex: data.primaryColorHex || '#4f46e5',
          secondaryColorHex: data.secondaryColorHex || '#06b6d4',
          status: data.status || 'ACTIVE'
        };
      }

      // 2. Lookup in 'company_codes' or 'companyCodes' collection mapping
      const codeMappingRef = doc(db, 'company_codes', cleanCode);
      const codeMappingSnap = await safeGetDoc(codeMappingRef);
      
      if (codeMappingSnap && codeMappingSnap.exists()) {
        const mappingData = codeMappingSnap.data() as any;
        const mappedCompanyId = mappingData?.companyId || cleanCode;
        const targetDocRef = doc(db, 'companies', mappedCompanyId);
        const targetSnap = await safeGetDoc(targetDocRef);
        
        if (targetSnap && targetSnap.exists()) {
          const data = targetSnap.data() as CompanyTenant;
          if (data.status && data.status !== 'ACTIVE') {
            throw new Error('Company Code is inactive or expired');
          }
          return {
            companyId: data.companyId || mappedCompanyId,
            companyLegalName: data.companyLegalName || mappedCompanyId,
            brandName: data.brandName || mappedCompanyId,
            licenseTier: data.licenseTier || 'ENTERPRISE',
            allowedBranches: data.allowedBranches || ['MAIN'],
            maxEmployeesAllowed: data.maxEmployeesAllowed || 1000,
            maxSitesAllowed: data.maxSitesAllowed || 50,
            primaryColorHex: data.primaryColorHex || '#4f46e5',
            secondaryColorHex: data.secondaryColorHex || '#06b6d4',
            status: data.status || 'ACTIVE'
          };
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('inactive or expired') || err.message.includes('suspended')) {
          throw new Error('Company Code is inactive or expired');
        }
        if (err.message.toLowerCase().includes('offline') || err.message === 'timeout' || ((err as any).code && (err as any).code === 'unavailable')) {
          console.warn('[FirebaseAuthService] Client offline/cache miss during company verification');
        }
      } else {
        console.error('[FirebaseAuthService] Firestore company lookup error:', err);
      }
    }

    // Check active cached session company if offline
    const cachedCompany = SessionManager.getActiveCompany();
    if (cachedCompany && (cachedCompany.companyId?.toUpperCase() === cleanCode || cachedCompany.companyLegalName?.toUpperCase() === cleanCode)) {
      return cachedCompany;
    }
    
    // Fallback for Demo/Testing & Standard Enterprise codes if offline or demo
    const predefinedTenants: Record<string, CompanyTenant> = {
      'GLOBAL_ADMIN': {
        companyId: 'GLOBAL_ADMIN',
        companyLegalName: 'Log Sheet Muster Global Platform Administration',
        brandName: 'Global Platform Admin',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['GLOBAL', 'HQ'],
        maxEmployeesAllowed: 999999,
        maxSitesAllowed: 999999,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      },
      'SUPER_ADMIN': {
        companyId: 'GLOBAL_ADMIN',
        companyLegalName: 'Log Sheet Muster Global Platform Administration',
        brandName: 'Global Platform Admin',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['GLOBAL', 'HQ'],
        maxEmployeesAllowed: 999999,
        maxSitesAllowed: 999999,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      },
      'GLOBAL': {
        companyId: 'GLOBAL_ADMIN',
        companyLegalName: 'Log Sheet Muster Global Platform Administration',
        brandName: 'Global Platform Admin',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['GLOBAL', 'HQ'],
        maxEmployeesAllowed: 999999,
        maxSitesAllowed: 999999,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      },
      'ADMIN': {
        companyId: 'GLOBAL_ADMIN',
        companyLegalName: 'Log Sheet Muster Global Platform Administration',
        brandName: 'Global Platform Admin',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['GLOBAL', 'HQ'],
        maxEmployeesAllowed: 999999,
        maxSitesAllowed: 999999,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      },
      'SUPER': {
        companyId: 'GLOBAL_ADMIN',
        companyLegalName: 'Log Sheet Muster Global Platform Administration',
        brandName: 'Global Platform Admin',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['GLOBAL', 'HQ'],
        maxEmployeesAllowed: 999999,
        maxSitesAllowed: 999999,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      },
      'APEX-SEC-101': {
        companyId: 'APEX-SEC-101',
        companyLegalName: 'Apex Security Services Ltd',
        brandName: 'Apex Security',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['MAIN', 'NORTH', 'SOUTH'],
        maxEmployeesAllowed: 1000,
        maxSitesAllowed: 50,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      },
      'LOG-MUSTER-001': {
        companyId: 'LOG-MUSTER-001',
        companyLegalName: 'Log Sheet Muster Corp',
        brandName: 'Demo Corp',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['MAIN', 'PUNE', 'MUMBAI'],
        maxEmployeesAllowed: 500,
        maxSitesAllowed: 25,
        primaryColorHex: '#0ea5e9',
        secondaryColorHex: '#10b981',
        status: 'ACTIVE'
      },
      'GLOBAL-GUARD-01': {
        companyId: 'GLOBAL-GUARD-01',
        companyLegalName: 'Global Guard Solutions',
        brandName: 'Global Guard',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['MAIN'],
        maxEmployeesAllowed: 300,
        maxSitesAllowed: 15,
        primaryColorHex: '#8b5cf6',
        secondaryColorHex: '#f59e0b',
        status: 'ACTIVE'
      },
      'TATA': {
        companyId: 'TATA',
        companyLegalName: 'Tata Motors',
        brandName: 'Tata Motors',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['MAIN'],
        maxEmployeesAllowed: 1000,
        maxSitesAllowed: 50,
        primaryColorHex: '#0d3b66',
        secondaryColorHex: '#faf0ca',
        status: 'ACTIVE'
      },
      'TEST-COMP': {
        companyId: 'TEST-COMP',
        companyLegalName: 'Test Company Ltd',
        brandName: 'Test Co',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['MAIN'],
        maxEmployeesAllowed: 1000,
        maxSitesAllowed: 50,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      }
    };

    if (predefinedTenants[cleanCode]) {
      return predefinedTenants[cleanCode];
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Network offline: Unable to verify new company code. Please check your internet connection.');
    }

    throw new Error('Invalid Company Code');
  }

  /**
   * Fetches dynamic departments for the company
   */
  static async getCompanyDepartments(companyId: string): Promise<DepartmentRecord[]> {
    return await FirestoreService.getCompanyDepartments(companyId);
  }

  /**
   * Register a new user with Email & Password
   */
  static async signUpWithEmailPassword(params: {
    fullName: string;
    email: string;
    password: string;
    companyCode: string;
    departmentId: string;
    departmentName: string;
    mobileNumber?: string;
  }): Promise<{ fbUser: FirebaseUser; userSession: UserSession; accountStatus: AccountStatus }> {
    const { fullName, email, password, companyCode, departmentId, departmentName, mobileNumber } = params;

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName) throw new Error('Full Name is required.');
    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Valid email address is required.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');

    let companyTenant: CompanyTenant | null = null;
    if (!companyCode) throw new Error('Company Code is mandatory.');
    if (!departmentId || !departmentName) throw new Error('Department selection is required.');
    companyTenant = await this.verifyCompanyCode(companyCode);

    // 1. Create Firebase Auth user
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('This email address is already registered. Please login or reset your password.');
      }
      throw new Error(err.message || 'Failed to create user account.');
    }

    const fbUser = userCredential.user;

    // 2. Send Firebase email verification
    try {
      await sendEmailVerification(fbUser);
    } catch (verr) {
      console.warn('[FirebaseAuthService] sendEmailVerification warning:', verr);
    }

    const timestamp = new Date().toISOString();

    // 3. Super Admin Reserved Initialization
    const isReservedSuperAdmin = RESERVED_SUPER_ADMIN_EMAILS.includes(cleanEmail);
    if (isReservedSuperAdmin) {
      await FirestoreService.initializeSuperAdminConfig(fbUser.uid, cleanEmail);

      const superUserDoc = {
        uid: fbUser.uid,
        email: cleanEmail,
        fullName: cleanName || 'Super Administrator',
        companyId: 'GLOBAL_ADMIN',
        departmentId: 'DEPT-SUPER-ADMIN',
        departmentName: 'Super Admin',
        mobileNumber: mobileNumber || '',
        role: 'SUPER_ADMIN' as UserRole,
        accountStatus: 'ACTIVE' as AccountStatus,
        emailVerified: fbUser.emailVerified,
        companyAdminApproval: 'APPROVED' as ApprovalStatus,
        hrApproval: 'APPROVED' as ApprovalStatus,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await setDoc(doc(db, 'users', fbUser.uid), superUserDoc, { merge: true });

      const session: UserSession = {
        userId: fbUser.uid,
        employeeId: 'SA-001',
        fullName: superUserDoc.fullName,
        email: cleanEmail,
        role: 'SUPER_ADMIN',
        companyId: 'GLOBAL_ADMIN',
        branchId: 'HQ',
        token: await fbUser.getIdToken(),
        tokenExpiresAt: Date.now() + (12 * 60 * 60 * 1000),
        isBiometricEnabled: false,
        lastActiveAt: Date.now(),
        loginMode: 'PASSWORD',
        accountStatus: 'ACTIVE',
        emailVerified: fbUser.emailVerified
      };

      await FirestoreService.logAuditEvent('GLOBAL', fbUser.uid, cleanName, 'SUPER_ADMIN_INITIALIZED', `Initial Super Admin account registered for ${cleanEmail}`);

      return { fbUser, userSession: session, accountStatus: 'ACTIVE' };
    }

    // 4. Normal Company User Registration
    const companyId = companyTenant!.companyId;
    const userDocData = {
      uid: fbUser.uid,
      email: cleanEmail,
      fullName: cleanName,
      companyId,
      companyName: companyTenant!.brandName,
      departmentId,
      departmentName,
      mobileNumber: mobileNumber || '',
      role: 'EMPLOYEE' as UserRole, // Safe default role
      accountStatus: 'PENDING_APPROVAL' as AccountStatus,
      emailVerified: fbUser.emailVerified,
      companyAdminApproval: 'PENDING' as ApprovalStatus,
      hrApproval: 'PENDING' as ApprovalStatus,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Store in root 'users' collection
    await setDoc(doc(db, 'users', fbUser.uid), userDocData, { merge: true });

    // Store in membership subcollection
    await setDoc(doc(db, 'users', fbUser.uid, 'memberships', companyId), {
      userId: fbUser.uid,
      email: cleanEmail,
      fullName: cleanName,
      role: 'EMPLOYEE',
      companyId,
      status: 'PENDING',
      updatedAt: timestamp
    }, { merge: true });

    // 5. Create Approval Request Record
    const approvalReq: ApprovalRequestRecord = {
      id: `REQ-${fbUser.uid}`,
      uid: fbUser.uid,
      fullName: cleanName,
      email: cleanEmail,
      mobileNumber: mobileNumber || '',
      companyId,
      companyName: companyTenant!.brandName,
      departmentId,
      departmentName,
      requestedRole: 'GUARD',
      emailVerified: fbUser.emailVerified,
      companyAdminApproval: 'PENDING',
      hrApproval: 'PENDING',
      accountStatus: 'PENDING_APPROVAL',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await FirestoreService.saveApprovalRequest(approvalReq);

    // 6. Create Notification for Company Admin & HR
    try {
      const notifRef = doc(db, 'companies', companyId, 'notifications', `NOTIF-APP-${Date.now()}`);
      await setDoc(notifRef, {
        id: notifRef.id,
        title: 'New Account Approval Request',
        message: `${cleanName} (${cleanEmail}) registered for ${departmentName} and requires approval.`,
        type: 'ALERT',
        timestamp,
        isRead: false,
        roleScope: ['COMPANY_ADMIN', 'HR_ADMIN'],
        siteId: 'HQ'
      });
    } catch (nErr) {
      console.warn('[FirebaseAuthService] Notification creation warning:', nErr);
    }

    // 7. Log Audit Event
    await FirestoreService.logAuditEvent(
      companyId,
      fbUser.uid,
      cleanName,
      'SIGNUP',
      `User signed up with email/password. Department: ${departmentName}, Company: ${companyId}`
    );

    const session: UserSession = {
      userId: fbUser.uid,
      employeeId: `EMP-${fbUser.uid.substring(0, 6).toUpperCase()}`,
      fullName: cleanName,
      email: cleanEmail,
      role: 'GUARD' as UserRole, // explicit signup default
      companyId,
      branchId: 'MAIN',
      token: await fbUser.getIdToken(),
      tokenExpiresAt: Date.now() + (12 * 60 * 60 * 1000),
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'PASSWORD',
      accountStatus: 'PENDING_APPROVAL',
      emailVerified: fbUser.emailVerified,
      departmentId,
      departmentName,
      companyAdminApproval: 'PENDING',
      hrApproval: 'PENDING'
    };

    return { fbUser, userSession: session, accountStatus: 'PENDING_APPROVAL' };
  }

  /**
   * Google Sign-In Authentication Flow
   */
  static async signInWithGoogle(): Promise<{
    fbUser: FirebaseUser;
    userSession?: UserSession;
    isNewUser: boolean;
    accountStatus?: AccountStatus;
  }> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    let userCredential;
    try {
      userCredential = await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('[FirebaseAuthService] Google Sign-In error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-blocked') {
        throw new Error('Google Sign-In popup was blocked by your browser. Please allow popups for this site or use Email & Password.');
      } else if (code === 'auth/unauthorized-domain') {
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
        throw new Error(`Domain "${currentHostname}" is not in Firebase Auth's Authorized Domains list. Please use Email & Password below, or add "${currentHostname}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`);
      } else if (code === 'auth/operation-not-allowed') {
        throw new Error('Google Sign-In is not enabled in Firebase Console (Authentication > Sign-in method). Please register using Email & Password below.');
      } else if (code === 'auth/popup-closed-by-user') {
        throw new Error('Google Sign-In window was closed. Please try again or use Email & Password.');
      } else if (code === 'auth/cancelled-popup-request') {
        throw new Error('Another sign-in popup is already in progress.');
      } else if (code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw new Error(err.message || 'Google authentication was cancelled or failed.');
    }

    const fbUser = userCredential.user;
    const cleanEmail = (fbUser.email || '').toLowerCase();

    // Check if user document already exists in Firestore root 'users' collection
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const uData = userSnap.data();
      const accountStatus = (uData.accountStatus as AccountStatus) || 'PENDING_APPROVAL';

      const session: UserSession = {
        userId: fbUser.uid,
        employeeId: uData.employeeId || `EMP-${fbUser.uid.substring(0, 6).toUpperCase()}`,
        fullName: uData.fullName || fbUser.displayName || 'Google User',
        email: cleanEmail,
        role: (uData.role as UserRole),
        companyId: uData.companyId || 'PENDING',
        branchId: uData.branchId || 'MAIN',
        assignedSiteId: uData.assignedSiteId,
        avatarUrl: fbUser.photoURL || undefined,
        token: await fbUser.getIdToken(),
        tokenExpiresAt: Date.now() + (12 * 60 * 60 * 1000),
        isBiometricEnabled: false,
        lastActiveAt: Date.now(),
        loginMode: 'GOOGLE',
        accountStatus,
        emailVerified: true,
        departmentId: uData.departmentId,
        departmentName: uData.departmentName,
        companyAdminApproval: uData.companyAdminApproval || 'PENDING',
        hrApproval: uData.hrApproval || 'PENDING'
      };

      return { fbUser, userSession: session, isNewUser: false, accountStatus };
    }

    // Check if user is reserved Super Admin email
    const isReservedSuperAdmin = RESERVED_SUPER_ADMIN_EMAILS.includes(cleanEmail);
    if (isReservedSuperAdmin) {
      await FirestoreService.initializeSuperAdminConfig(fbUser.uid, cleanEmail);

      const timestamp = new Date().toISOString();
      const superUserDoc = {
        uid: fbUser.uid,
        email: cleanEmail,
        fullName: fbUser.displayName || 'Super Administrator',
        companyId: 'GLOBAL_ADMIN',
        departmentId: 'DEPT-SUPER-ADMIN',
        departmentName: 'Super Admin',
        role: 'SUPER_ADMIN' as UserRole,
        accountStatus: 'ACTIVE' as AccountStatus,
        emailVerified: true,
        companyAdminApproval: 'APPROVED' as ApprovalStatus,
        hrApproval: 'APPROVED' as ApprovalStatus,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await setDoc(userDocRef, superUserDoc, { merge: true });

      const session: UserSession = {
        userId: fbUser.uid,
        employeeId: 'SA-001',
        fullName: superUserDoc.fullName,
        email: cleanEmail,
        role: 'SUPER_ADMIN',
        companyId: 'GLOBAL_ADMIN',
        branchId: 'HQ',
        avatarUrl: fbUser.photoURL || undefined,
        token: await fbUser.getIdToken(),
        tokenExpiresAt: Date.now() + (12 * 60 * 60 * 1000),
        isBiometricEnabled: false,
        lastActiveAt: Date.now(),
        loginMode: 'GOOGLE',
        accountStatus: 'ACTIVE',
        emailVerified: true
      };

      await FirestoreService.logAuditEvent('GLOBAL', fbUser.uid, superUserDoc.fullName, 'GOOGLE_SIGNUP', `Super Admin signed up with Google (${cleanEmail})`);

      return { fbUser, userSession: session, isNewUser: false, accountStatus: 'ACTIVE' };
    }

    // If new normal user, UI must prompt for Company Code & Department
    return { fbUser, isNewUser: true };
  }

  /**
   * Finalize Google User Registration with Company Code & Department
   */
  static async completeGoogleRegistration(params: {
    fbUser: FirebaseUser;
    companyCode: string;
    departmentId: string;
    departmentName: string;
    mobileNumber?: string;
  }): Promise<{ userSession: UserSession; accountStatus: AccountStatus }> {
    const { fbUser, companyCode, departmentId, departmentName, mobileNumber } = params;

    const companyTenant = await this.verifyCompanyCode(companyCode);
    if (!departmentId || !departmentName) throw new Error('Department selection is required.');

    const timestamp = new Date().toISOString();
    const cleanEmail = (fbUser.email || '').toLowerCase();
    const cleanName = fbUser.displayName || cleanEmail.split('@')[0] || 'Google User';
    const companyId = companyTenant.companyId;

    const userDocData = {
      uid: fbUser.uid,
      email: cleanEmail,
      fullName: cleanName,
      companyId,
      companyName: companyTenant.brandName,
      departmentId,
      departmentName,
      mobileNumber: mobileNumber || '',
      role: 'EMPLOYEE' as UserRole,
      accountStatus: 'PENDING_APPROVAL' as AccountStatus,
      emailVerified: true, // Google accounts are email verified
      companyAdminApproval: 'PENDING' as ApprovalStatus,
      hrApproval: 'PENDING' as ApprovalStatus,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Store root user doc
    await setDoc(doc(db, 'users', fbUser.uid), userDocData, { merge: true });

    // Store membership
    await setDoc(doc(db, 'users', fbUser.uid, 'memberships', companyId), {
      userId: fbUser.uid,
      email: cleanEmail,
      fullName: cleanName,
      role: 'EMPLOYEE',
      companyId,
      status: 'PENDING',
      updatedAt: timestamp
    }, { merge: true });

    // Create approval request
    const approvalReq: ApprovalRequestRecord = {
      id: `REQ-${fbUser.uid}`,
      uid: fbUser.uid,
      fullName: cleanName,
      email: cleanEmail,
      mobileNumber: mobileNumber || '',
      companyId,
      companyName: companyTenant.brandName,
      departmentId,
      departmentName,
      requestedRole: 'GUARD',
      emailVerified: true,
      companyAdminApproval: 'PENDING',
      hrApproval: 'PENDING',
      accountStatus: 'PENDING_APPROVAL',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await FirestoreService.saveApprovalRequest(approvalReq);

    // Audit log
    await FirestoreService.logAuditEvent(
      companyId,
      fbUser.uid,
      cleanName,
      'GOOGLE_SIGNUP',
      `Google user completed registration. Department: ${departmentName}, Company: ${companyId}`
    );

    const session: UserSession = {
      userId: fbUser.uid,
      employeeId: `EMP-${fbUser.uid.substring(0, 6).toUpperCase()}`,
      fullName: cleanName,
      email: cleanEmail,
      role: 'GUARD' as UserRole, // explicit signup default
      companyId,
      branchId: 'MAIN',
      avatarUrl: fbUser.photoURL || undefined,
      token: await fbUser.getIdToken(),
      tokenExpiresAt: Date.now() + (12 * 60 * 60 * 1000),
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'GOOGLE',
      accountStatus: 'PENDING_APPROVAL',
      emailVerified: true,
      departmentId,
      departmentName,
      companyAdminApproval: 'PENDING',
      hrApproval: 'PENDING'
    };

    return { userSession: session, accountStatus: 'PENDING_APPROVAL' };
  }

  /**
   * Resend Email Verification
   */
  static async resendVerificationEmail(): Promise<string> {
    if (!auth.currentUser) {
      throw new Error('No authenticated user session found.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
      return `Verification email successfully sent to ${auth.currentUser.email}. Please check your inbox.`;
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many requests sent. Please wait a few moments before resending verification.');
      }
      throw new Error(err.message || 'Failed to resend verification email.');
    }
  }

  /**
   * Reload current user & check account status in Firestore
   */
  static async reloadUserAndCheckStatus(uid: string): Promise<{
    emailVerified: boolean;
    accountStatus: AccountStatus;
    userData: any;
  }> {
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
      } catch (e) {
        console.warn('[FirebaseAuthService] Reload currentUser warning:', e);
      }
    }

    const emailVerified = auth.currentUser?.emailVerified ?? false;
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      return { emailVerified, accountStatus: 'PENDING_APPROVAL', userData: null };
    }

    const uData = snap.data();
    let accountStatus = (uData.accountStatus as AccountStatus) || 'PENDING_APPROVAL';

    // If both company admin and hr approved AND email is verified, elevate accountStatus to ACTIVE
    if (
      uData.companyAdminApproval === 'APPROVED' &&
      uData.hrApproval === 'APPROVED' &&
      (emailVerified || uData.emailVerified) &&
      accountStatus !== 'REJECTED' &&
      accountStatus !== 'DISABLED'
    ) {
      accountStatus = 'ACTIVE';
      if (uData.accountStatus !== 'ACTIVE') {
        await setDoc(userDocRef, { accountStatus: 'ACTIVE', emailVerified: true }, { merge: true });
      }
    }

    return { emailVerified, accountStatus, userData: uData };
  }

  /**
   * Performs real authentication using Firebase Auth (Email/Password) or Firestore lookup (Employee ID / PIN)
   */
  static async authenticateUser(params: {
    companyId: string;
    emailOrId: string;
    passwordOrPin: string;
    isPinMode: boolean;
  }): Promise<UserSession> {
    const { companyId, emailOrId, passwordOrPin, isPinMode } = params;
    const cleanInput = emailOrId.trim();
    const cleanInputLower = cleanInput.toLowerCase();

    // 1. Firebase Auth mode (Email / Password)
    if (!isPinMode || cleanInput.includes('@')) {
      try {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, cleanInputLower, passwordOrPin);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
             // If it's a reserved super admin, auto-create the account
             if (RESERVED_SUPER_ADMIN_EMAILS.includes(cleanInputLower)) {
                try {
                  userCredential = await createUserWithEmailAndPassword(auth, cleanInputLower, passwordOrPin);
                } catch (createErr: any) {
                  throw authErr;
                }
             } else {
               throw authErr;
             }
          } else {
            throw authErr;
          }
        }
        const fbUser = userCredential.user;
        const userEmail = (fbUser.email || cleanInputLower).toLowerCase();

        const isReservedSuperAdmin = RESERVED_SUPER_ADMIN_EMAILS.includes(userEmail);

        // Default session values
        let role: UserRole = isReservedSuperAdmin ? 'SUPER_ADMIN' : 'COMPANY_ADMIN';
        let employeeId = isReservedSuperAdmin ? 'SA-001' : `EMP-${fbUser.uid.substring(0, 6).toUpperCase()}`;
        let fullName = fbUser.displayName || userEmail.split('@')[0] || (isReservedSuperAdmin ? 'Super Administrator' : 'Authenticated User');
        let branchId = isReservedSuperAdmin ? 'HQ' : 'MAIN_BRANCH';
        let assignedSiteId: string | undefined = undefined;
        let accountStatus: AccountStatus = 'ACTIVE';
        let departmentId: string | undefined = isReservedSuperAdmin ? 'DEPT-SUPER-ADMIN' : undefined;
        let departmentName: string | undefined = isReservedSuperAdmin ? 'Super Admin' : undefined;
        let companyAdminApproval: ApprovalStatus = 'APPROVED';
        let hrApproval: ApprovalStatus = 'APPROVED';
        let userCompanyId = isReservedSuperAdmin ? 'GLOBAL_ADMIN' : companyId;

        // Safely fetch user profile from Firestore root 'users' collection with offline resilience
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const uData = userSnap.data();
            const isUserSuperAdmin = isReservedSuperAdmin || uData.role === 'SUPER_ADMIN';
            
            if (uData.companyId && uData.companyId !== companyId && !isUserSuperAdmin) {
              throw new Error(`User is not authorized for company: ${companyId}`);
            }
            
            role = isUserSuperAdmin ? 'SUPER_ADMIN' : (uData.role || role);
            employeeId = uData.employeeId || employeeId;
            fullName = uData.fullName || fullName;
            branchId = uData.branchId || branchId;
            assignedSiteId = uData.assignedSiteId;
            accountStatus = ((uData.accountStatus as AccountStatus) || accountStatus);
            departmentId = uData.departmentId || departmentId;
            departmentName = uData.departmentName || departmentName;
            companyAdminApproval = uData.companyAdminApproval || companyAdminApproval;
            hrApproval = uData.hrApproval || hrApproval;
            if (isUserSuperAdmin) {
              userCompanyId = 'GLOBAL_ADMIN';
            } else if (uData.companyId && uData.companyId !== 'PENDING') {
              userCompanyId = uData.companyId;
            }
          } else if (isReservedSuperAdmin) {
            // Ensure super admin doc exists in Firestore root collection
            const timestamp = new Date().toISOString();
            const superUserDoc = {
              uid: fbUser.uid,
              email: userEmail,
              fullName,
              companyId: 'GLOBAL_ADMIN',
              departmentId: 'DEPT-SUPER-ADMIN',
              departmentName: 'Super Admin',
              role: 'SUPER_ADMIN' as UserRole,
              accountStatus: 'ACTIVE' as AccountStatus,
              emailVerified: true,
              companyAdminApproval: 'APPROVED' as ApprovalStatus,
              hrApproval: 'APPROVED' as ApprovalStatus,
              createdAt: timestamp,
              updatedAt: timestamp
            };
            setDoc(userDocRef, superUserDoc, { merge: true }).catch(err =>
              console.warn('[FirebaseAuthService] Non-critical super admin user doc sync warning:', err)
            );
          }
        } catch (firestoreErr: any) {
          console.warn('[FirebaseAuthService] Firestore profile check skipped/handled (offline or missing):', firestoreErr);
          if (firestoreErr.message && firestoreErr.message.includes('not authorized')) {
            throw firestoreErr;
          }
        }

        const session: UserSession = {
          userId: fbUser.uid,
          employeeId,
          fullName,
          email: userEmail,
          role,
          companyId: userCompanyId,
          branchId,
          assignedSiteId,
          token: await fbUser.getIdToken(),
          tokenExpiresAt: Date.now() + (12 * 60 * 60 * 1000),
          isBiometricEnabled: false,
          lastActiveAt: Date.now(),
          loginMode: 'PASSWORD',
          accountStatus,
          emailVerified: fbUser.emailVerified ,
          departmentId,
          departmentName,
          companyAdminApproval,
          hrApproval
        };
        return session;
      } catch (err: unknown) {
        const firebaseErr = err as { code?: string; message?: string };
        if (
          firebaseErr.code === 'auth/wrong-password' ||
          firebaseErr.code === 'auth/user-not-found' ||
          firebaseErr.code === 'auth/invalid-credential'
        ) {
          throw new Error('Invalid email or password. Please verify your login details.');
        }
        if (err instanceof Error) {
          throw err;
        }
      }
    }

    
    // 2. PIN / Employee ID Mode - Strict Custom Token Flow via generatePinToken Cloud Function
    try {
      const generatePinTokenFn = httpsCallable(functions, 'generatePinToken');
      const res: any = await generatePinTokenFn({
        companyId,
        employeeId: cleanInput,
        pin: passwordOrPin
      });

      const data = res.data || {};
      const customToken = data.token;
      if (!customToken) {
        throw new Error('Secure PIN authentication is currently unavailable. Please try again.');
      }

      // Sign in with Firebase Custom Token
      const userCred = await signInWithCustomToken(auth, customToken);
      const fbUser = userCred.user;

      // Obtain ID token result with claims
      const idTokenResult = await fbUser.getIdTokenResult(true);
      const claims = idTokenResult.claims || {};

      if (claims.status === 'TERMINATED' || claims.status === 'SUSPENDED') {
        await signOut(auth);
        throw new Error(`Account is ${claims.status}. Login denied.`);
      }

      // Fetch employee record for profile details
      const empColRef = collection(db, 'companies', companyId, 'employees');
      const empQuery = query(empColRef, where('employeeId', '==', cleanInput));
      const querySnap = await getDocs(empQuery);

      let empData: any = {};
      let empDocId = fbUser.uid;
      if (!querySnap.empty) {
        empDocId = querySnap.docs[0].id;
        empData = querySnap.docs[0].data();
      }

      console.log('[Auth] Login mode: CUSTOM_TOKEN successful for employee:', cleanInput);

      const session: UserSession = {
        userId: empDocId,
        firebaseUid: fbUser.uid,
        employeeId: empData.employeeId || cleanInput,
        fullName: `${empData.firstName || ''} ${empData.lastName || ''}`.trim() || fbUser.displayName || 'Employee',
        email: empData.email || fbUser.email || `${cleanInput.toLowerCase()}@company.com`,
        role: (empData.role as UserRole) || 'GUARD',
        authorityLevel: (claims.aLvl as any) || empData.authorityLevel || 'A9_SUPPORT',
        regionId: (claims.rId as string) || empData.assignedRegionId,
        assignedSiteId: (claims.sId as string) || empData.assignedSiteId,
        departmentId: (claims.dId as string) || empData.departmentId,
        companyId,
        branchId: empData.branchId || 'MAIN_BRANCH',
        avatarUrl: empData.photoUrl || fbUser.photoURL || undefined,
        token: await fbUser.getIdToken(),
        tokenExpiresAt: idTokenResult.expirationTime ? new Date(idTokenResult.expirationTime).getTime() : Date.now() + (24 * 60 * 60 * 1000),
        isBiometricEnabled: true,
        lastActiveAt: Date.now(),
        loginMode: 'PIN',
        authMode: 'CUSTOM_TOKEN',
        permissionsVersion: (claims.pV as number) || 1,
        accountStatus: 'ACTIVE',
        emailVerified: true
      };
      return session;

    } catch (err: any) {
      console.error('[FirebaseAuthService] PIN auth error:', err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Invalid credentials or PIN entered. Please check your details and try again.');
    }

    throw new Error('Invalid credentials or PIN entered. Please check your details and try again.');
  }

  /**
   * Safely logs out user from Firebase Auth and clears session
   */
  static async logoutUser(): Promise<void> {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('[FirebaseAuthService] SignOut warning:', e);
    }
    SessionManager.clearSession();
  }

  /**
   * Refreshes the user session token and claims
   */
  static async refreshSession(currentSession: UserSession): Promise<UserSession> {
    if (!auth.currentUser) {
      return currentSession;
    }
    try {
      const idTokenResult = await auth.currentUser.getIdTokenResult(true);
      const claims = idTokenResult.claims || {};

      if (claims.status === 'TERMINATED' || claims.status === 'SUSPENDED') {
        await signOut(auth);
        throw new Error(`Account is ${claims.status}. Session terminated.`);
      }

      return {
        ...currentSession,
        token: await auth.currentUser.getIdToken(),
        tokenExpiresAt: idTokenResult.expirationTime ? new Date(idTokenResult.expirationTime).getTime() : currentSession.tokenExpiresAt,
        authorityLevel: (claims.aLvl as any) || currentSession.authorityLevel,
        regionId: (claims.rId as string) || currentSession.regionId,
        assignedSiteId: (claims.sId as string) || currentSession.assignedSiteId,
        departmentId: (claims.dId as string) || currentSession.departmentId,
        permissionsVersion: (claims.pV as number) || currentSession.permissionsVersion,
        lastActiveAt: Date.now()
      };
    } catch (err) {
      console.error('[FirebaseAuthService] Session refresh error:', err);
      return currentSession;
    }
  }

  /**
   * Password Reset Request
   */
  static async requestPasswordReset(companyCode: string, emailOrId: string): Promise<string> {
    const cleanInput = emailOrId.trim();

    if (cleanInput.includes('@')) {
      try {
        await sendPasswordResetEmail(auth, cleanInput);
        FirestoreService.logAuditEvent(
          companyCode || 'GLOBAL',
          'UNAUTH',
          cleanInput,
          'PASSWORD_RESET_REQUESTED',
          `Password reset link requested for ${cleanInput}`
        ).catch(err => console.warn('[FirebaseAuthService] Audit log password reset warning:', err));

        return `Password reset instruction email has been sent to ${cleanInput}. Please check your inbox.`;
      } catch (err: unknown) {
        const firebaseErr = err as { code?: string; message?: string };
        if (firebaseErr.code === 'auth/user-not-found') {
          return `If an account exists for ${cleanInput}, a password reset link has been sent. Please check your inbox.`;
        }
        throw new Error(firebaseErr.message || 'Failed to send password reset email.');
      }
    }

    throw new Error('Please enter a valid registered email address for password reset.');
  }

  /**
   * Verify PIN for session unlock
   */
  static async verifyPin(companyId: string, employeeId: string, pinToVerify: string): Promise<boolean> {
    try {
      const empColRef = collection(db, 'companies', companyId, 'employees');
      const empQuery = query(empColRef, where('employeeId', '==', employeeId));
      const querySnap = await getDocs(empQuery);
      
      if (!querySnap.empty) {
        const empData = querySnap.docs[0].data();
        if (empData.pin === pinToVerify || empData.password === pinToVerify) {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('[FirebaseAuthService] verifyPin error:', err);
      return false;
    }
  }
}

  
  
