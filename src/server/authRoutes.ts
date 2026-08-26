import { Router, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './firebaseAdmin';
import { TotpService } from '../services/totpService';

export const authRoutes = Router();

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
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
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
    const db = getAdminDb();
    
    const userDoc = await db.collection('users').doc(uid).get();
    const isSuperAdmin = userDoc.exists && userDoc.data()?.role === 'SUPER_ADMIN';
    const saDoc = await db.collection('super_admins').doc(uid).get();
    if (!isSuperAdmin && !saDoc.exists) {
      return res.status(403).json({ error: 'Only Super Admins can enroll in this 2FA system.' });
    }

    const email = (req as any).user.email || 'superadmin';

    const mfaSetupData = await TotpService.createMfaSetup({ accountName: email });

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
    return res.status(500).json({ error: 'Failed to generate 2FA setup' });
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
      return res.status(400).json({ error: 'No pending 2FA setup found.' });
    }

    const { pendingTotpSecret, pendingBackupCodes } = docSnap.data()!;

    const verifyResult = await TotpService.verifyCode(token, pendingTotpSecret);
    if (!verifyResult.isValid) {
      recordFailedAttempt(uid);
      return res.status(400).json({ error: verifyResult.error || 'Invalid code.' });
    }

    resetAttempts(uid);

    await db.collection('totp_secrets').doc(uid).set({
      totpSecret: pendingTotpSecret,
      backupCodes: pendingBackupCodes,
      pendingTotpSecret: null,
      pendingBackupCodes: null,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await db.collection('users').doc(uid).set({
      mfaEnabled: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const currentClaims = (req as any).user;
    await getAuth().setCustomUserClaims(uid, {
      ...currentClaims,
      role: 'SUPER_ADMIN',
      totp_verified: true,
      totp_session_exp: Date.now() + 1000 * 60 * 60 * 8 // 8 hours
    });

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

    const { totpSecret, backupCodes } = docSnap.data()!;

    let isValid = false;
    let isBackupCode = false;

    const verifyResult = await TotpService.verifyCode(token, totpSecret);
    if (verifyResult.isValid) {
      isValid = true;
    } else if (backupCodes && backupCodes.includes(token)) {
      isValid = true;
      isBackupCode = true;
    }

    if (!isValid) {
      recordFailedAttempt(uid);
      return res.status(400).json({ error: 'Invalid code.' });
    }

    resetAttempts(uid);

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (isBackupCode) {
      updatePayload.backupCodes = backupCodes.filter((c: string) => c !== token);
    }
    await db.collection('totp_secrets').doc(uid).set(updatePayload, { merge: true });

    const currentClaims = (req as any).user;
    await getAuth().setCustomUserClaims(uid, {
      ...currentClaims,
      role: 'SUPER_ADMIN',
      totp_verified: true,
      totp_session_exp: Date.now() + 1000 * 60 * 60 * 8 // 8 hours
    });

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

    await db.collection('totp_secrets').doc(uid).delete();
    await db.collection('users').doc(uid).set({
      mfaEnabled: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const currentClaims = (req as any).user;
    const newClaims = { ...currentClaims };
    delete (newClaims as any).totp_verified;
    delete (newClaims as any).totp_session_exp;
    await getAuth().setCustomUserClaims(uid, newClaims);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Disable 2FA error:', error);
    return res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

