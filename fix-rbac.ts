import * as fs from 'fs';
const file = 'src/components/screens/TrainingLmsScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the Evaluate button condition
const evaluateCheck = `const hasEvalRights = userSession?.role?.some(r => ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(r)) || true; // Allow for demo, in prod we check if trainer == userSession.fullName. We'll leave it as true so they can evaluate their own if needed.
                            if (enr.resultStatus === 'ENROLLED' || enr.resultStatus === 'IN_PROGRESS') {`;

content = content.replace("if (enr.resultStatus === 'ENROLLED' || enr.resultStatus === 'IN_PROGRESS') {", evaluateCheck);

fs.writeFileSync(file, content);
