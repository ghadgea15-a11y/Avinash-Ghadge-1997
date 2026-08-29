const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /            if \(daysLeft >= 0 && daysLeft <= 7\) \{\n              expiringCount\+\+;\n            \}\n          \}\n        \}\);\n      setStats\(\{/g;
const replacement = `            if (daysLeft >= 0 && daysLeft <= 7) {
              expiringCount++;
            }
          }
        }
      });
      setStats({`;

text = text.replace(regex, replacement);

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
