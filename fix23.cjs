const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const str = `            if (daysLeft >= 0 && daysLeft <= 7) {
              expiringCount++;
            }
          }
        });
      setStats({`;

const strRep = `            if (daysLeft >= 0 && daysLeft <= 7) {
              expiringCount++;
            }
          }
        }
      });
      setStats({`;

console.log(text.indexOf(str));
text = text.replace(str, strRep);
fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
