import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './firebaseAdmin';
import { PlatformAuthService } from './platformAuthService';
import { PlatformPermission } from '../types';
import { Router, Request, Response } from 'express';
import { TotpService } from '../services/totpService';
import fs from 'fs';
import path from 'path';

export const authRoutes = Router();

/**
 * Triggers a real password setup / activation / verification email via Firebase Identity Toolkit REST API
 */
async function triggerFirebaseActionEmail(email: string, requestType: 'PASSWORD_RESET' | 'VERIFY_EMAIL' = 'PASSWORD_RESET'): Promise<{ success: boolean; error?: string }> {
  try {
    let apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      try {
        const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          apiKey = cfg.apiKey;
        }
      } catch (e) {
        console.warn('[Firebase Email] Could not load apiKey from config:', e);
      }
    }

    if (!apiKey) {
      return { success: false, error: 'Firebase Web API Key is not configured on the server.' };
    }

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestType,
        email
      })
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      const errMsg = data.error?.message || `Identity Toolkit returned status ${response.status}`;
      console.warn(`[Firebase Email] Identity Toolkit sendOobCode failure for ${email}:`, errMsg);
      return { success: false, error: errMsg };
    }

    console.log(`[Firebase Email] Successfully triggered real ${requestType} email for: ${email}`);
    return { success: true };
  } catch (err: any) {
    console.error('[Firebase Email] Exception during sendOobCode:', err);
    return { success: false, error: err.message || 'Failed to dispatch email via Firebase Identity Toolkit.' };
  }
}

const verifyToken = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

/**
 * Robust middleware for Super Admin privileged routes.
 * Uses centralized PlatformAuthService for multi-layer validation.
 */
export const verifySuperAdminMiddleware = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No credentials provided.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  const result = await PlatformAuthService.verifySuperAdmin(idToken);

  if (!result.authenticated) {
    // Log unauthorized access attempt for audit trail
    await PlatformAuthService.logAudit({
      actorUid: result.decodedToken?.uid || 'UNKNOWN',
      actorEmail: result.decodedToken?.email || 'UNKNOWN',
      actorRole: result.decodedToken?.role || 'UNKNOWN',
      action: 'PLATFORM_ACCESS_DENIED',
      success: false,
      errorMessage: result.error || 'Unauthorized Super Admin access attempt',
      requestId: (req as any).id
    });

    return res.status(403).json({ 
      success: false, 
      error: result.error || 'Unauthorized: Platform Administrator privileges required.' 
    });
  }

  (req as any).user = result.decodedToken;
  next();
};

const rateLimits = new Map<string, { count: number, resetAt: number }>();
const checkRateLimit = (uid: string) => {
  const now = Date.now();
  const limit = rateLimits.get(uid);
  if (limit && now < limit.resetAt) {
    if (limit.count >= 5) {
      return false;
    }
  } else if (limit && now >= limit.resetAt) {
    rateLimits.delete(uid);
  }
  return true;
};
const recordFailedAttempt = (uid: string) => {
  const now = Date.now();
  const limit = rateLimits.get(uid);
  if (limit && now < limit.resetAt) {
    limit.count += 1;
  } else {
    rateLimits.set(uid, { count: 1, resetAt: now + 5 * 60 * 1000 });
  }
};
const resetAttempts = (uid: string) => {
  rateLimits.delete(uid);
};

authRoutes.post('/totp/setup', verifyToken, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.uid;
    const email = (req as any).user.email || 'user';

    const mfaSetupData = await TotpService.createMfaSetup({ accountName: email });

    // Mandate persistence to Firestore for enterprise-grade consistency
    const db = getAdminDb();
    await db.collection('totp_secrets').doc(uid).set({
      pendingTotpSecret: mfaSetupData.secret,
      pendingBackupCodes: mfaSetupData.backupCodes,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return res.json({
      success: true,
      otpAuthUri: mfaSetupData.otpAuthUri,
      qrCodeDataUrl: mfaSetupData.qrCodeDataUrl,
      formattedSecret: mfaSetupData.formattedSecret
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: 'Failed to generate 2FA setup. Ensure database connectivity.' });
  }
});

