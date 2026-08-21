import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("'CERTIFICATION_TRACKING'")) {
  content = content.replace(
    "| 'TRAINING_LMS'",
    "| 'TRAINING_LMS'\n  | 'CERTIFICATION_TRACKING'"
  );
  fs.writeFileSync(file, content);
  console.log('Added CERTIFICATION_TRACKING');
}
