import * as fs from 'fs';
const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('isDeployable')) {
  content = content.replace(
    '  status: ',
    '  isDeployable?: boolean;\n  rosterBlockReason?: string;\n  status: '
  );
  fs.writeFileSync(file, content);
}
