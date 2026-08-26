const fs = require('fs');
const file = 'src/services/firebaseAuthService.ts';
let code = fs.readFileSync(file, 'utf8');

// Patch signUpWithEmailPassword session
code = code.replace(
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
      loginMode: 'PASSWORD',
      accountStatus: 'PENDING_APPROVAL',
      emailVerified: fbUser.emailVerified,
      departmentId,
      departmentName,
      companyAdminApproval: 'PENDING',
      hrApproval: 'PENDING'
    };

    return { fbUser, userSession: session, accountStatus: 'PENDING_APPROVAL' };`,
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
      loginMode: 'PASSWORD',
      accountStatus: assignedStatus as AccountStatus,
      emailVerified: fbUser.emailVerified,
      departmentId,
      departmentName,
      companyAdminApproval: (isCompanyAdmin || autoApprove) ? 'APPROVED' : 'PENDING',
      hrApproval: (isCompanyAdmin || autoApprove) ? 'APPROVED' : 'PENDING',
      provisioningSource: (isCompanyAdmin || autoApprove) ? 'COMPANY_ADMIN' : 'SELF_SIGNUP'
    };

    return { fbUser, userSession: session, accountStatus: assignedStatus as AccountStatus };`
);

// Patch completeGoogleRegistration session
code = code.replace(
`    const session: UserSession = {
      userId: fbUser.uid,
      employeeId: finalEmployeeId,
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

    return { userSession: session, accountStatus: 'PENDING_APPROVAL' };`,
`    const session: UserSession = {
      userId: fbUser.uid,
      employeeId: finalEmployeeId,
      fullName: cleanName,
      email: cleanEmail,
      role: assignedRole as UserRole,
      companyId,
      branchId: 'MAIN',
      avatarUrl: fbUser.photoURL || undefined,
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
