const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /      await FirestoreService\.createPlan\(\{[\s\S]*?updatedAt: new Date\(\)\.toISOString\(\)\n      \}\);/g;
const match = text.match(regex);
console.log(match);
