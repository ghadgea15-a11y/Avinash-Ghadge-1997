const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SuperAdminDashboard.tsx', 'utf8');

const importStatement = `import { SubscriptionService } from '../../services/subscriptionService';\nimport { SubscriptionPlan, CompanySubscription } from '../../types';\n`;

if (!code.includes('import { SubscriptionService }')) {
  code = code.replace(
    `import { FirestoreService } from '../../services/firestoreService';`,
    `import { FirestoreService } from '../../services/firestoreService';\n${importStatement}`
  );
}

const states = `
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<CompanySubscription[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'SUBSCRIPTIONS') {
      SubscriptionService.getAllPlans().then(setPlans).catch(console.error);
      // Here we would normally query all subscriptions for super admin
    }
  }, [activeTab]);
`;

code = code.replace(
  `const [loading, setLoading] = useState(false);`,
  `const [loading, setLoading] = useState(false);\n${states}`
);

fs.writeFileSync('src/components/screens/SuperAdminDashboard.tsx', code);
