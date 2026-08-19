with open('src/components/screens/dashboards/DirectorDashboard.tsx', 'r') as f:
    content = f.read()
content = content.replace("import { Users, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';", "import { Users, AlertTriangle, CheckCircle, TrendingUp, ShieldCheck } from 'lucide-react';")
with open('src/components/screens/dashboards/DirectorDashboard.tsx', 'w') as f:
    f.write(content)

with open('src/components/screens/dashboards/GeneralManagerDashboard.tsx', 'r') as f:
    content = f.read()
content = content.replace("import { Users, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';", "import { Users, AlertTriangle, CheckCircle, TrendingUp, ShieldCheck } from 'lucide-react';")
with open('src/components/screens/dashboards/GeneralManagerDashboard.tsx', 'w') as f:
    f.write(content)

with open('src/services/securityAuditService.ts', 'r') as f:
    content = f.read()
content = content.replace("await this.logEvent(\n        session,", "await this.logEvent(\n        session.companyId,\n        session.userId,\n        session.role,\n        session.employeeId,")
with open('src/services/securityAuditService.ts', 'w') as f:
    f.write(content)

with open('src/services/firebaseAuthService.ts', 'r') as f:
    content = f.read()
if "import { SecurityAuditService } from './securityAuditService';" not in content:
    content = content.replace("import { FirestoreService } from './firestoreService';", "import { FirestoreService } from './firestoreService';\nimport { SecurityAuditService } from './securityAuditService';")
content = content.replace(".catch(e => console", ".catch((e: any) => console")
with open('src/services/firebaseAuthService.ts', 'w') as f:
    f.write(content)

with open('src/services/bpmDelegationService.ts', 'r') as f:
    content = f.read()
if "import { SecurityAuditService } from './securityAuditService';" not in content:
    content = content.replace("import { getDocs, query, collection, where, doc, setDoc } from 'firebase/firestore';", "import { getDocs, query, collection, where, doc, setDoc } from 'firebase/firestore';\nimport { SecurityAuditService } from './securityAuditService';")
with open('src/services/bpmDelegationService.ts', 'w') as f:
    f.write(content)

