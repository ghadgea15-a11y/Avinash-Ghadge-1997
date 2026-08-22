import * as fs from 'fs';

let content = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const target1 = `    // 4. Normal Company User Registration
    const companyId = companyTenant!.companyId;
    const userDocData = {`;

const replacement1 = `    // 4. Check if this is the provisioned Company Admin
    const isCompanyAdmin = companyTenant!.adminEmail && companyTenant!.adminEmail.toLowerCase() === cleanEmail;
    const assignedRole = isCompanyAdmin ? 'COMPANY_ADMIN' : 'EMPLOYEE';
    const assignedStatus = isCompanyAdmin ? 'ACTIVE' : 'PENDING_APPROVAL';
    
    // 5. Normal Company User Registration
    const companyId = companyTenant!.companyId || companyTenant!.id || cleanCode;
    const userDocData = {`;

content = content.replace(target1, replacement1);

const target2 = `      role: 'EMPLOYEE' as UserRole, // Safe default role
      accountStatus: 'PENDING_APPROVAL' as AccountStatus,
      emailVerified: fbUser.emailVerified,
      companyAdminApproval: 'PENDING' as ApprovalStatus,
      hrApproval: 'PENDING' as ApprovalStatus,`;

const replacement2 = `      role: assignedRole as UserRole,
      accountStatus: assignedStatus as AccountStatus,
      emailVerified: fbUser.emailVerified,
      companyAdminApproval: isCompanyAdmin ? 'APPROVED' : 'PENDING' as ApprovalStatus,
      hrApproval: isCompanyAdmin ? 'APPROVED' : 'PENDING' as ApprovalStatus,`;

content = content.replace(target2, replacement2);

const target3 = `      role: 'EMPLOYEE',
      companyId,
      status: 'PENDING',`;

const replacement3 = `      role: assignedRole,
      companyId,
      status: isCompanyAdmin ? 'ACTIVE' : 'PENDING',`;

content = content.replace(target3, replacement3);

const target4 = `      requestedRole: 'GUARD',
      status: 'PENDING',`;

const replacement4 = `      requestedRole: 'GUARD',
      status: isCompanyAdmin ? 'APPROVED' : 'PENDING',`;

content = content.replace(target4, replacement4);

const target5 = `      const session: UserSession = {
        userId: fbUser.uid,
        employeeId: \`\${cleanCode}-\${fbUser.uid.substring(0,4)}\`,
        fullName: cleanName,
        email: cleanEmail,
        role: 'EMPLOYEE',
        companyId,
        branchId: 'MAIN',
        token: await fbUser.getIdToken(),
        tokenExpiresAt: Date.now() + (12 * 60 * 60 * 1000),
        isBiometricEnabled: false,
        lastActiveAt: Date.now(),
        loginMode: 'PASSWORD',
        accountStatus: 'PENDING_APPROVAL',
        emailVerified: fbUser.emailVerified
      };`;

const replacement5 = `      const session: UserSession = {
        userId: fbUser.uid,
        employeeId: \`\${cleanCode}-\${fbUser.uid.substring(0,4)}\`,
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
        emailVerified: fbUser.emailVerified
      };`;

content = content.replace(target5, replacement5);

fs.writeFileSync('src/services/firebaseAuthService.ts', content, 'utf8');
