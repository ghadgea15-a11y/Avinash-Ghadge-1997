const fs = require('fs');

let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

const effectCode = `  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // Filters`;

file = file.replace('  // Filters', effectCode);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);
console.log('Timeout patched');
