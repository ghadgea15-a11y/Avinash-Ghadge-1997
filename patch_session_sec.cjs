const fs = require('fs');
let code = fs.readFileSync('src/services/sessionSecurityService.ts', 'utf8');

const replacement = `
          // Detect client-side company/tenant tampering
          const authoritativeCompany = uData.companyId;
          if (authoritativeCompany && authoritativeCompany !== 'PENDING' && session.companyId !== authoritativeCompany && session.role !== 'SUPER_ADMIN') {
            await SecurityAuditService.logEvent(
              session.companyId,
              session.userId,
              session.role,
              session.employeeId,
              'CROSS_COMPANY_ACCESS_DENIED',
              'SESSION_INTEGRITY',
              session.companyId,
              false,
              'CRITICAL',
              \`Session company tampering detected! Client claimed '\${session.companyId}', database holds '\${authoritativeCompany}'.\`
            ).catch(() => {});
            SessionManager.clearSession();
            return {
              valid: false,
              isStale: false,
              isIdleLocked: false,
              isTampered: true,
              reason: 'Cross-tenant session violation detected.'
            };
          }

          // Check if Company is Suspended
          if (authoritativeCompany && authoritativeCompany !== 'GLOBAL_ADMIN') {
             try {
                const compSnap = await getDoc(doc(db, 'companies', authoritativeCompany));
                if (compSnap.exists() && compSnap.data().status === 'SUSPENDED' && session.role !== 'SUPER_ADMIN') {
                   SessionManager.clearSession();
                   return {
                     valid: false,
                     isStale: true,
                     isIdleLocked: false,
                     isTampered: false,
                     reason: 'Your company account has been suspended. Please contact support.'
                   };
                }
             } catch(e) {
                // Ignore offline errors
             }
          }
`;

code = code.replace(
  "          // Detect client-side company/tenant tampering\n          const authoritativeCompany = uData.companyId;\n          if (authoritativeCompany && authoritativeCompany !== 'PENDING' && session.companyId !== authoritativeCompany && session.role !== 'SUPER_ADMIN') {\n            await SecurityAuditService.logEvent(\n              session.companyId,\n              session.userId,\n              session.role,\n              session.employeeId,\n              'CROSS_COMPANY_ACCESS_DENIED',\n              'SESSION_INTEGRITY',\n              session.companyId,\n              false,\n              'CRITICAL',\n              `Session company tampering detected! Client claimed '${session.companyId}', database holds '${authoritativeCompany}'.`\n            ).catch(() => {});\n            SessionManager.clearSession();\n            return {\n              valid: false,\n              isStale: false,\n              isIdleLocked: false,\n              isTampered: true,\n              reason: 'Cross-tenant session violation detected.'\n            };\n          }",
  replacement
);

fs.writeFileSync('src/services/sessionSecurityService.ts', code);
console.log('SessionSecurityService suspended company patched.');
