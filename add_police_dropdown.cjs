const fs = require('fs');
const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "<option value=\"OTHER\">Other / Misc Check</option>",
  "<option value=\"POLICE\">Police / Criminal Record Check</option>\n                    <option value=\"OTHER\">Other / Misc Check</option>"
);

fs.writeFileSync(file, code);
