const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /          if \(sub\.currentPeriodEnd\) \{\n            const endDate = new Date\(sub\.currentPeriodEnd\)\.getTime\(\);\n            const daysLeft = \(endDate - now\) \/ \(1000 \* 60 \* 60 \* 24\);\n            if \(daysLeft >= 0 && daysLeft <= 7\) \{\n              expiringCount\+\+;\n            \}\n          \}\n        \}\);\n      setStats\(\{/g;

const replacement = `          if (sub.currentPeriodEnd) {
            const endDate = new Date(sub.currentPeriodEnd).getTime();
            const daysLeft = (endDate - now) / (1000 * 60 * 60 * 24);
            if (daysLeft >= 0 && daysLeft <= 7) {
              expiringCount++;
            }
          }
        }
      });
      setStats({`;

text = text.replace(regex, replacement);

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
