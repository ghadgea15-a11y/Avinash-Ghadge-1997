const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /updatedAt: new Date\(\)\.toISOString\(\)\n    \}\);\n    showSuccess/g;
const replacement = `updatedAt: new Date().toISOString()\n      });\n      showSuccess`;

text = text.replace(regex, replacement);

const regex2 = /loadPlans\(\);\n  \} catch \(err\) \{/g;
const replacement2 = `loadPlans();\n    } catch (err) {`;

text = text.replace(regex2, replacement2);

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
