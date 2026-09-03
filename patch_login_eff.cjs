const fs = require('fs');
let file = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

file = file.replace(/FirebaseAuthService\.verifyCompanyCode\(saved\.companyCode\)\s*\.then\(comp => \{/,
  `FirebaseAuthService.verifyCompanyCode(saved.companyCode)
        .then(async comp => {
          try {
            const { IntegrationService } = await import('../../services/integrationService');
            const sso = await IntegrationService.getSsoConfig(comp.companyId);
            if (sso && sso.isEnabled) {
               setSsoConfig(sso);
            }
          } catch(e) {}
`);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', file);
console.log('Patched login useEffect');
