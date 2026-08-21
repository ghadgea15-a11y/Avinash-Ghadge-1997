import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("| 'VENDOR_MANAGEMENT'")) {
  content = content.replace(
    "| 'PROCUREMENT_SRM'",
    "| 'PROCUREMENT_SRM'\n  | 'VENDOR_MANAGEMENT'"
  );
  fs.writeFileSync(file, content);
  console.log('Added VENDOR_MANAGEMENT to PhaseAScreen');
}