authRoutes.post('/totp/verify-setup', verifyToken, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.uid;
    const { token } = req.body;
    
    if (!checkRateLimit(uid)) {
      return res.status(429).json({ error: 'Too many failed attempts. Please wait 5 minutes.' });
    }

    const db = getAdminDb();
    const docSnap = await db.collection('totp_secrets').doc(uid).get();
    
    if (!docSnap.exists || !docSnap.data()?.pendingTotpSecret) {
      return res.status(400).json({ error: 'No pending 2FA setup found. Please initiate setup first.' });
    }

    const pendingTotpSecret = docSnap.data()?.pendingTotpSecret;
    const pendingBackupCodes = docSnap.data()?.pendingBackupCodes || [];

    const verifyResult = await TotpService.verifyCode(token, pendingTotpSecret);
    if (!verifyResult.isValid) {
      recordFailedAttempt(uid);
      return res.status(400).json({ error: verifyResult.error || 'Invalid code.' });
    }

    resetAttempts(uid);

    // Atomic update in Firestore
    const batch = db.batch();
    batch.set(db.collection('totp_secrets').doc(uid), {
      totpSecret: pendingTotpSecret,
      backupCodes: pendingBackupCodes,
      pendingTotpSecret: null,
      pendingBackupCodes: null,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    batch.set(db.collection('users').doc(uid), {
      mfaEnabled: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await batch.commit();

    try {
      const currentClaims = (req as any).user;
      await getAuth().setCustomUserClaims(uid, {
        ...currentClaims,
        totp_verified: true,
        totp_session_exp: Date.now() + 1000 * 60 * 60 * 8 // 8 hours
      });
    } catch (claimErr) {
      console.warn('[TOTP] Failed to update custom claims:', claimErr);
    }

    return res.json({
      success: true,
      backupCodes: pendingBackupCodes
    });
  } catch (error: any) {
    console.error('Verify setup error:', error);
    return res.status(500).json({ error: 'Failed to verify 2FA setup' });
  }
});

authRoutes.post('/totp/verify-login', verifyToken, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.uid;
    const { token } = req.body;

    if (!checkRateLimit(uid)) {
      return res.status(429).json({ error: 'Too many failed attempts. Please wait 5 minutes.' });
    }

    const db = getAdminDb();
    const docSnap = await db.collection('totp_secrets').doc(uid).get();
    
    if (!docSnap.exists || !docSnap.data()?.totpSecret) {
      return res.status(400).json({ error: '2FA is not enrolled for this account.' });
    }

    const totpSecret = docSnap.data()?.totpSecret;
    const backupCodes = docSnap.data()?.backupCodes || [];

    let isValid = false;
    let isBackupCode = false;

    const verifyResult = await TotpService.verifyCode(token, totpSecret);
    if (verifyResult.isValid) {
      isValid = true;
    } else if (backupCodes.includes(token)) {
      isValid = true;
      isBackupCode = true;
    }

    if (!isValid) {
      recordFailedAttempt(uid);
      return res.status(400).json({ error: 'Invalid code.' });
    }

    resetAttempts(uid);

    if (isBackupCode) {
      const remainingCodes = backupCodes.filter((c: string) => c !== token);
      await db.collection('totp_secrets').doc(uid).set({
        backupCodes: remainingCodes,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    try {
      const currentClaims = (req as any).user;
      await getAuth().setCustomUserClaims(uid, {
        ...currentClaims,
        totp_verified: true,
        totp_session_exp: Date.now() + 1000 * 60 * 60 * 8 // 8 hours
      });
    } catch (claimErr) {
      console.warn('[TOTP] Failed to set totp_verified claim:', claimErr);
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Verify login error:', error);
    return res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

authRoutes.post('/totp/disable', verifyToken, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.uid;
    const db = getAdminDb();
    
    const batch = db.batch();
    batch.delete(db.collection('totp_secrets').doc(uid));
    batch.set(db.collection('users').doc(uid), {
      mfaEnabled: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await batch.commit();

    try {
      const currentClaims = (req as any).user;
      const newClaims = { ...currentClaims };
      delete (newClaims as any).totp_verified;
      delete (newClaims as any).totp_session_exp;
      await getAuth().setCustomUserClaims(uid, newClaims);
    } catch (claimErr) {
      console.warn('[TOTP] Failed to clear custom claims:', claimErr);
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Disable 2FA error:', error);
    return res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// ============================================================
// ============================================================
// PRIVILEGED GLOBAL SUPER ADMIN COMPANY CREATION ENDPOINT
// ============================================================
authRoutes.post('/admin/create-company', verifySuperAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const callerUid = (req as any).user.uid;
    const callerEmail = ((req as any).user.email || '').toLowerCase();
    const db = getAdminDb();

    // 1. Authorization check: Permissions within the Super Admin role
    const hasPermission = await PlatformAuthService.validatePermission(callerUid, 'COMPANY_CREATE');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Permission denied: COMPANY_CREATE' });
    }

    const { company, adminInfo, enabledModules, createdByUid, createdByName } = req.body;

    // 2. Validate Company Inputs
    const companyCode = (company?.companyId || '').trim().toUpperCase();
    if (!companyCode) {
      return res.status(400).json({ success: false, error: 'Company Code / Tenant ID is required.' });
    }

    if (!/^[A-Z0-9_-]{2,20}$/.test(companyCode)) {
      return res.status(400).json({
        success: false,
        error: 'Company Code must be 2-20 uppercase alphanumeric characters (hyphens and underscores allowed).'
      });
    }

    const brandName = (company?.brandName || '').trim();
    if (!brandName) {
      return res.status(400).json({ success: false, error: 'Company Brand Name is required.' });
    }

    // 3. Validate Administrator Inputs & Password
    const adminEmail = (adminInfo?.email || '').trim().toLowerCase();
    const adminFullName = (adminInfo?.fullName || '').trim();
    const adminPassword = (adminInfo?.password || '').trim();
    const adminPhone = (adminInfo?.mobileNumber || company?.phone || '').trim();

    if (!adminFullName) {
      return res.status(400).json({ success: false, error: 'Company Administrator full name is required.' });
    }

    if (!adminEmail || !adminEmail.includes('@') || !adminEmail.includes('.')) {
      return res.status(400).json({ success: false, error: 'A valid Company Administrator email address is required.' });
    }

    if (!adminPassword || adminPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Company Administrator password must be at least 6 characters long.' });
    }

    // 4. Protect Super Admin accounts & check tenant isolation
    if (adminEmail === 'ghadgea15@gmail.com' || adminEmail === 'support@logsheetmuster.online') {
      return res.status(400).json({
        success: false,
        error: 'Cannot assign a Global Super Admin email as a Company Admin. Please use a dedicated Company Admin email.'
      });
    }

    const saCheck = await db.collection('super_admins').where('email', '==', adminEmail).get();
    if (!saCheck.empty) {
      return res.status(400).json({
        success: false,
        error: 'This email is already registered as a Global Super Admin.'
      });
    }

    // Check if user is already assigned to a different company in Firestore
    const existingUserQuery = await db.collection('users').where('email', '==', adminEmail).get();
    if (!existingUserQuery.empty) {
      const existingUserData = existingUserQuery.docs[0].data();
      if (existingUserData.companyId && existingUserData.companyId !== companyCode && existingUserData.companyId !== 'GLOBAL_ADMIN') {
        return res.status(409).json({
          success: false,
          error: `Email "${adminEmail}" is already associated with company "${existingUserData.companyId}". Each Company Admin must have a unique email address for strict tenant isolation.`
        });
      }
    }

    const timestamp = new Date().toISOString();

    // 5. Uniqueness check for Company Code
    const existingComp = await db.collection('companies').doc(companyCode).get();
    if (existingComp.exists) {
      return res.status(409).json({ 
        success: false, 
        error: `Company code "${companyCode}" is already in use by "${existingComp.data()?.brandName || companyCode}".` 
      });
    }

    const existingCode = await db.collection('company_codes').doc(companyCode).get();
    if (existingCode.exists) {
      return res.status(409).json({
        success: false,
        error: `Company code "${companyCode}" is already reserved in the platform lookup index.`
      });
    }

    // 6. Create or Link Firebase Auth User (Real Firebase Authentication)
    let adminAuthUid: string;
    try {
      let existingAuthUser: any = null;
      try {
        existingAuthUser = await getAuth().getUserByEmail(adminEmail);
      } catch (lookupErr: any) {
        if (lookupErr.code !== 'auth/user-not-found') {
          throw lookupErr;
        }
      }

      if (existingAuthUser) {
        adminAuthUid = existingAuthUser.uid;
        // Update password and display name for the existing auth user
        await getAuth().updateUser(adminAuthUid, {
          password: adminPassword,
          displayName: adminFullName,
          emailVerified: true
        });
      } else {
        // Create new Firebase Auth user
        const newAuthUser = await getAuth().createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: adminFullName,
          emailVerified: true
        });
        adminAuthUid = newAuthUser.uid;
      }

      // Set Custom User Claims for immediate security rules and RBAC resolution
      await getAuth().setCustomUserClaims(adminAuthUid, {
        cId: companyCode,
        companyId: companyCode,
        companyCode: companyCode,
        role: 'COMPANY_ADMIN',
        aLvl: 'A0_OWNER',
        status: 'ACTIVE',
        pV: 1
      });
    } catch (authErr: any) {
      console.error('[Admin API] Firebase Auth provisioning failure:', authErr);
      let errorMsg = authErr.message || 'Failed to create user in Firebase Authentication.';
      if (authErr.code === 'auth/invalid-password') {
        errorMsg = 'Password must be at least 6 characters long.';
      } else if (authErr.code === 'auth/invalid-email') {
        errorMsg = 'Invalid Company Admin email address format.';
      } else if (authErr.code === 'auth/email-already-exists') {
        errorMsg = 'An account with this email address already exists in Firebase Authentication.';
      }
      return res.status(400).json({
        success: false,
        error: errorMsg
      });
    }

    // 6.5. Trigger Real Activation / Password Reset Email via Firebase Identity Toolkit
    let emailDeliveryStatus: 'SENT' | 'FAILED' = 'SENT';
    let emailDeliveryError: string | null = null;
    let directActivationLink: string | null = null;

    try {
      directActivationLink = await getAuth().generatePasswordResetLink(adminEmail);
    } catch (linkErr: any) {
      console.warn('[Admin API] generatePasswordResetLink notice:', linkErr?.message);
    }

    const emailTriggerResult = await triggerFirebaseActionEmail(adminEmail, 'PASSWORD_RESET');
    if (!emailTriggerResult.success) {
      emailDeliveryStatus = 'FAILED';
      emailDeliveryError = emailTriggerResult.error || 'Failed to dispatch activation email via Firebase Identity Toolkit.';
      console.warn('[Admin API] Email delivery warning:', emailDeliveryError);
    }

    // 5. Atomic Provisioning Batch in Firestore
    const batch = db.batch();

    // (a) Company Tenant Record
    const companyRef = db.collection('companies').doc(companyCode);
    const companyData = {
      ...company,
      companyId: companyCode,
      companyCode: companyCode,
      companyLegalName: (company?.companyLegalName || brandName).trim(),
      brandName,
      licenseTier: company?.licenseTier || 'ENTERPRISE',
      status: 'ACTIVE',
      adminName: adminFullName,
      adminEmail,
      adminUid: adminAuthUid,
      emailDeliveryStatus,
      emailDeliveryError: emailDeliveryError || null,
      activationSentAt: timestamp,
      directActivationLink: directActivationLink || null,
      email: (company?.email || adminEmail).trim(),
      phone: (company?.phone || adminPhone || '').trim(),
      address: (company?.address || '').trim(),
      city: (company?.city || '').trim(),
      state: (company?.state || '').trim(),
      country: (company?.country || 'India').trim(),
      primaryColorHex: company?.primaryColorHex || '#4f46e5',
      secondaryColorHex: company?.secondaryColorHex || '#06b6d4',
      allowedBranches: company?.allowedBranches || ['MAIN'],
      maxEmployeesAllowed: Number(company?.maxEmployeesAllowed) || 1000,
      maxSitesAllowed: Number(company?.maxSitesAllowed) || 50,
      enabledModules: Array.isArray(enabledModules) && enabledModules.length > 0 
        ? enabledModules 
        : ['HCM', 'WFM', 'SCM', 'FINANCE', 'BPM', 'COMPLIANCE', 'PAYROLL', 'VISITOR_LOG', 'SECURITY_PATROL', 'INCIDENT', 'FLEET', 'CLIENT_BILLING'],
      logoUrl: (company?.logoUrl || '').trim(),
      websiteUrl: (company?.websiteUrl || '').trim(),
      portalSubdomain: (company?.portalSubdomain || '').trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // USE CREATE INSTEAD OF SET TO PREVENT OVERWRITE RACE CONDITIONS
    // .create() fails if the document already exists, providing atomic uniqueness.
    batch.create(companyRef, companyData);

    // (b) Fast Lookup Indices
    const codeRef = db.collection('company_codes').doc(companyCode);
    batch.create(codeRef, {
      companyId: companyCode,
      companyCode,
      brandName,
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp
    });

    const legacyCodeRef = db.collection('companyCodes').doc(companyCode);
    batch.create(legacyCodeRef, {
      companyId: companyCode,
      companyCode,
      brandName,
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // (c) Main Branch
    const mainBranchRef = db.collection('companies').doc(companyCode).collection('branches').doc('MAIN');
    batch.set(mainBranchRef, {
      id: 'MAIN',
      branchCode: 'MAIN',
      branchName: 'Main Branch / Head Office',
      isMainBranch: true,
      status: 'ACTIVE',
      companyId: companyCode,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // (d) Pre-provisioned Company Admin Employee Record
    const adminEmpId = 'EMP-ADM001';
    const adminEmpRef = db.collection('companies').doc(companyCode).collection('employees').doc(adminEmpId);
    batch.set(adminEmpRef, {
      id: adminEmpId,
      employeeId: 'ADM-001',
      companyId: companyCode,
      companyCode: companyCode,
      fullName: adminFullName,
      firstName: adminFullName.split(' ')[0] || adminFullName,
      lastName: adminFullName.split(' ').slice(1).join(' ') || ' ',
      email: adminEmail,
      contactNumber: adminPhone,
      mobileNumber: adminPhone,
      role: 'COMPANY_ADMIN',
      designation: 'Company Administrator',
      departmentId: 'ADMINISTRATION',
      departmentName: 'Administration',
      branchId: 'MAIN',
      status: 'ACTIVE',
      lifecycleStatus: 'ACTIVE',
      hasSystemAccess: true,
      authUid: adminAuthUid,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // (e) User Profile Record in root 'users' collection
    const userRef = db.collection('users').doc(adminAuthUid);
    batch.set(userRef, {
      uid: adminAuthUid,
      email: adminEmail,
      fullName: adminFullName,
      companyId: companyCode,
      companyCode: companyCode,
      companyName: brandName,
      role: 'COMPANY_ADMIN',
      authorityLevel: 'A0_OWNER',
      dataScope: 'COMPANY',
      status: 'ACTIVE',
      accountStatus: 'ACTIVE',
      employeeId: 'ADM-001',
      branchId: 'MAIN',
      departmentId: 'ADMINISTRATION',
      departmentName: 'Administration',
      mobileNumber: adminPhone,
      emailVerified: true,
      emailDeliveryStatus,
      emailDeliveryError: emailDeliveryError || null,
      activationSentAt: timestamp,
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED',
      provisioningSource: 'SUPER_ADMIN',
      createdAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });

    // (f) User Membership Record in subcollection
    const memRef = db.collection('users').doc(adminAuthUid).collection('memberships').doc(companyCode);
    batch.set(memRef, {
      userId: adminAuthUid,
      email: adminEmail,
      fullName: adminFullName,
      companyId: companyCode,
      companyCode: companyCode,
      companyName: brandName,
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      employeeId: 'ADM-001',
      branchId: 'MAIN',
      joinedAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });

    // (g) Pre-approved Provisioning Record (Company subcollection & root mirror)
    const approvalReqId = `REQ-ADMIN-${companyCode}`;
    const compApprovalRef = db.collection('companies').doc(companyCode).collection('approval_requests').doc(approvalReqId);
    const rootApprovalRef = db.collection('approval_requests').doc(approvalReqId);
    const approvalData = {
      id: approvalReqId,
      fullName: adminFullName,
      email: adminEmail,
      companyId: companyCode,
      companyCode: companyCode,
      companyName: brandName,
      role: 'COMPANY_ADMIN',
      accountStatus: 'APPROVED',
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED',
      mobileNumber: adminPhone,
      requestedAt: timestamp,
      reviewedAt: timestamp,
      reviewedBy: createdByName || 'System Super Admin',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    batch.set(compApprovalRef, approvalData);
    batch.set(rootApprovalRef, approvalData);

    // 8. Commit Firestore Batch
    await batch.commit();

    // 9. Platform Audit Log (Centralized)
    await PlatformAuthService.logAudit({
      actorUid: callerUid,
      actorEmail: callerEmail,
      actorRole: 'SUPER_ADMIN',
      action: 'COMPANY_CREATE',
      targetCompanyId: companyCode,
      targetResourceId: companyCode,
      success: true,
      requestId: (req as any).id,
      metadata: {
        after: {
          companyCode,
          brandName,
          adminEmail,
          adminFullName,
          adminAuthUid,
          emailDeliveryStatus,
          licenseTier: companyData.licenseTier,
          enabledModules: enabledModules || []
        }
      }
    });

    const successMessage = emailDeliveryStatus === 'SENT'
      ? `Company "${brandName}" (${companyCode}) successfully provisioned and real activation email dispatched to ${adminEmail}.`
      : `Company "${brandName}" (${companyCode}) provisioned. Note: Email delivery returned status (${emailDeliveryError || 'FAILED'}).`;

    return res.json({
      success: true,
      message: successMessage,
      companyId: companyCode,
      adminUid: adminAuthUid,
      adminEmail,
      emailDelivery: {
        status: emailDeliveryStatus,
        error: emailDeliveryError
      }
    });
  } catch (error: any) {
    console.error('[Admin API] Create company error:', error);
    
    // Log platform audit failure
    await PlatformAuthService.logAudit({
      actorUid: (req as any).user?.uid || 'UNKNOWN',
      actorEmail: (req as any).user?.email || 'UNKNOWN',
      actorRole: 'SUPER_ADMIN',
      action: 'COMPANY_CREATE',
      success: false,
      errorMessage: error?.message || 'Server error during company creation',
      requestId: (req as any).id
    });

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to provision company tenant.'
    });
  }
});

// ============================================================
// RESEND COMPANY ADMIN ACTIVATION EMAIL ENDPOINT
// ============================================================
authRoutes.post('/admin/resend-admin-activation', verifySuperAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const callerUid = (req as any).user.uid;
    const callerEmail = ((req as any).user.email || '').toLowerCase();
    const db = getAdminDb();

    // 1. Authorization check
    const hasPermission = await PlatformAuthService.validatePermission(callerUid, 'COMPANY_ADMIN_MANAGE');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Permission denied: COMPANY_ADMIN_MANAGE' });
    }

    const { companyId, adminEmail: providedEmail } = req.body;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required.' });
    }

    const compDoc = await db.collection('companies').doc(companyId).get();
    if (!compDoc.exists) {
      return res.status(404).json({ success: false, error: `Company "${companyId}" not found.` });
    }

    const compData = compDoc.data();
    const targetEmail = (providedEmail || compData?.adminEmail || compData?.email || '').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'No valid administrator email found for this company.' });
    }

    // 2. Rate Limiting / Cooldown Check (60 seconds)
    const lastSentStr = compData?.activationSentAt;
    if (lastSentStr) {
      const lastSentTime = new Date(lastSentStr).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastSentTime) / 1000);
      if (elapsedSeconds < 60) {
        const remaining = 60 - elapsedSeconds;
        return res.status(429).json({
          success: false,
          error: `Please wait ${remaining} second${remaining === 1 ? '' : 's'} before resending another activation email.`
        });
      }
    }

    // 3. Trigger Real Email via Identity Toolkit
    const emailResult = await triggerFirebaseActionEmail(targetEmail, 'PASSWORD_RESET');
    const timestamp = new Date().toISOString();

    if (!emailResult.success) {
      await db.collection('companies').doc(companyId).set({
        emailDeliveryStatus: 'FAILED',
        emailDeliveryError: emailResult.error || 'Failed to dispatch email.',
        updatedAt: timestamp
      }, { merge: true });

      return res.status(400).json({
        success: false,
        error: emailResult.error || 'Failed to trigger activation email via Firebase Identity Toolkit.'
      });
    }

    // 4. Update Company & User record
    await db.collection('companies').doc(companyId).set({
      emailDeliveryStatus: 'SENT',
      emailDeliveryError: null,
      activationSentAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });

    if (compData?.adminUid) {
      await db.collection('users').doc(compData.adminUid).set({
        emailDeliveryStatus: 'SENT',
        emailDeliveryError: null,
        activationSentAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });
    }

    // 5. Audit Log (Centralized)
    await PlatformAuthService.logAudit({
      actorUid: callerUid,
      actorEmail: callerEmail,
      actorRole: 'SUPER_ADMIN',
      action: 'COMPANY_ADMIN_MANAGE',
      targetCompanyId: companyId,
      targetResourceId: targetEmail,
      success: true,
      requestId: (req as any).id,
      metadata: {
        details: `Resent activation email to ${targetEmail}`
      }
    });

    return res.json({
      success: true,
      message: `Real activation email successfully sent to ${targetEmail}.`
    });
  } catch (error: any) {
    console.error('[Admin API] Resend activation email error:', error);
    
    // Log platform audit failure
    await PlatformAuthService.logAudit({
      actorUid: (req as any).user?.uid || 'UNKNOWN',
      actorEmail: (req as any).user?.email || 'UNKNOWN',
      actorRole: 'SUPER_ADMIN',
      action: 'COMPANY_ADMIN_MANAGE',
      success: false,
      errorMessage: error?.message || 'Server error during resend activation',
      requestId: (req as any).id
    });

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to resend activation email.'
    });
  }
});

// ============================================================
// GLOBAL SUPER ADMIN: FETCH ALL REGISTERED PLATFORM COMPANIES
// ============================================================
authRoutes.get('/admin/companies', verifySuperAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const callerUid = (req as any).user.uid;
    const callerEmail = ((req as any).user.email || '').toLowerCase();
    const db = getAdminDb();

    // 1. Authorization check
    const hasPermission = await PlatformAuthService.validatePermission(callerUid, 'COMPANY_VIEW_LIST');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Permission denied: COMPANY_VIEW_LIST' });
    }

    // 2. Fetch all companies from Firestore using Firebase Admin SDK
    const snapshot = await db.collection('companies').get();
    if (snapshot.empty) {
      return res.json({ success: true, companies: [] });
    }

    const companies = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        companyId: docSnap.id,
        companyCode: data.companyCode || data.companyId || docSnap.id,
        companyLegalName: data.companyLegalName || data.brandName || docSnap.id,
        brandName: data.brandName || data.companyLegalName || docSnap.id,
        licenseTier: data.licenseTier || 'ENTERPRISE',
        status: data.status || 'ACTIVE',
        primaryColorHex: data.primaryColorHex || '#4f46e5',
        secondaryColorHex: data.secondaryColorHex || '#06b6d4',
        allowedBranches: data.allowedBranches || ['MAIN'],
        maxEmployeesAllowed: Number(data.maxEmployeesAllowed) || 1000,
        maxSitesAllowed: Number(data.maxSitesAllowed) || 50,
        enabledModules: data.enabledModules || [],
        logoUrl: data.logoUrl || '',
        websiteUrl: data.websiteUrl || '',
        portalSubdomain: data.portalSubdomain || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || 'India',
        adminName: data.adminName || '',
        adminEmail: data.adminEmail || '',
        adminUid: data.adminUid || '',
        emailDeliveryStatus: data.emailDeliveryStatus || null,
        emailDeliveryError: data.emailDeliveryError || null,
        activationSentAt: data.activationSentAt || null,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
    });

    companies.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? a.createdAt : '';
      const dateB = typeof b.createdAt === 'string' ? b.createdAt : '';
      return dateB.localeCompare(dateA);
    });

    return res.json({ success: true, companies });
  } catch (error: any) {
    console.error('[Admin API] Get all companies error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to retrieve companies list.'
    });
  }
});

