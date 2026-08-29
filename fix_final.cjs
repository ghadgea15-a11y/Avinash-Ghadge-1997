const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');
const str = `        updatedAt: new Date().toISOString()
      });
      showSuccess`;

const repl = `        updatedAt: new Date().toISOString()
      };
      await FirestoreService.createPlan(planToSave);
      dismiss();
      showSuccess`;

text = text.replace(str, repl);
fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
