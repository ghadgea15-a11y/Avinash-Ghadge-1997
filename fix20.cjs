const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

text = text.replace(/        \}\);\n      setStats\(\{/g, "        }\n      });\n      setStats({");

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
