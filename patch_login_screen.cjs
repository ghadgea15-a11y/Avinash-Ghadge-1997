const fs = require('fs');
let file = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

const useEffectSnippet = `
  React.useEffect(() => {
    const saved = SessionManager.getSavedCredentials();
    if (saved && saved.remember) {
      if (saved.emailOrId) setEmailOrId(saved.emailOrId);
      if (saved.passwordOrPin) setPasswordOrPin(saved.passwordOrPin);
      if (saved.companyCode) setCompanyCode(saved.companyCode);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
`;

file = file.replace(
  "const handleLogin = async (e?: React.FormEvent) => {",
  useEffectSnippet
);

file = file.replace(
  "SessionManager.setSavedCredentials(emailOrId.trim(), rememberMe);",
  "SessionManager.setSavedCredentials(emailOrId.trim(), passwordOrPin, companyCode.trim().toUpperCase(), rememberMe);"
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', file);
console.log("Patched LoginScreen for remember me.");
