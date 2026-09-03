const fs = require('fs');
let content = fs.readFileSync('src/services/certificationTrackingService.ts', 'utf8');

content = content.replace(/const notifRef = doc\(db, 'notifications', n\.id\);/g, "const notifRef = doc(db, 'companies', companyId, 'notifications', n.id);");

fs.writeFileSync('src/services/certificationTrackingService.ts', content);
