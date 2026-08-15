const fs = require('fs');
let code = fs.readFileSync('src/components/screens/EmployeeModuleScreen.tsx', 'utf8');

// Ensure SubscriptionService is imported
if (!code.includes('SubscriptionService')) {
  code = code.replace(
    /import \{ FirestoreService \} from '\.\.\/\.\.\/services\/firestoreService';/,
    `import { FirestoreService } from '../../services/firestoreService';\nimport { SubscriptionService } from '../../services/subscriptionService';`
  );
}

const checkLimitLogic = `
    // Check Subscription Limit for NEW employees
    if (!editingEmployeeId) {
      try {
        const isLimitReached = await SubscriptionService.checkEmployeeLimitReached(currentCompanyId, employees.length);
        if (isLimitReached) {
          setFeedbackMessage({ text: 'Employee limit reached on your current plan. Please upgrade your subscription to add more.', type: 'ERROR' });
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.error('Limit check failed', err);
      }
    }
`;

if (!code.includes('checkEmployeeLimitReached')) {
  code = code.replace(
    /const isValid = await validateForm\(\);\n\s*if \(\!isValid\) \{\n\s*setSubmitting\(false\);\n\s*return;\n\s*\}/,
    `const isValid = await validateForm();\n    if (!isValid) {\n      setSubmitting(false);\n      return;\n    }\n${checkLimitLogic}`
  );
  fs.writeFileSync('src/components/screens/EmployeeModuleScreen.tsx', code);
}
