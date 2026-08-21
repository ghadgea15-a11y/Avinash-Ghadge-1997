const fs = require('fs');
const file = 'src/services/talentAcquisitionService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import { v4 as uuidv4 } from 'uuid';",
  ""
);

code = code.replace(
  "const verificationId = uuidv4();",
  "const verificationId = `BGV-${Date.now()}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;"
);

code = code.replace(
  "await AuditTrailService.logEvent(session, {\n        action: 'UPDATE',\n        module: 'TALENT',\n        targetId: candidateId,\n        description: `Aadhaar verification consent recorded and workflow initiated for ${candidateData.fullName}`,\n        previousState: null,\n        newState: { consent: 'GRANTED', verificationId }\n      });",
  `await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'UPDATE',
        'CANDIDATE_RECORD',
        candidateId,
        true,
        'MEDIUM',
        \`Aadhaar verification consent recorded and workflow initiated for \${candidateData.fullName}\`,
        { consent: 'GRANTED', verificationId }
      );`
);

fs.writeFileSync(file, code);
