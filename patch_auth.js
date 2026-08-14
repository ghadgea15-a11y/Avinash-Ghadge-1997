const fs = require('fs');
const file = 'src/services/firebaseAuthService.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  `      if (err instanceof Error) {
        if (err.message.includes('inactive or expired') || err.message.includes('suspended')) {
          throw new Error('Company Code is inactive or expired');
        }
      }
      console.error('[FirebaseAuthService] Firestore company lookup error:', err);
    }

    throw new Error('Invalid Company Code');`,
  `      if (err instanceof Error) {
        if (err.message.includes('inactive or expired') || err.message.includes('suspended')) {
          throw new Error('Company Code is inactive or expired');
        }
        if (err.message.toLowerCase().includes('offline') || err.message === 'timeout') {
          console.warn('[FirebaseAuthService] Client is offline. Cannot verify company code.');
          throw new Error('Network offline: Unable to verify company code. Please check your connection.');
        }
      }
      console.error('[FirebaseAuthService] Firestore company lookup error:', err);
    }

    throw new Error('Invalid Company Code');`
);
fs.writeFileSync(file, code);
