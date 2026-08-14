const fs = require('fs');

// 1. Update SplashScreen.tsx
let splash = fs.readFileSync('src/components/screens/SplashScreen.tsx', 'utf8');
splash = splash.replace(/onComplete\('COMPANY_CODE'\);/g, "onComplete('LOGIN');");
fs.writeFileSync('src/components/screens/SplashScreen.tsx', splash);

// 2. Update App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Remove COMPANY_CODE logic block
const startCompCode = app.indexOf("{currentScreen === 'COMPANY_CODE' && (");
if (startCompCode !== -1) {
  const endCompCode = app.indexOf("{currentScreen === 'LOGIN' && (");
  if (endCompCode !== -1) {
    app = app.substring(0, startCompCode) + app.substring(endCompCode);
  }
}

// Remove activeCompany passed to LoginScreen
app = app.replace(/<LoginScreen[\s\S]*?onLoginSuccess/m, `<LoginScreen
                        onLoginSuccess`);
// Remove onChangeCompany passed to LoginScreen
app = app.replace(/onChangeCompany=\{\(\) => setCurrentScreen\('COMPANY_CODE'\)\}/g, '');

fs.writeFileSync('src/App.tsx', app);
console.log('Routing updated.');
