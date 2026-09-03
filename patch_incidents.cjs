const fs = require('fs');

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// Ensure import
if (!content.includes("import { GrcIntegrationEngine }")) {
  content = content.replace(
    "import { db } from '../firebase';",
    "import { db } from '../firebase';\nimport { GrcIntegrationEngine } from './grcIntegrationEngine';"
  );
}

// Find "await setDoc(ref, payload, { merge: true });" inside saveIncidentReport
const search = "await setDoc(ref, payload, { merge: true });\n\n      // Audit Log";
if (content.includes(search)) {
  content = content.replace(search, `await setDoc(ref, payload, { merge: true });

      // Auto-Sync to GRC
      await GrcIntegrationEngine.syncIncidentToGrc(companyId, payload);

      // Audit Log`);
  fs.writeFileSync('src/services/firestoreService.ts', content);
  console.log("Patched firestoreService.ts (Incident -> GRC)");
} else {
  // Try another replacement
  const search2 = "await setDoc(ref, payload, { merge: true });";
  // We need to replace only the one inside saveIncidentReport
  const idx = content.indexOf('saveIncidentReport');
  if (idx !== -1) {
    const nextSetDoc = content.indexOf(search2, idx);
    if (nextSetDoc !== -1) {
      content = content.substring(0, nextSetDoc) + 
                "await setDoc(ref, payload, { merge: true });\n      await GrcIntegrationEngine.syncIncidentToGrc(companyId, payload);\n" +
                content.substring(nextSetDoc + search2.length);
      fs.writeFileSync('src/services/firestoreService.ts', content);
      console.log("Patched fallback firestoreService.ts");
    }
  }
}
