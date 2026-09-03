const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const replacement = `
    const { reloadUserAndCheckStatus } = FirebaseAuthService;
    const sessionRes = await reloadUserAndCheckStatus(fbUser.uid);
    if (sessionRes.userData) {
      const uData = sessionRes.userData;
      const session: UserSession = {
        userId: fbUser.uid,
        uid: fbUser.uid,
        employeeId: uData.employeeId || '',
        fullName: uData.fullName || fbUser.displayName || 'SSO User',
        email: cleanEmail,
        role: uData.role as any,
        authority: uData.authorityLevel || 'A8_WORKER',
        companyId: uData.companyId || companyId,
        branchId: uData.branchId || 'HQ',
        token: await fbUser.getIdToken(true),
        mfaEnabled: !!uData.mfaEnabled,
        departmentId: uData.departmentId || '',
        departmentName: uData.departmentName || '',
        companyAdminApproval: uData.companyAdminApproval || 'PENDING',
        hrApproval: uData.hrApproval || 'PENDING'
      };

      return {
        fbUser,
        userSession: session,
        isNewUser: false,
        accountStatus: sessionRes.accountStatus
      };
    }

    return { fbUser, isNewUser: true, accountStatus: 'PENDING' };
`;

file = file.replace(/const { reloadUserAndCheckStatus } = FirebaseAuthService;[\s\S]*?return { fbUser, isNewUser: true, accountStatus: 'PENDING' };/, replacement.trim());
fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log('Patched SSO session return');
