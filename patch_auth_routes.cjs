const fs = require('fs');

let content = fs.readFileSync('src/server/authRoutes.ts', 'utf8');

const setupRoute = `
// ============================================================
// ORG SETUP WIZARD: CREATE EMPLOYEE
// ============================================================
authRoutes.post('/admin/setup-employee', verifyToken, async (req: Request, res: Response) => {
  try {
    const { companyId, employeeData } = req.body;
    const db = getAdminDb();
    const callerClaims = (req as any).user;

    if (callerClaims.cId !== companyId && callerClaims.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Company mismatch" });
    }

    const { firstName, lastName, contactNumber, email, role, aLvl, assignedRegionId, assignedSiteId, departmentId, supervisorId, designation } = employeeData;

    const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit PIN
    const empId = \`EMP-\${Date.now()}-\${Math.floor(Math.random()*1000)}\`;
    const authEmail = email || \`\${empId}@\${companyId}.local\`.toLowerCase();

    const newUser = await getAuth().createUser({
      email: authEmail,
      password: \`Tmp!\${pin}\`,
      displayName: \`\${firstName} \${lastName}\`.trim(),
    });

    const claims: any = {
      cId: companyId,
      companyId: companyId,
      aLvl: aLvl,
      role: role,
      pV: Date.now()
    };
    if (assignedRegionId) claims.rId = assignedRegionId;
    if (assignedSiteId) claims.sId = assignedSiteId;
    if (departmentId) claims.dId = departmentId;

    await getAuth().setCustomUserClaims(newUser.uid, claims);

    const empRef = db.collection('companies').doc(companyId).collection('employees').doc(empId);
    await empRef.set({
      id: empId,
      employeeId: empId,
      authUid: newUser.uid,
      companyId,
      firstName,
      lastName,
      fullName: \`\${firstName} \${lastName}\`.trim(),
      email: authEmail,
      contactNumber,
      mobileNumber: contactNumber,
      pin, 
      role,
      designation,
      authorityLevel: aLvl,
      assignedRegionId: assignedRegionId || null,
      assignedSiteId: assignedSiteId || null,
      departmentId: departmentId || null,
      supervisorId: supervisorId || null,
      status: 'ACTIVE',
      lifecycleStatus: 'ACTIVE',
      hasSystemAccess: true,
      provisioningSource: 'WIZARD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.json({ success: true, empId, pin, authEmail, employeeName: \`\${firstName} \${lastName}\`.trim() });
  } catch (error: any) {
    console.error("Setup Employee Error:", error);
    res.status(500).json({ error: error.message });
  }
});

authRoutes.post('/admin/setup-employee-bulk', verifyToken, async (req: Request, res: Response) => {
  try {
    const { companyId, employees } = req.body;
    const db = getAdminDb();
    const callerClaims = (req as any).user;

    if (callerClaims.cId !== companyId && callerClaims.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Company mismatch" });
    }

    const results = [];
    for (const emp of employees) {
      try {
        const { firstName, lastName, contactNumber, role, aLvl, assignedRegionId, assignedSiteId, departmentId, supervisorId, designation } = emp;
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        const empId = \`EMP-\${Date.now()}-\${Math.floor(Math.random()*1000)}\`;
        const authEmail = \`\${empId}@\${companyId}.local\`.toLowerCase();

        const newUser = await getAuth().createUser({
          email: authEmail,
          password: \`Tmp!\${pin}\`,
          displayName: \`\${firstName} \${lastName}\`.trim(),
        });

        const claims: any = { cId: companyId, companyId, aLvl, role, pV: Date.now() };
        if (assignedRegionId) claims.rId = assignedRegionId;
        if (assignedSiteId) claims.sId = assignedSiteId;
        if (departmentId) claims.dId = departmentId;

        await getAuth().setCustomUserClaims(newUser.uid, claims);

        const empRef = db.collection('companies').doc(companyId).collection('employees').doc(empId);
        await empRef.set({
          id: empId,
          employeeId: empId,
          authUid: newUser.uid,
          companyId,
          firstName,
          lastName,
          fullName: \`\${firstName} \${lastName}\`.trim(),
          email: authEmail,
          contactNumber,
          mobileNumber: contactNumber,
          pin,
          role,
          designation,
          authorityLevel: aLvl,
          assignedRegionId: assignedRegionId || null,
          assignedSiteId: assignedSiteId || null,
          departmentId: departmentId || null,
          supervisorId: supervisorId || null,
          status: 'ACTIVE',
          lifecycleStatus: 'ACTIVE',
          hasSystemAccess: true,
          provisioningSource: 'WIZARD',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        results.push({ success: true, empId, pin, employeeName: \`\${firstName} \${lastName}\`.trim(), tempId: emp.tempId });
      } catch (e: any) {
        results.push({ success: false, error: e.message, tempId: emp.tempId });
      }
    }

    return res.json({ success: true, results });
  } catch (error: any) {
    console.error("Bulk Setup Employee Error:", error);
    res.status(500).json({ error: error.message });
  }
});
`;

if (!content.includes("/admin/setup-employee")) {
  content = content + "\n" + setupRoute;
  fs.writeFileSync('src/server/authRoutes.ts', content);
  console.log("Patched authRoutes.ts with Setup Wizard APIs");
} else {
  console.log("Setup Wizard APIs already present");
}
