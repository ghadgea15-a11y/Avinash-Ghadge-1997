const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

// Update Props
code = code.replace(/activeCompany: CompanyTenant;/, 'activeCompany?: CompanyTenant | null;');

// Update Component signature
code = code.replace(/  activeCompany,\n  onLoginSuccess,\n  onNavigate,\n  onChangeCompany/g, '  onLoginSuccess,\n  onNavigate');

// Remove Header Pill
const headerStart = code.indexOf('{/* Company Header Pill */}');
const headerEnd = code.indexOf('{/* Title & Brand Logo */}');
if (headerStart !== -1 && headerEnd !== -1) {
  code = code.substring(0, headerStart) + code.substring(headerEnd);
}

// Remove Biometric Prompt reliance on activeCompany
code = code.replace(/subtitle={\`Fast Fingerprint login for \${activeCompany\.brandName}\`}/, 'subtitle={`Fast Fingerprint login`}');

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('Removed header pill and activeCompany refs');
