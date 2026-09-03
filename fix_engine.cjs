const fs = require('fs');
let content = fs.readFileSync('src/services/workforceCapacityEngine.ts', 'utf8');

content = content.replace(/collection\(db, 'sites'\)/g, "collection(db, 'companies', companyId, 'sites')");
content = content.replace(/collection\(db, 'shifts'\)/g, "collection(db, 'companies', companyId, 'shifts')");
content = content.replace(/collection\(db, 'employees'\)/g, "collection(db, 'companies', companyId, 'employees')");
content = content.replace(/collection\(db, 'rosters'\)/g, "collection(db, 'companies', companyId, 'rosters')");
content = content.replace(/collection\(db, 'attendance'\)/g, "collection(db, 'companies', companyId, 'attendance')");
content = content.replace(/collection\(db, 'leave_requests'\)/g, "collection(db, 'companies', companyId, 'leaves')"); // Also fix the leave_requests to leaves

// INCIDENTS_COLLECTION is also root. We need to fix it.
content = content.replace(/collection\(db, this\.INCIDENTS_COLLECTION\)/g, "collection(db, 'companies', companyId, this.INCIDENTS_COLLECTION)");
content = content.replace(/doc\(db, this\.INCIDENTS_COLLECTION/g, "doc(db, 'companies', incident.companyId, this.INCIDENTS_COLLECTION");

content = content.replace(/collection\(db, this\.REQUIREMENTS_COLLECTION\)/g, "collection(db, 'companies', companyId, this.REQUIREMENTS_COLLECTION)");

fs.writeFileSync('src/services/workforceCapacityEngine.ts', content);
