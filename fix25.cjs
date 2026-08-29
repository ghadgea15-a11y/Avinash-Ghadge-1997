const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /      const planMap = new Map<string, SubscriptionPlan>\(\);\n      fetchedPlans\.forEach\(p => planMap\.set\(p\.planId, p\)\);\n\n      subsData\.forEach\(item => \{\n        if \(item\.subscription\) \{\n          const sub = item\.subscription;\n          const plan = planMap\.get\(sub\.planId\);\n          const monthlyPrice = plan \? plan\.monthlyPrice : 0;\n          if \(sub\.status === 'ACTIVE'\) \{\n            activeCount\+\+;\n            monthlyRev \+= \(sub\.billingCycle === 'MONTHLY' \? monthlyPrice : Math\.round\(\(plan\?\.yearlyPrice \|\| monthlyPrice \* 10\) \/ 12\)\);\n          \} else if \(sub\.status === 'TRIAL'\) \{\n            trialCount\+\+;\n          \}\n          if \(sub\.currentPeriodEnd\) \{\n            const endDate = new Date\(sub\.currentPeriodEnd\)\.getTime\(\);\n            const daysLeft = \(endDate - now\) \/ \(1000 \* 60 \* 60 \* 24\);\n            if \(daysLeft >= 0 && daysLeft <= 7\) \{\n              expiringCount\+\+;\n            \}\n          \}\n        \}\n      \}\);/g;

const replacement = `      const planMap = new Map<string, SubscriptionPlan>();
      fetchedPlans.forEach(p => planMap.set(p.planId, p));

      subsData.forEach(item => {
        if (item.subscription) {
          const sub = item.subscription;
          const plan = planMap.get(sub.planId);
          const monthlyPrice = plan ? plan.monthlyPrice : 0;
          if (sub.status === 'ACTIVE') {
            activeCount++;
            monthlyRev += (sub.billingCycle === 'MONTHLY' ? monthlyPrice : Math.round((plan?.yearlyPrice || monthlyPrice * 10) / 12));
          } else if (sub.status === 'TRIAL') {
            trialCount++;
          }
          if (sub.currentPeriodEnd) {
            const endDate = new Date(sub.currentPeriodEnd).getTime();
            const daysLeft = (endDate - now) / (1000 * 60 * 60 * 24);
            if (daysLeft >= 0 && daysLeft <= 7) {
              expiringCount++;
            }
          }
        }
      });`;

let c = false;
if (regex.test(text)) {
  text = text.replace(regex, replacement);
  c = true;
} else {
  console.log("No match");
}

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
