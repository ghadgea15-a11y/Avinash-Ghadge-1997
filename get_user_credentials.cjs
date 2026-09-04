const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase-admin/app');

initializeApp({ projectId: 'log-sheet-af97a' });
const db = getFirestore();

async function run() {
    const usersSnap = await db.collection('users').get();
    const result = [];
    usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.email) {
            result.push({
                Role: data.role,
                Email: data.email,
                Company: data.companyId,
                Status: data.accountStatus
            });
        }
    });
    
    // Group and sort by Role
    const rolesToExtract = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_MANAGER', 'HR_ADMIN', 'EMPLOYEE', 'GUARD', 'SUPERVISOR', 'OPS_MANAGER', 'FINANCE', 'FINANCE_MANAGER', 'GENERAL_MANAGER'];
    
    const finalReport = [];
    rolesToExtract.forEach(role => {
       const user = result.find(u => u.Role === role);
       if (user) {
           finalReport.push({
               Role: user.Role,
               Email: user.Email,
               Password: "Pass@123", // As standard password we set
               Status: user.Status
           });
       }
    });
    
    console.table(finalReport);
}
run().catch(console.error);
