const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
`          batch.set(userRef, {
            companyId: companyCode,
            companyName: brandName,
            role: 'COMPANY_ADMIN',
            accountStatus: 'ACTIVE',
            companyAdminApproval: 'APPROVED',
            hrApproval: 'APPROVED',
            updatedAt: timestamp
          }, { merge: true });`,
`          batch.set(userRef, {
            companyId: companyCode,
            companyName: brandName,
            role: 'COMPANY_ADMIN',
            accountStatus: 'ACTIVE',
            companyAdminApproval: 'APPROVED',
            hrApproval: 'APPROVED',
            provisioningSource: 'SUPER_ADMIN',
            updatedAt: timestamp
          }, { merge: true });`
);

fs.writeFileSync(file, code);
