const fs = require('fs');
let code = fs.readFileSync('src/server/authRoutes.ts', 'utf8');

const newEndpoint = `
// UPDATE EMPLOYEE STATUS & DISABLE/ENABLE AUTH
authRoutes.post('/admin/update-employee-status', verifyToken, async (req: Request, res: Response) => {
  try {
    const { companyId, employeeId, status } = req.body;
    const db = getAdminDb();
    const callerClaims = (req as any).user;

    if (callerClaims.cId !== companyId && callerClaims.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Company mismatch" });
    }

    const empRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
    const empSnap = await empRef.get();
    if (!empSnap.exists) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const empData = empSnap.data();

    // 1. Update Employee record
    await empRef.update({ 
      status, 
      updatedAt: new Date().toISOString(),
      updatedBy: callerClaims.uid || 'SYSTEM'
    });

    // 2. If employee has an auth account (authUid), update it
    let authUpdated = false;
    if (empData.authUid) {
      if (status === 'SUSPENDED' || status === 'TERMINATED' || status === 'DEACTIVATED') {
        await getAuth().updateUser(empData.authUid, { disabled: true });
        
        // Update root user record to ensure Firestore rules block read/write immediately
        const userRef = db.collection('users').doc(empData.authUid);
        await userRef.set({ accountStatus: status }, { merge: true });
        
      } else if (status === 'ACTIVE') {
        await getAuth().updateUser(empData.authUid, { disabled: false });
        
        // Reactivate in root user record
        const userRef = db.collection('users').doc(empData.authUid);
        await userRef.set({ accountStatus: 'ACTIVE' }, { merge: true });
      }
      authUpdated = true;
    }

    return res.json({ success: true, authUpdated });
  } catch (err: any) {
    console.error('[Auth API] Error updating employee status:', err);
    return res.status(500).json({ error: err.message });
  }
});
`;

code = code.replace("authRoutes.post('/admin/setup-employee',", newEndpoint + "\nauthRoutes.post('/admin/setup-employee',");
fs.writeFileSync('src/server/authRoutes.ts', code);
console.log('patched authRoutes');
