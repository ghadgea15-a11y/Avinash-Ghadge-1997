import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseAppletConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

if (!getApps().length) {
    initializeApp({
        projectId: firebaseAppletConfig.projectId,
    });
}

const db = getFirestore();
db.collection('test').limit(1).get().then(() => {
    console.log("Success admin");
    process.exit(0);
}).catch(e => {
    console.error("Failed admin", e);
    process.exit(1);
});
