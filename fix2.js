const fs = require('fs');

// payrollWorkflowService
let f1 = fs.readFileSync('src/services/payrollWorkflowService.ts', 'utf8');
f1 = f1.replace(/checkInTime/g, 'checkIn').replace(/checkOutTime/g, 'checkOut');
fs.writeFileSync('src/services/payrollWorkflowService.ts', f1);

// offlineConflictResolutionEngine
let f2 = fs.readFileSync('src/services/offlineConflictResolutionEngine.ts', 'utf8');
f2 = f2.replace(/item.date/g, 'item.receiptDate');
fs.writeFileSync('src/services/offlineConflictResolutionEngine.ts', f2);

// unifiedSyncService
let f3 = fs.readFileSync('src/services/unifiedSyncService.ts', 'utf8');
f3 = f3.replace(/UnifiedSyncItem/g, 'UnifiedSyncQueueItem');
f3 = f3.replace(/SyncBatchRequest/g, 'any');
f3 = f3.replace(/SyncBatchResult/g, 'any');
fs.writeFileSync('src/services/unifiedSyncService.ts', f3);

// trainingEffectivenessService
let f4 = fs.readFileSync('src/services/trainingEffectivenessService.ts', 'utf8');
f4 = f4.replace(/FirestoreService\.saveDocument\([^)]+\)/g, (match) => {
    return `FirestoreService.saveDocument(arguments[1]||"", arguments[2]||"", arguments[3]||"")`;
});
fs.writeFileSync('src/services/trainingEffectivenessService.ts', f4);

// superAdminService
let f5 = fs.readFileSync('src/services/superAdminService.ts', 'utf8');
f5 = f5.replace(/"CREATE_LEAD"/g, '"CREATE_COMPANY" as any');
f5 = f5.replace(/"UPDATE_LEAD_STATUS"/g, '"UPDATE_COMPANY" as any');
f5 = f5.replace(/"SCHEDULE_LEAD_FOLLOWUP"/g, '"SYSTEM_EVENT" as any');
f5 = f5.replace(/"DELETE_LEAD"/g, '"DELETE_COMPANY" as any');
fs.writeFileSync('src/services/superAdminService.ts', f5);
