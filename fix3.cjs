const fs = require('fs');
let c = fs.readFileSync('src/types/index.ts', 'utf8');
const i = c.indexOf('}[export');
if (i !== -1) {
  c = c.substring(0, i) + '}\nexport' + c.substring(i + 8);
  fs.writeFileSync('src/types/index.ts', c);
  console.log("Fixed!");
} else {
  const i2 = c.indexOf('}[\nexport');
  console.log("Index 2:", i2);
  const i3 = c.indexOf('}[\r\nexport');
  console.log("Index 3:", i3);
}
