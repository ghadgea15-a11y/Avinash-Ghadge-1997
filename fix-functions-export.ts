import * as fs from 'fs';

const file = 'functions/src/index.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("systemHealthChecker")) {
  content += "\n// Export System Health Checker\nexport * from './health-checker';\n";
  fs.writeFileSync(file, content);
  console.log('Exported health-checker');
} else {
  console.log('Already exported');
}
