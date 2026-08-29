const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /      showSuccess\('✅ Subscription Plan Created'\);\n    setShowCreatePlanModal\(false\);\n    loadPlans\(\);\n    \} catch \(err\) \{/g;
const replacement = `      showSuccess('✅ Subscription Plan Created');\n      setShowCreatePlanModal(false);\n      loadPlans();\n    } catch (err) {`;

text = text.replace(regex, replacement);

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
