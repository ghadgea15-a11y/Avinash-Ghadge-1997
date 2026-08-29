const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

text = text.replace(/updatedAt: new Date\(\)\.toISOString\(\)\n      \}\);\n      showSuccess\('✅ Default Plans Created Successfully'\);\n      loadPlans\(\);\n    \} catch \(e\) \{/g, `updatedAt: new Date().toISOString()\n      })\n    ]);\n    showSuccess('✅ Default Plans Created Successfully');\n    loadPlans();\n  } catch (e) {`);

text = text.replace(/updatedAt: new Date\(\)\.toISOString\(\)\n      \}\);\n      showSuccess\('✅ Subscription Plan Created'\);\n      setShowCreatePlanModal\(false\);\n      loadPlans\(\);\n    \} catch \(err\) \{/g, `updatedAt: new Date().toISOString()\n    });\n    showSuccess('✅ Subscription Plan Created');\n    setShowCreatePlanModal(false);\n    loadPlans();\n  } catch (err) {`);

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
