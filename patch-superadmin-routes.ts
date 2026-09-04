import fs from 'fs';

const filePath = 'src/server/authRoutes.ts';
let code = fs.readFileSync(filePath, 'utf8');

const createSuperAdminRoute = `
authRoutes.post('/admin/create-super-admin', verifySuperAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const callerUid = (req as any).user.uid;
    const { email, name, role, mfaEnabled } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getAdminDb();
    
    // Check if user already exists
    let userRecord: any;
    try {
      userRecord = await getAuth().getUserByEmail(cleanEmail);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await getAuth().createUser({
          email: cleanEmail,
          displayName: name || cleanEmail.split('@')[0],
          emailVerified: true
        });
        
        // Trigger password reset for them to set a password
        await triggerFirebaseActionEmail(cleanEmail, 'PASSWORD_RESET');
      } else {
        throw e;
      }
    }

    const adminUid = userRecord.uid;
    const timestamp = new Date().toISOString();

    // Set Custom User Claims for Super Admin
    await getAuth().setCustomUserClaims(adminUid, {
      role: 'SUPER_ADMIN',
      platformRole: role || 'SUPER_ADMIN',
      isPlatformAdmin: true,
      aLvl: 'SUPER_ADMIN',
      status: 'ACTIVE'
    });

    const record = {
      uid: adminUid,
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      role: role || 'SUPER_ADMIN',
      status: 'ACTIVE',
      mfaEnabled: mfaEnabled ?? true,
      createdBy: callerUid,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const batch = db.batch();
    batch.set(db.collection('super_admins').doc(adminUid), record, { merge: true });
    batch.set(db.collection('users').doc(adminUid), {
      uid: adminUid,
      email: cleanEmail,
      fullName: record.name,
      role: 'SUPER_ADMIN',
      companyId: 'GLOBAL_ADMIN',
      companyCode: 'GLOBAL_ADMIN',
      authorityLevel: 'SUPER_ADMIN',
      status: 'ACTIVE',
      accountStatus: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });
    
    await batch.commit();

    await PlatformAuthService.logAudit({
      actorUid: callerUid,
      actorEmail: (req as any).user.email,
      actorRole: 'SUPER_ADMIN',
      action: 'ADD_SUPER_ADMIN',
      targetResourceId: adminUid,
      targetCompanyId: 'GLOBAL_ADMIN',
      success: true,
      details: 'Provisioned new super admin: ' + cleanEmail
    });

    return res.status(200).json({ success: true, uid: adminUid, message: 'Super admin created successfully.' });
  } catch (err: any) {
    console.error('Error creating super admin:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

authRoutes.post('/admin/remove-super-admin', verifySuperAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const callerUid = (req as any).user.uid;
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ success: false, error: 'UID is required.' });
    }

    const db = getAdminDb();
    const batch = db.batch();
    
    batch.delete(db.collection('super_admins').doc(uid));
    batch.update(db.collection('users').doc(uid), {
      status: 'SUSPENDED',
      accountStatus: 'SUSPENDED',
      role: 'USER', // Downgrade
      updatedAt: new Date().toISOString()
    });

    await batch.commit();
    
    // Remove custom claims
    await getAuth().setCustomUserClaims(uid, {
      role: 'USER',
      status: 'SUSPENDED'
    });
    
    // Revoke sessions
    await getAuth().revokeRefreshTokens(uid);

    await PlatformAuthService.logAudit({
      actorUid: callerUid,
      actorEmail: (req as any).user.email,
      actorRole: 'SUPER_ADMIN',
      action: 'REMOVE_SUPER_ADMIN',
      targetResourceId: uid,
      targetCompanyId: 'GLOBAL_ADMIN',
      success: true,
      details: 'Revoked super admin access for UID: ' + uid
    });

    return res.status(200).json({ success: true, message: 'Super admin revoked successfully.' });
  } catch (err: any) {
    console.error('Error removing super admin:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
`;

if (!code.includes('/admin/create-super-admin')) {
  // Find a good place to insert, like before authRoutes.post('/admin/resend-admin-activation'
  const target = "authRoutes.post('/admin/resend-admin-activation'";
  if (code.includes(target)) {
    code = code.replace(target, createSuperAdminRoute + '\n' + target);
    fs.writeFileSync(filePath, code);
    console.log("Patched successfully!");
  } else {
    code += "\n" + createSuperAdminRoute;
    fs.writeFileSync(filePath, code);
    console.log("Appended to end.");
  }
} else {
  console.log("Already patched.");
}
