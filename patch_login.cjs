const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

code = code.replace(
  "const [step, setStep] = useState<'COMPANY_CODE' | 'CREDENTIALS' | 'MFA'>('COMPANY_CODE');",
  "const [step, setStep] = useState<'COMPANY_CODE' | 'CREDENTIALS' | 'MFA' | 'MFA_ENROLL'>('COMPANY_CODE');\n  const [mfaSetupData, setMfaSetupData] = useState<any | null>(null);\n  const [enrollSession, setEnrollSession] = useState<any | null>(null);"
);

code = code.replace(
  "import { ShieldCheck, User, Building2, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';",
  "import { ShieldCheck, User, Building2, AlertCircle, ArrowRight, Loader2, Eye, EyeOff, QrCode } from 'lucide-react';\nimport { TotpService } from '../../services/totpService';\nimport { doc, setDoc } from 'firebase/firestore';\nimport { db } from '../../firebase';"
);

code = code.replace(
  "      if (err.message === 'MFA_REQUIRED') {",
  "      if (err.message === 'MFA_ENROLLMENT_REQUIRED') {\n        const setup = await TotpService.createMfaSetup({\n          accountName: emailOrId.trim(),\n          issuer: 'Log Sheet Muster'\n        });\n        setMfaSetupData(setup);\n        setEnrollSession(err.resolver.tempSession);\n        setStep('MFA_ENROLL');\n        setMfaError(null);\n        setMfaCode('');\n        return;\n      }\n      if (err.message === 'MFA_REQUIRED') {"
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