// ============================================================
// AUTHENTICATION: SESSION & CLAIMS REFRESH
// ============================================================
authRoutes.post('/auth/refresh-session', verifyToken, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.uid;
    const email = ((req as any).user.email || '').toLowerCase();
    const db = getAdminDb();
    const auth = getAuth();

    // 1. Fetch authoritative profile from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    const userData = userDoc.data() || {};
    const companyId = userData.companyId || 'UNKNOWN';
    const role = userData.role || 'EMPLOYEE';

    // 2. Fetch membership details for tenant-level claims
    let mData: any = {};
    if (companyId !== 'GLOBAL_ADMIN' && companyId !== 'UNKNOWN') {
      const memDoc = await db.collection('users').doc(uid).collection('memberships').doc(companyId).get();
      if (memDoc.exists) {
        mData = memDoc.data() || {};
      }
    }

    // 3. Construct new claims
    const newClaims: any = {
      role: mData.role || role,
      cId: companyId,
      companyId: companyId,
      status: userData.accountStatus || 'ACTIVE',
      pV: 2 // Protocol Version
    };

    if (role === 'SUPER_ADMIN' || companyId === 'GLOBAL_ADMIN') {
      newClaims.role = 'SUPER_ADMIN';
      newClaims.isPlatformAdmin = true;
      newClaims.aLvl = 'SUPER_ADMIN';
    } else if (newClaims.role === 'COMPANY_ADMIN') {
      newClaims.aLvl = 'A0_OWNER';
    }

    // 4. Update Firebase Auth Custom Claims
    try {
      await auth.setCustomUserClaims(uid, newClaims);
    } catch (claimErr: any) {
      console.warn('[Auth API] Failed to set custom claims in refresh-session (likely API restricted):', claimErr.message);
      // We continue so the client still gets the latest data from DB to update local state
    }

    // 5. Log the sync event
    await PlatformAuthService.logAudit({
      actorUid: uid,
      actorEmail: email,
      actorRole: role,
      action: 'SESSION_REFRESH',
      targetCompanyId: companyId,
      success: true,
      requestId: (req as any).id
    });

    return res.json({ 
      success: true, 
      claims: newClaims,
      message: 'Session claims synchronized with authoritative directory.'
    });
  } catch (error: any) {
    console.error('[Auth API] Refresh session error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal error during session refresh.'
    });
  }
});

