const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

text = text.replace(/updatedAt: new Date\(\)\.toISOString\(\)\n      \}\)\n    \]\);\n    showSuccess/g, `updatedAt: new Date().toISOString()\n      })\n    ]);\n    showSuccess`);

text = text.replace(/updatedAt: new Date\(\)\.toISOString\(\)\n      \}\)\n    \]\);\n    showSuccess\('✅ Default Plans Created Successfully'\);\n    loadPlans\(\);\n  \} catch \(e\) \{/g, `updatedAt: new Date().toISOString()\n      })\n    ]);\n    showSuccess('✅ Default Plans Created Successfully');\n    loadPlans();\n  } catch (e) {`);

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
