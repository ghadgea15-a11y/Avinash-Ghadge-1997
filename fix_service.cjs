const fs = require('fs');
const file = 'src/services/talentAcquisitionService.ts';
let code = fs.readFileSync(file, 'utf8');

// Imports
code = code.replace(
  "import { collection, doc, getDoc, getDocs, query, where, updateDoc, runTransaction } from 'firebase/firestore';",
  "import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, runTransaction } from 'firebase/firestore';"
);

code = code.replace(
  "  BgVerificationResult\n} from '../types';",
  "  BgVerificationResult,\n  VerificationStatus\n} from '../types';"
);

code = code.replace(
  "import { AuditTrailService } from './auditTrailService';",
  "import { AuditTrailService } from './auditTrailService';\nimport { v4 as uuidv4 } from 'uuid';"
);

code = code.replace(
  "await AuditService.logEvent(session, {",
  "await AuditTrailService.logEvent(session, {"
);

fs.writeFileSync(file, code);
