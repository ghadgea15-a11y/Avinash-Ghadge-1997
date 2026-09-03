const fs = require('fs');
let file = fs.readFileSync('src/services/pmsService.ts', 'utf8');

// Replace logAction calls with recordEvent
file = file.replace(/await AuditTrailService\.logAction\(\s*companyId,\s*'([^']+)',\s*([^,]+),\s*`([^`]+)`,\s*actor\.uid,\s*actor\.name,\s*(\{.*?\})\s*\);/gs, 
  (match, module, action, description, metadata) => {
    return `await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      module: '${module}',
      action: ${action},
      description: \`${description}\`,
      metadata: ${metadata}
    });`;
  });

file = file.replace(/await AuditTrailService\.logAction\(\s*companyId,\s*'([^']+)',\s*'([^']+)',\s*`([^`]+)`,\s*actor\.uid,\s*actor\.name,\s*(\{.*?\})\s*\);/gs, 
  (match, module, action, description, metadata) => {
    return `await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      module: '${module}',
      action: '${action}',
      description: \`${description}\`,
      metadata: ${metadata}
    });`;
  });
  
file = file.replace(/await BpmService\.createInstance\(companyId, \{(.*?)\}, actor\);/gs,
  (match, inner) => {
    return `await BpmService.submitForApproval(companyId, actor.uid, 'PERFORMANCE_MANAGEMENT', reviewRef.id, 'APPRAISAL_REVIEW', { ${inner} });`;
  });

fs.writeFileSync('src/services/pmsService.ts', file);
console.log('Patched pmsService');
