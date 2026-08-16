const fs = require('fs');

function fix(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Re-add backticks where they were replaced
  
  // We can just find instances where the template literal is missing backticks
  // For className={w-full ... ${...} ... }
  code = code.replace(/className=\{(w-full[^}]+\$\{.*?\}\s*)\}/gs, (match, p1) => {
    if (!p1.startsWith('\`')) {
      return 'className={\`' + p1.trim() + '\`}';
    }
    return match;
  });
  
  code = code.replace(/className=\{(text-xs px-2[^}]+\$\{.*?\}\s*)\}/gs, (match, p1) => {
    if (!p1.startsWith('\`')) {
      return 'className={\`' + p1.trim() + '\`}';
    }
    return match;
  });
  
  code = code.replace(/className=\{(w-[45] h-[45][^}]+\$\{.*?\}\s*)\}/gs, (match, p1) => {
    if (!p1.startsWith('\`')) {
      return 'className={\`' + p1.trim() + '\`}';
    }
    return match;
  });

  fs.writeFileSync(file, code);
}

fix('src/components/common/NavigationDrawer.tsx');
fix('src/components/screens/ClientManagementScreen.tsx');
fix('src/components/screens/DeploymentManagementScreen.tsx');
fix('src/components/screens/ShiftRosterScreen.tsx');
