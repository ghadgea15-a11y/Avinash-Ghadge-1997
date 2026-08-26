const fs = require('fs');
const file = 'src/services/firebaseAuthService.ts';
let code = fs.readFileSync(file, 'utf8');

// Patch signUpWithEmailPassword
code = code.replace(
`      hrApproval: (isCompanyAdmin || autoApprove) ? 'APPROVED' : 'PENDING' as ApprovalStatus,
      createdAt: timestamp,
      updatedAt: timestamp
    };`,
`      hrApproval: (isCompanyAdmin || autoApprove) ? 'APPROVED' : 'PENDING' as ApprovalStatus,
      provisioningSource: (isCompanyAdmin || autoApprove) ? 'COMPANY_ADMIN' : 'SELF_SIGNUP',
      createdAt: timestamp,
      updatedAt: timestamp
    };`
);

const googleCompleteStart = `  static async completeGoogleRegistration(params: {
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
    const companyId = companyTenant.companyId;`;

const newGoogleCompleteLogic = `${googleCompleteStart}

    const isCompanyAdmin = companyTenant.adminEmail && companyTenant.adminEmail.toLowerCase() === cleanEmail;
    let existingEmpId: string | null = null;
    let autoApprove = false;
    let employeeRole = isCompanyAdmin ? 'COMPANY_ADMIN' : 'EMPLOYEE';

    try {
      const empQuery = query(collection(db, 'companies', companyId, 'employees'), where('email', '==', cleanEmail));
      const empSnap = await getDocs(empQuery);
      if (!empSnap.empty) {
        const emp = empSnap.docs[0].data();
        existingEmpId = emp.id;
        autoApprove = true;
        if (emp.role) employeeRole = emp.role;
        
        await setDoc(doc(db, 'companies', companyId, 'employees', emp.id), {
          authUid: fbUser.uid,
          hasSystemAccess: true,
          updatedAt: timestamp
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Error looking up existing employee by email:', e);
    }

    const assignedRole = isCompanyAdmin ? 'COMPANY_ADMIN' : (autoApprove ? employeeRole : 'EMPLOYEE');
    const assignedStatus = (isCompanyAdmin || autoApprove) ? 'ACTIVE' : 'PENDING_APPROVAL';

    const userDocData = {
      uid: fbUser.uid,
      email: cleanEmail,
      fullName: cleanName,
      companyId,
      companyName: companyTenant.brandName,
      departmentId,
      departmentName,
      mobileNumber: mobileNumber || '',
      role: assignedRole as UserRole,
      accountStatus: assignedStatus as AccountStatus,
      emailVerified: true,
      companyAdminApproval: (isCompanyAdmin || autoApprove) ? 'APPROVED' : 'PENDING' as ApprovalStatus,
      hrApproval: (isCompanyAdmin || autoApprove) ? 'APPROVED' : 'PENDING' as ApprovalStatus,
      provisioningSource: (isCompanyAdmin || autoApprove) ? 'COMPANY_ADMIN' : 'SELF_SIGNUP',
      createdAt: timestamp,
      updatedAt: timestamp
    };`;

code = code.replace(
`    const companyId = companyTenant.companyId;

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
    };`,
    newGoogleCompleteLogic.replace(googleCompleteStart, '    const companyId = companyTenant.companyId;')
);

const googleCompleteReqStart = `    // Create approval request
    const approvalReq: ApprovalRequestRecord = {
      id: \`REQ-\${fbUser.uid}\`,
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

    await FirestoreService.saveApprovalRequest(approvalReq);`;

const newGoogleCompleteReq = `
    const finalEmployeeId = existingEmpId || \`EMP-\${fbUser.uid.substring(0, 6).toUpperCase()}\`;

    if (!autoApprove && !isCompanyAdmin) {
      // Create approval request
      const approvalReq: ApprovalRequestRecord = {
        id: \`REQ-\${fbUser.uid}\`,
        uid: fbUser.uid,
        employeeId: finalEmployeeId,
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
        provisioningSource: 'SELF_SIGNUP',
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await FirestoreService.saveApprovalRequest(approvalReq);
    }`;

code = code.replace(googleCompleteReqStart, newGoogleCompleteReq);

// Also patch signUpWithEmailPassword approvalReq provisioningSource
code = code.replace(
`        companyAdminApproval: 'PENDING',
        hrApproval: 'PENDING',
        accountStatus: 'PENDING_APPROVAL',
        createdAt: timestamp,
        updatedAt: timestamp
      };`,
`        companyAdminApproval: 'PENDING',
        hrApproval: 'PENDING',
        accountStatus: 'PENDING_APPROVAL',
        provisioningSource: 'SELF_SIGNUP',
        createdAt: timestamp,
        updatedAt: timestamp
      };`
);

// We must also update membership in completeGoogleRegistration
code = code.replace(
`    // Store membership
    await setDoc(doc(db, 'users', fbUser.uid, 'memberships', companyId), {
      userId: fbUser.uid,
      email: cleanEmail,
      fullName: cleanName,
      role: 'EMPLOYEE',
      companyId,
      status: 'PENDING',
      updatedAt: timestamp
    }, { merge: true });`,
`    // Store membership
    await setDoc(doc(db, 'users', fbUser.uid, 'memberships', companyId), {
      userId: fbUser.uid,
      email: cleanEmail,
      fullName: cleanName,
      role: assignedRole,
      companyId,
      status: (isCompanyAdmin || autoApprove) ? 'ACTIVE' : 'PENDING',
      employeeId: existingEmpId || undefined,
      updatedAt: timestamp
    }, { merge: true });`
);


// Final userSession return in completeGoogleRegistration
code = code.replace(
`    const session: UserSession = {
      userId: fbUser.uid,
      employeeId: \`EMP-\${fbUser.uid.substring(0, 6).toUpperCase()}\`,
      fullName: cleanName,
      email: cleanEmail,
      role: 'EMPLOYEE',
      companyId,
      branchId: 'MAIN',
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

    return { userSession: session, accountStatus: 'PENDING_APPROVAL' };`,
`    const session: UserSession = {
      userId: fbUser.uid,
      employeeId: finalEmployeeId,
      fullName: cleanName,
      email: cleanEmail,
      role: assignedRole as UserRole,
      companyId,
      branchId: 'MAIN',
      token: await fbUser.getIdToken(),
      tokenExpiresAt: Date.now() + (12 * 60 * 60 * 1000),
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'GOOGLE',
      accountStatus: assignedStatus as AccountStatus,
      emailVerified: true,
      departmentId,
      departmentName,
      companyAdminApproval: (isCompanyAdmin || autoApprove) ? 'APPROVED' : 'PENDING',
      hrApproval: (isCompanyAdmin || autoApprove) ? 'APPROVED' : 'PENDING',
      provisioningSource: (isCompanyAdmin || autoApprove) ? 'COMPANY_ADMIN' : 'SELF_SIGNUP'
    };

    return { userSession: session, accountStatus: assignedStatus as AccountStatus };`
);

fs.writeFileSync(file, code);
