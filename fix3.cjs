const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /const createDefaultPlans = async \(\) => \{[\s\S]*?catch \(e\) \{\n\s*handleError\(e, '✕ Creation Failed'\);\n\s*\}\n\s*\};\n/g;

const replacement = `const createDefaultPlans = async () => {
    try {
      await Promise.all([
        FirestoreService.createPlan({
          planId: 'PLAN_STARTER',
          planCode: 'STARTER',
          planName: 'Starter',
          description: 'For small security agencies with basic muster tracking.',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          monthlyPrice: 999,
          yearlyPrice: 9990,
          currency: 'INR',
          employeeLimit: 50,
          userLimit: 2,
          storageLimitMB: 1024,
          enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'REPORTS'],
          trialEligible: true,
          trialDays: 14,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
        FirestoreService.createPlan({
          planId: 'PLAN_PRO',
          planCode: 'PRO',
          planName: 'Professional',
          description: 'For growing businesses with multiple sites and advanced muster.',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          monthlyPrice: 2999,
          yearlyPrice: 29990,
          currency: 'INR',
          employeeLimit: 250,
          userLimit: 5,
          storageLimitMB: 5120,
          enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE', 'PAYROLL', 'REPORTS', 'ANALYTICS', 'GUARD_PATROL'],
          trialEligible: true,
          trialDays: 14,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
        FirestoreService.createPlan({
          planId: 'PLAN_ENTERPRISE',
          planCode: 'ENTERPRISE',
          planName: 'Enterprise Elite',
          description: 'Complete multi-branch security operations with AI OCR, GPS muster, and full RBAC.',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          monthlyPrice: 7999,
          yearlyPrice: 79990,
          currency: 'INR',
          employeeLimit: 2000,
          userLimit: 25,
          storageLimitMB: 51200,
          enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE', 'PAYROLL', 'REPORTS', 'ANALYTICS', 'GUARD_PATROL', 'INCIDENTS', 'VISITORS', 'MATERIALS'],
          trialEligible: true,
          trialDays: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      ]);
      showSuccess('✅ Default Plans Created Successfully');
      loadPlans();
    } catch (e) {
      handleError(e, '✕ Creation Failed');
    }
  };
`;

text = text.replace(regex, replacement);
fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
