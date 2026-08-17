const fs = require('fs');

function fix(file) {
  let code = fs.readFileSync(file, 'utf8');
  // Re-add backticks for classNames
  code = code.replace(/className=\{text-xs/g, "className={`text-xs");
  code = code.replace(/}text-amber-700' : 'bg-slate-100 text-slate-700'\n              }/g, "}text-amber-700' : 'bg-slate-100 text-slate-700'\n              }`");
  
  code = code.replace(/className=\{text-xs px-2 py-1 rounded-full \$\{/g, "className={`text-xs px-2 py-1 rounded-full ${");
  code = code.replace(/\n                    }/g, "\n                    }`");
  code = code.replace(/\n              }/g, "\n              }`");
  
  // Navigation drawer fixes
  code = code.replace(/className=\{w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 \$\{/g, "className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${");
  code = code.replace(/className=\{w-5 h-5 \$\{/g, "className={`w-5 h-5 ${");
  
  // Actually, let me just fix the missing backticks using regex
  code = code.replace(/className=\{([^}]+)\$\{/g, (m, p1) => {
    if (!p1.includes("`")) {
      return `className={\`${p1}\${`;
    }
    return m;
  });
  
  fs.writeFileSync(file, code);
}

fix('src/components/screens/ClientManagementScreen.tsx');
fix('src/components/screens/DeploymentManagementScreen.tsx');
fix('src/components/screens/ShiftRosterScreen.tsx');
fix('src/components/common/NavigationDrawer.tsx');
