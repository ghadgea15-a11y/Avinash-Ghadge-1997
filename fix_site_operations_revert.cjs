const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

const regex = /\/\/ --- PAGINATION & FILTER LOGIC ---\n  const filteredCheckpoints = useMemo\(\(\) => \{[\s\S]*?\}, \[filteredMaterials, currentPage, itemsPerPage\]\);\n\n  return \(/;

code = code.replace(regex, 'return () => {');

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
