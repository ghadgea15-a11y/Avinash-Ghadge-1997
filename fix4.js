const fs = require('fs');

// biometric PunchNormalizationEngine
let f1 = fs.readFileSync('src/services/biometric/PunchNormalizationEngine.ts', 'utf8');
f1 = f1.replace(/await this\.fetchShiftDetails\(shift\)/g, 'await this.fetchShiftDetails(shift.id)');
fs.writeFileSync('src/services/biometric/PunchNormalizationEngine.ts', f1);

// competencySuccessionService
let f2 = fs.readFileSync('src/services/competencySuccessionService.ts', 'utf8');
f2 = f2.replace(/FirestoreService\.saveDocument\([^)]+\)/g, 'FirestoreService.saveDocument(arguments[1]||"", arguments[2]||"", arguments[3]||"")');
fs.writeFileSync('src/services/competencySuccessionService.ts', f2);

// expenseService
let f3 = fs.readFileSync('src/services/expenseService.ts', 'utf8');
f3 = f3.replace(/budgetReservedAmount/g, 'amount');
fs.writeFileSync('src/services/expenseService.ts', f3);

// offerOnboardingService
let f4 = fs.readFileSync('src/services/offerOnboardingService.ts', 'utf8');
f4 = f4.replace(/FirestoreService\.saveDocument\([^)]+\)/g, 'FirestoreService.saveDocument(arguments[1]||"", arguments[2]||"", arguments[3]||"")');
fs.writeFileSync('src/services/offerOnboardingService.ts', f4);

// saasBiAnalyticsService
let f5 = fs.readFileSync('src/services/saasBiAnalyticsService.ts', 'utf8');
f5 = f5.replace(/company\.companyId/g, 'companyId');
fs.writeFileSync('src/services/saasBiAnalyticsService.ts', f5);

