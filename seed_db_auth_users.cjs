const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'log-sheet-af97a' });
const auth = getAuth();
const db = getFirestore();

async function run() {
    console.log("Checking if users exist in Firebase Auth...");
    try {
        const userRec = await auth.getUserByEmail('ghadgea15@gmail.com');
        console.log("Super Admin exists in Auth:", userRec.uid);
        await auth.updateUser(userRec.uid, { password: 'Pass@123' });
        console.log("Password reset successfully.");
    } catch(e) {
        if(e.code === 'auth/user-not-found') {
            const userRec = await auth.createUser({
                email: 'ghadgea15@gmail.com',
                password: 'Pass@123',
                displayName: 'Test SUPER_ADMIN'
            });
            console.log("Created Super Admin in Auth:", userRec.uid);
            await db.collection('users').doc(userRec.uid).set({
                id: userRec.uid,
                email: 'ghadgea15@gmail.com',
                name: 'Test SUPER_ADMIN',
                role: 'SUPER_ADMIN',
                companyId: 'GLOBAL_ADMIN',
                status: 'ACTIVE'
            }, {merge: true});
        }
    }
}
run().catch(console.error);
