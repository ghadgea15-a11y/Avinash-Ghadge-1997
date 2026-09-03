const fs = require('fs');

let content = fs.readFileSync('src/services/visitorWatchlistService.ts', 'utf8');

// Ensure import
if (!content.includes("import { GrcIntegrationEngine }")) {
  content = content.replace(
    "import { db } from '../firebase';",
    "import { db } from '../firebase';\nimport { GrcIntegrationEngine } from './grcIntegrationEngine';"
  );
}

// Inside addToWatchlist, find the setDoc block
const search = "      }, { merge: true });\n\n      // Audit log entry";
if (content.includes(search)) {
  content = content.replace(search, `      }, { merge: true });\n
      // Auto-Sync to GRC
      await GrcIntegrationEngine.syncBlacklistedVisitorToGrc(companyId, record);

      // Audit log entry`);
  fs.writeFileSync('src/services/visitorWatchlistService.ts', content);
  console.log("Patched visitorWatchlistService.ts (Visitor -> GRC)");
} else {
  const search2 = "      }, { merge: true });";
  const idx = content.indexOf('addToWatchlist');
  if (idx !== -1) {
    const nextSetDoc = content.indexOf(search2, idx);
    if (nextSetDoc !== -1) {
      content = content.substring(0, nextSetDoc) + 
                "      }, { merge: true });\n      await GrcIntegrationEngine.syncBlacklistedVisitorToGrc(companyId, record);\n" +
                content.substring(nextSetDoc + search2.length);
      fs.writeFileSync('src/services/visitorWatchlistService.ts', content);
      console.log("Patched fallback visitorWatchlistService.ts");
    }
  }
}