// ============================================================
// GLOBAL SUPER ADMIN: CLAIMS & PROFILE SYNCHRONIZATION
// ============================================================
authRoutes.post('/admin/sync-super-admin', verifyToken, async (req: Request, res: Response) => {
  try {
    const callerUid = (req as any).user.uid;
    const callerEmail = ((req as any).user.email || '').toLowerCase();
    const isEmailVerified = (req as any).user.email_verified === true;
    const isSuperAdminEmail = callerEmail === 'ghadgea15@gmail.com' && isEmailVerified;
    let isSuperAdminUser = isSuperAdminEmail;

    try {
      const db = getAdminDb();
      const userDoc = await db.collection('users').doc(callerUid).get();
      const userData = userDoc.data();
      const saDoc = await db.collection('super_admins').doc(callerUid).get();
      if ((userDoc.exists && userData?.role === 'SUPER_ADMIN') || saDoc.exists) {
        isSuperAdminUser = true;
      }
    } catch (dbErr) {
      console.warn('[Admin API] DB check fallback in sync-super-admin:', dbErr);
      if (isSuperAdminEmail) isSuperAdminUser = true;
    }

    if (!isSuperAdminUser) {
      await PlatformAuthService.logAudit({
        actorUid: callerUid,
        actorEmail: callerEmail,
        actorRole: 'UNKNOWN',
        action: 'SUPER_ADMIN_SYNC',
        success: false,
        errorMessage: 'Unauthorized: Attempted to sync super admin without platform administrator authorization.',
        requestId: (req as any).id
      });
      return res.status(403).json({ success: false, error: 'Unauthorized: Super Admin record not found in platform directory.' });
    }

    // Set custom claims on the user
    try {
      await getAuth().setCustomUserClaims(callerUid, {
        role: 'SUPER_ADMIN',
        platformRole: 'SUPER_ADMIN',
        isPlatformAdmin: true,
        aLvl: 'SUPER_ADMIN',
        cId: 'GLOBAL_ADMIN',
        status: 'ACTIVE',
        pV: 1
      });
    } catch (claimErr) {
      console.warn('[Admin API] Set custom claims warning:', claimErr);
    }

    const timestamp = new Date().toISOString();
    try {
      const db = getAdminDb();
      await db.collection('super_admins').doc(callerUid).set({
        id: callerUid,
        email: callerEmail,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        updatedAt: timestamp
      }, { merge: true });

      await db.collection('users').doc(callerUid).set({
        uid: callerUid,
        email: callerEmail,
        role: 'SUPER_ADMIN',
        companyId: 'GLOBAL_ADMIN',
        accountStatus: 'ACTIVE',
        companyAdminApproval: 'APPROVED',
        hrApproval: 'APPROVED',
        updatedAt: timestamp
      }, { merge: true });
    } catch (dbWriteErr) {
      console.warn('[Admin API] sync-super-admin DB profile write warning:', dbWriteErr);
    }

    await PlatformAuthService.logAudit({
      actorUid: callerUid,
      actorEmail: callerEmail,
      actorRole: 'SUPER_ADMIN',
      action: 'SUPER_ADMIN_SYNC',
      success: true,
      requestId: (req as any).id,
      metadata: { details: 'Super admin claims synchronized via bootstrapping endpoint' }
    });

    return res.json({ success: true, message: 'Super admin claims synchronized.' });
  } catch (error: any) {
    console.error('[Admin API] Sync super admin error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to sync super admin.' });
  }
});

