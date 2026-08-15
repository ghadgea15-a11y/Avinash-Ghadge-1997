const fs = require('fs');
let code = fs.readFileSync('src/components/common/TabletNavigationRail.tsx', 'utf8');
if (!code.includes('UserCheck')) {
  code = code.replace(
    /import \{\s*([\s\S]*?)\s*\} from 'lucide-react';/,
    (match, p1) => {
      return `import { ${p1}, UserCheck } from 'lucide-react';`;
    }
  );
  fs.writeFileSync('src/components/common/TabletNavigationRail.tsx', code);
}
