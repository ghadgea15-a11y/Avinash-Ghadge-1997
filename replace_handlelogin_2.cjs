const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

const startPattern = /const handleLogin = async \(e\?: React\.FormEvent\) => \{/;
const endPattern = /const handleBiometricSuccess/;

const startIndex = code.search(startPattern);
const endIndex = code.search(endPattern);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!emailOrId.trim()) {
      setError('Please enter your Email address.');
      return;
    }

    if (!passwordOrPin) {
      setError('Please enter your Password.');
      return;
    }

    if (!companyCode.trim()) {
      setError('Please enter your Company Code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First verify the company code
      const company = await FirebaseAuthService.verifyCompanyCode(companyCode.trim().toUpperCase());
      SessionManager.setActiveCompany(company);

      // Then authenticate the user
      const session = await FirebaseAuthService.authenticateUser({
        companyId: company.companyId,
        emailOrId: emailOrId.trim(),
        passwordOrPin: passwordOrPin,
        isPinMode: false
      });
      
      SessionManager.setUserSession(session);
      SessionManager.setSavedCredentials(emailOrId.trim(), rememberMe);

      onLoginSuccess(session);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please verify your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Currently disabled Google Login to prefer Email/Password standard for enterprise
    setError('Google login is disabled for this tenant. Please use Email and Password.');
  };

  `;
  
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
  console.log('Successfully replaced handleLogin.');
} else {
  console.log('Pattern not found.');
}
