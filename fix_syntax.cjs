const fs = require('fs');
let code = fs.readFileSync('src/services/subscriptionService.ts', 'utf8');

code = code.replace(
  /_\$\\{moduleId\\}\`\);[\s\S]*\}\}/g,
  ""
);

fs.writeFileSync('src/services/subscriptionService.ts', code);
