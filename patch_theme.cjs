const fs = require('fs');
let file = fs.readFileSync('src/context/ThemeContext.tsx', 'utf8');

file = file.replace(
  "themeMode: 'DARK'",
  "themeMode: 'LIGHT'"
);
file = file.replace(
  "isDark: true",
  "isDark: false"
);
file = file.replace(
  "return (saved as AppThemeMode) || 'DARK';",
  "return (saved as AppThemeMode) || 'LIGHT';"
);
file = file.replace(
  "const [isDark, setIsDark] = useState<boolean>(true);",
  "const [isDark, setIsDark] = useState<boolean>(false);"
);

fs.writeFileSync('src/context/ThemeContext.tsx', file);
console.log("Patched ThemeContext default to LIGHT");