// ============================================================
// GLOBAL SUPER ADMIN: DELETE COMPANY TENANT & LINKED DATA
// ============================================================
authRoutes.delete('/admin/companies/:companyId', verifySuperAdminMiddleware, async (req: Request, res: Response) => {
  const callerUid = (req as any).user.uid;
  const callerEmail = ((req as any).user.email || '').toLowerCase();
  const rawCompanyId = req.params.companyId;
  const targetCompanyId = Array.isArray(rawCompanyId) ? rawCompanyId[0] : rawCompanyId;

  try {
    const db = getAdminDb();

    if (!targetCompanyId || targetCompanyId === 'GLOBAL_ADMIN') {
      return res.status(400).json({ success: false, error: 'Invalid or restricted company ID.' });
    }

    // Authorization check
    const hasPermission = await PlatformAuthService.validatePermission(callerUid, 'COMPANY_PERMANENT_DELETE');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Permission denied: COMPANY_PERMANENT_DELETE' });
    }

    // 2. Fetch company document
    console.log(`[Admin API] Attempting to fetch company: ${targetCompanyId}`);
    const companyRef = db.collection('companies').doc(targetCompanyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      console.warn(`[Admin API] Company ${targetCompanyId} not found.`);
      return res.status(404).json({ success: false, error: 'Company not found or already deleted.' });
    }

    const companyData = companySnap.data() || {};
    const companyCode = companyData.companyCode || targetCompanyId;
    const adminUid = companyData.adminUid;

    // 3. Clean up linked users in Firebase Auth & Firestore users collection
    console.log(`[Admin API] Querying users and codes for company: ${targetCompanyId}`);
    
    // Clean up company_codes lookup
    const codeQuery = await db.collection('company_codes').where('companyId', '==', targetCompanyId).get();
    for (const codeDoc of codeQuery.docs) {
      await codeDoc.ref.delete();
      console.log(`[Admin API] Deleted company_code lookup: ${codeDoc.id}`);
    }

    const usersSnapshot = await db.collection('users').where('companyId', '==', targetCompanyId).get();
    console.log(`[Admin API] Found ${usersSnapshot.size} linked users to delete.`);
    
    const auth = getAuth();
    for (const userDocSnap of usersSnapshot.docs) {
      const uId = userDocSnap.id;
      const uData = userDocSnap.data();
      if (uData.role === 'SUPER_ADMIN') {
        console.log(`[Admin API] Skipping SUPER_ADMIN user: ${uId}`);
        continue;
      }

      try {
        await auth.deleteUser(uId);
        console.log(`[Admin API] Deleted Auth user: ${uId}`);
      } catch (authErr) {
        console.warn(`[Admin API] Could not delete auth user ${uId}:`, authErr);
      }
      await userDocSnap.ref.delete();
      console.log(`[Admin API] Deleted Firestore user doc: ${uId}`);
    }

    if (adminUid && adminUid !== callerUid) {
      try {
        await auth.deleteUser(adminUid);
        console.log(`[Admin API] Deleted Company Admin Auth user: ${adminUid}`);
      } catch (e) {
        console.warn(`[Admin API] Could not delete company admin auth user ${adminUid}:`, e);
      }
    }

    // 4. Delete company document
    console.log(`[Admin API] Deleting company document: ${targetCompanyId}`);
    await companyRef.delete();

    // 5. Record audit entry (Centralized)
    await PlatformAuthService.logAudit({
      actorUid: callerUid,
      actorEmail: callerEmail,
      actorRole: 'SUPER_ADMIN',
      action: 'COMPANY_PERMANENT_DELETE',
      targetCompanyId,
      targetResourceId: targetCompanyId,
      success: true,
      requestId: (req as any).id
    });

    return res.json({ success: true, message: `Company ${companyCode} successfully deleted.` });
  } catch (error: any) {
    console.error('[Admin API] Delete company error:', error);
    
    // Log platform audit failure
    await PlatformAuthService.logAudit({
      actorUid: callerUid || 'UNKNOWN',
      actorEmail: callerEmail || 'UNKNOWN',
      actorRole: 'SUPER_ADMIN',
      action: 'COMPANY_PERMANENT_DELETE',
      targetCompanyId,
      success: false,
      errorMessage: error?.message || 'Server error during company deletion',
      requestId: (req as any).id
    });

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to delete company.'
    });
  }
});

// ============================================================
// ATTENDANCE SERVER-AUTHORITATIVE GEOFENCE PUNCH ENDPOINT
// ============================================================
import { AttendanceAdminService } from './attendanceAdminService';
authRoutes.post('/attendance/punch', AttendanceAdminService.handlePunch);



