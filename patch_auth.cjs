const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const ssoCode = `
  static async signInWithSso(
    companyId: string,
    ssoConfig: any
  ): Promise<{ fbUser: FirebaseUser; userSession?: UserSession; isNewUser: boolean; accountStatus?: AccountStatus }> {
    if (!ssoConfig || !ssoConfig.isEnabled) {
      throw new Error('SSO is not enabled for this company.');
    }

    let provider: any;
    try {
      if (ssoConfig.protocol === 'SAML_2_0') {
        const { SAMLAuthProvider } = await import('firebase/auth');
        const providerId = ssoConfig.samlEntityId ? \`saml.\${ssoConfig.samlEntityId}\` : \`saml.\${companyId}\`;
        provider = new SAMLAuthProvider(providerId);
      } else if (ssoConfig.protocol === 'OIDC') {
        const { OAuthProvider } = await import('firebase/auth');
        const providerId = ssoConfig.oidcClientId ? \`oidc.\${ssoConfig.oidcClientId}\` : \`oidc.\${companyId}\`;
        provider = new OAuthProvider(providerId);
      } else {
        throw new Error('Unsupported SSO protocol');
      }
    } catch (e: any) {
       console.warn('[SSO Provider init error]', e);
       throw new Error('SSO Provider initialization failed. Ensure protocol is configured.');
    }

    let userCredential;
    try {
      const { signInWithPopup, auth } = await import('../../src/config/firebase');
      userCredential = await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('[FirebaseAuthService] SSO Sign-In error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-blocked') {
        throw new Error('SSO popup blocked by your browser. Please allow popups.');
      } else if (code === 'auth/operation-not-allowed') {
        throw new Error('SAML/OIDC is not enabled in the Firebase Console (Identity Platform required).');
      } else if (code === 'auth/provider-not-found') {
        throw new Error(\`SSO provider not found in Firebase configuration for this tenant.\`);
      }
      throw new Error(err.message || 'SSO Sign-In failed.');
    }

    const fbUser = userCredential.user;

    // Check if employee exists and generate session exactly like Google Sign-In
    const cleanEmail = fbUser.email?.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('SSO provider did not return an email address.');
    }

    const { doc, getDoc, collection, query, where, getDocs, db } = await import('../../src/config/firebase');

    // First check the global users registry
    let companyMatch = false;
    const userRegRef = doc(db, 'users', fbUser.uid);
    const userRegSnap = await getDoc(userRegRef);
    if (userRegSnap.exists()) {
       const userRegData = userRegSnap.data();
       if (userRegData.companyId === companyId) {
          companyMatch = true;
       }
    }

    if (!companyMatch) {
       // Search employees collection
       const empQuery = query(collection(db, 'companies', companyId, 'employees'), where('email', '==', cleanEmail));
       const empSnap = await getDocs(empQuery);
       if (!empSnap.empty) {
         companyMatch = true;
       }
    }

    if (!companyMatch) {
      return { fbUser, isNewUser: true, accountStatus: 'PENDING' };
    }

    const { reloadUserAndCheckStatus } = FirebaseAuthService;
    const sessionRes = await reloadUserAndCheckStatus(fbUser.uid);
    if (sessionRes.userSession) {
      return {
        fbUser,
        userSession: sessionRes.userSession,
        isNewUser: false,
        accountStatus: sessionRes.accountStatus
      };
    }

    return { fbUser, isNewUser: true, accountStatus: 'PENDING' };
  }
`;

const anchor = "  static async signInWithGoogle(): Promise<{";
if (file.includes(anchor)) {
  file = file.replace(anchor, ssoCode + "\n" + anchor);
  fs.writeFileSync('src/services/firebaseAuthService.ts', file);
  console.log('Patched auth');
} else {
  console.log('Not found');
}
