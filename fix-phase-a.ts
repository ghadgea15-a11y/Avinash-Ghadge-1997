import * as fs from 'fs';
const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("'MANDATORY_REFRESHERS'")) {
  content = content.replace(
    "| 'TRAINING_LMS'",
    "| 'TRAINING_LMS'\n  | 'MANDATORY_REFRESHERS'"
  );
  if (!content.includes("'MANDATORY_REFRESHERS'")) {
    content = content.replace(
      "| 'SETTINGS'",
      "| 'SETTINGS'\n  | 'MANDATORY_REFRESHERS'"
    );
  }
  fs.writeFileSync(file, content);
}
