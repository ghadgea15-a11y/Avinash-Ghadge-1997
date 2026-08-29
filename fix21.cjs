const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /            \}\n          \}\n        \}\);\n      setStats\(\{/g;
const replacement = `            }
          }
        }
      });
      setStats({`;

let c = false;
if (regex.test(text)) {
  text = text.replace(regex, replacement);
  c = true;
} else {
  console.log("No match");
}

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
