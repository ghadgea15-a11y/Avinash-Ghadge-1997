const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SessionLockScreen.tsx', 'utf8');
code = code.replace("import { SessionManager } from '../../services/sessionManager';import { FirebaseAuthService } from '../../services/firebaseAuthService'; from '../../services/sessionManager';", "import { SessionManager } from '../../services/sessionManager';\nimport { FirebaseAuthService } from '../../services/firebaseAuthService';");
fs.writeFileSync('src/components/screens/SessionLockScreen.tsx', code);
