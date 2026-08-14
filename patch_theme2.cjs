const fs = require('fs');
let file = fs.readFileSync('src/context/ThemeContext.tsx', 'utf8');

file = file.replace(
  "const saved = localStorage.getItem('lsm_app_theme');",
  "const saved = localStorage.getItem('lsm_app_theme');\n    if (saved === 'DARK' && !localStorage.getItem('user_chose_theme')) {\n      localStorage.setItem('lsm_app_theme', 'LIGHT');\n      return 'LIGHT';\n    }"
);

file = file.replace(
  "localStorage.setItem('lsm_app_theme', themeMode);",
  "localStorage.setItem('lsm_app_theme', themeMode);\n    localStorage.setItem('user_chose_theme', 'true');"
);

fs.writeFileSync('src/context/ThemeContext.tsx', file);
console.log("Patched ThemeContext to force Light mode for existing users");
