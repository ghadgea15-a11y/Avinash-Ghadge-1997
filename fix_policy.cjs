const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace("       ...policy,\n          siteId: record.siteId,", "          policy: policy || undefined,\n          siteId: record.siteId,");
code = code.replace("       ...policy,\n          siteId,\n          rosterId\n        });", "          policy: policy || undefined,\n          siteId,\n          rosterId\n        });");
code = code.replace("       ...policy,\n          siteId,\n          rosterId\n        });", "          policy: policy || undefined,\n          siteId,\n          rosterId\n        });");

fs.writeFileSync('src/services/firestoreService.ts', code);
