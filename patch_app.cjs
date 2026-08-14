const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(
  "const savedSession = SessionManager.getUserSession();",
  "// User requested to never auto-login on app start\n    SessionManager.clearUserSession();\n    const savedSession = null;"
);

fs.writeFileSync('src/App.tsx', file);
console.log("Patched App.tsx to avoid auto-login.");
