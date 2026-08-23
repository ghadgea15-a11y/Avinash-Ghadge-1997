const fs = require('fs');
const file = 'src/components/screens/ProfileScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// Also need to import setDoc if not already there
if (!code.includes('setDoc')) {
  code = code.replace(/import { doc, getDoc, updateDoc } from 'firebase\/firestore';/, "import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';");
}

const target1 = `      // Persist to user document
      const userDocRef = doc(db, 'users', userSession.userId);
      await updateDoc(userDocRef, {
        mfaEnabled: true,
        totpSecret: mfaSetupData.secret,
        backupCodes: mfaSetupData.backupCodes,
        mfaConfiguredAt: new Date().toISOString()
      });`;
      
const replacement1 = `      // Persist to user document and private subcollection
      const userDocRef = doc(db, 'users', userSession.userId);
      await updateDoc(userDocRef, {
        mfaEnabled: true,
        mfaConfiguredAt: new Date().toISOString()
      });
      const privateMfaRef = doc(db, 'users', userSession.userId, 'private', 'mfa');
      await setDoc(privateMfaRef, {
        totpSecret: mfaSetupData.secret,
        backupCodes: mfaSetupData.backupCodes,
        updatedAt: new Date().toISOString()
      }, { merge: true });`;

const target2 = `    try {
      const userDocRef = doc(db, 'users', userSession.userId);
      await updateDoc(userDocRef, {
        mfaEnabled: false,
        totpSecret: null,
        backupCodes: []
      });`;
      
const replacement2 = `    try {
      const userDocRef = doc(db, 'users', userSession.userId);
      await updateDoc(userDocRef, {
        mfaEnabled: false
      });
      const privateMfaRef = doc(db, 'users', userSession.userId, 'private', 'mfa');
      await setDoc(privateMfaRef, {
        totpSecret: null,
        backupCodes: [],
        updatedAt: new Date().toISOString()
      }, { merge: true });`;

code = code.replace(target1, replacement1).replace(target2, replacement2);
fs.writeFileSync(file, code);
console.log('Patched ProfileScreen');
