const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

const startPattern = /const handleLogin = async \(e\?: React\.FormEvent\) => \{/;
const endPattern = /const handleGoogleLogin/;

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

    setLoading(true);
    setError(null);

    try {
      const session = await FirebaseAuthService.authenticateUser({
        companyId: activeCompany.companyId,
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

  `;
  
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
  console.log('Successfully replaced handleLogin.');
} else {
  console.log('Pattern not found.');
}
