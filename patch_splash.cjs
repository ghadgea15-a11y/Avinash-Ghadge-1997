const fs = require('fs');
let file = fs.readFileSync('src/components/screens/SplashScreen.tsx', 'utf8');

file = file.replace(
  "const session = userSession || SessionManager.getUserSession();",
  "// Always force login screen on app load as requested by user\n      SessionManager.clearUserSession();\n      const session = null;"
);

fs.writeFileSync('src/components/screens/SplashScreen.tsx', file);
console.log("Patched SplashScreen to force login screen.");
