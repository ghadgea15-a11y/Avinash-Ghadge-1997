const fs = require('fs');
const file = 'functions/src/inviteEmployee.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
`    accountStatus: 'ACTIVE',
    emailVerified: false,
    companyAdminApproval: 'APPROVED',
    hrApproval: 'APPROVED',
    createdAt: timestamp,
    updatedAt: timestamp`,
`    accountStatus: 'ACTIVE',
    emailVerified: false,
    companyAdminApproval: 'APPROVED',
    hrApproval: 'APPROVED',
    provisioningSource: 'COMPANY_ADMIN',
    createdAt: timestamp,
    updatedAt: timestamp`
);

fs.writeFileSync(file, code);
