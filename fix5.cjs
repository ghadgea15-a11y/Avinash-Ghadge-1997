const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /const handleCreatePlan = async \(\) => \{[\s\S]*?catch \(err\) \{\n\s*handleError\(err, '✕ Creation Failed'\);\n\s*\}\n\s*\};\n/g;

const replacement = `const handleCreatePlan = async () => {
    if (!newPlan.planName || !newPlan.planCode || !newPlan.monthlyPrice) {
      showError('Please fill all required fields');
      return;
    }
    try {
      await FirestoreService.createPlan({
        planId: 'PLAN_' + newPlan.planCode.toUpperCase().trim(),
        planCode: newPlan.planCode.toUpperCase().trim(),
        planName: newPlan.planName,
        description: newPlan.description || '',
        status: newPlan.status || 'ACTIVE',
        billingCycle: newPlan.billingCycle || 'MONTHLY',
        monthlyPrice: Number(newPlan.monthlyPrice),
        yearlyPrice: Number(newPlan.yearlyPrice) || (Number(newPlan.monthlyPrice) * 10),
        currency: 'INR',
        employeeLimit: Number(newPlan.employeeLimit) || 50,
        userLimit: Number(newPlan.userLimit) || 2,
        storageLimitMB: Number(newPlan.storageLimitMB) || 1024,
        enabledModules: newPlan.enabledModules || ['EMPLOYEES', 'ATTENDANCE'],
        trialEligible: true,
        trialDays: 14,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      showSuccess('✅ Subscription Plan Created');
      setShowCreatePlanModal(false);
      loadPlans();
    } catch (err) {
      handleError(err, '✕ Creation Failed');
    }
  };
`;

text = text.replace(regex, replacement);

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
