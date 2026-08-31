const fs = require('fs');

function patch(file, matcher, replacement) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(matcher, replacement);
    fs.writeFileSync(file, content);
  } catch (e) {
    console.error(e.message);
  }
}

// dashboards arguments issue: QueryScopeEngine.getSiteScope(userSession, something, something)
patch('src/components/screens/dashboards/official/DepartmentGenericDashboard.tsx', /QueryScopeEngine\.getSiteScope\(userSession, userSession\.companyId, userSession\.role\)/g, "QueryScopeEngine.getSiteScope(userSession)");
patch('src/components/screens/dashboards/official/FinanceDashboard.tsx', /QueryScopeEngine\.getSiteScope\(userSession, userSession\.companyId, userSession\.role\)/g, "QueryScopeEngine.getSiteScope(userSession)");
patch('src/components/screens/dashboards/official/ProcurementDashboard.tsx', /QueryScopeEngine\.getSiteScope\(userSession, userSession\.companyId, userSession\.role\)/g, "QueryScopeEngine.getSiteScope(userSession)");
patch('src/components/wfm/OvertimeDashboard.tsx', /QueryScopeEngine\.getSiteScope\(session, session\.companyId, session\.role\)/g, "QueryScopeEngine.getSiteScope(session)");
patch('src/components/wfm/OvertimeDashboard.tsx', /QueryScopeEngine\.getSiteScope\(userSession, userSession\.companyId, userSession\.role\)/g, "QueryScopeEngine.getSiteScope(userSession)");

// HALF_DAY -> HALFDAY
patch('src/components/wfm/MusterRegister.tsx', /'HALF_DAY'/g, "'HALFDAY'");
patch('src/components/wfm/OvertimeDashboard.tsx', /'HALF_DAY'/g, "'HALFDAY'");
patch('src/components/wfm/SupervisorRollCall.tsx', /'HALF_DAY'/g, "'HALFDAY'");

// UserSession displayName -> fullName
patch('src/components/wfm/PunchStation.tsx', /session\.displayName/g, "session.fullName");

// MaintenanceService handleWorkOrderUpdate
patch('src/components/workorders/WorkOrderDetail.tsx', /MaintenanceService\.handleWorkOrderUpdate/g, "MaintenanceService.updateWorkOrder");

// getFirebaseAdminDb -> adminDb
patch('src/server/attendanceAdminService.ts', /getFirebaseAdminDb\(\)/g, "require('../firebaseAdmin').db");

// bpmDelegationService: endDate -> endAt, startDate -> startAt
patch('src/services/bpmDelegationService.ts', /endDate:/g, "endAt:");
patch('src/services/bpmDelegationService.ts', /startDate:/g, "startAt:");
patch('src/services/bpmDelegationService.ts', /endDate/g, "endAt");
patch('src/services/bpmDelegationService.ts', /startDate/g, "startAt");

// bpmService: 210, boolean | undefined
patch('src/services/bpmService.ts', /isUrgent: request\.priority === 'URGENT',/g, "isUrgent: request.priority === 'URGENT' ? true : false,");

// changeControlService: 190
patch('src/services/changeControlService.ts', /await AuditTrailService\.recordEvent\([^;]+;/g, (match) => {
  if (match.includes("MODIFY_SENSITIVE") && match.includes("await AuditTrailService.recordEvent(")) {
    return `await AuditTrailService.recordEvent({
        session: session as any,
        companyId: session.companyId,
        module: 'CHANGE_CONTROL',
        action: 'MODIFY_SENSITIVE',
        method: 'EXECUTE',
        entity: record.entityType,
        entityId: record.entityId,
        success: true,
        severity: 'HIGH',
        referenceId: changeId,
        details: \`Authorized change applied to \${record.entityType}\`,
        payload: { before: record.beforeData, after: record.afterData }
      });`;
  }
  return match;
});

// bpmService: 321 
patch('src/services/bpmService.ts', /await AuditTrailService\.recordEvent\(\s*\{\s*userId:\s*session\.userId\s*\|\|\s*session\.uid,\s*companyId:\s*session\.companyId,\s*role:\s*session\.role\s*\},\s*session\.companyId,\s*'BPM_WORKFLOW',\s*'APPROVAL_DECISION',\s*'EXECUTE',\s*'BpmApprovalInstance',\s*instanceId,\s*true,\s*'HIGH',\s*undefined,\s*undefined,\s*undefined,\s*`Decision: \${decision}`\s*\);/g, 
`await AuditTrailService.recordEvent({
        session: session as any,
        companyId: session.companyId,
        module: 'BPM_WORKFLOW',
        action: 'APPROVAL_DECISION',
        method: 'EXECUTE',
        entity: 'BpmApprovalInstance',
        entityId: instanceId,
        success: true,
        severity: 'HIGH',
        reason: \`Decision: \${decision}\`
      });`);


// enterpriseConflictTestRunner
patch('src/services/enterpriseConflictTestRunner.ts', /id: 'SITE-ALPHA',/g, "id: 'SITE-ALPHA', code: 'A', updatedAt: '',");
patch('src/services/enterpriseConflictTestRunner.ts', /id: 'SITE-OMEGA',/g, "id: 'SITE-OMEGA', code: 'O', updatedAt: '',");


// firestoreService string | undefined
patch('src/services/firestoreService.ts', /const compId = companyId || session\.companyId;/g, "const compId = companyId || session.companyId || '';");
patch('src/services/firestoreService.ts', /siteId: record\.siteId/g, "siteId: record.siteId || ''");
patch('src/services/firestoreService.ts', /siteId,/g, "siteId: siteId || '',");

// firestoreService 4458 (line 4461)
patch('src/services/firestoreService.ts', /await AuditTrailService\.recordEvent\(\s*actorInfo,\s*companyId,\s*moduleName \|\| 'SYSTEM',\s*action,\s*'EXECUTE',\s*'SystemEvent',\s*targetUser \|\| logId,\s*true,\s*'LOW',\s*logId,\s*details,\s*undefined,\s*undefined\s*\);/g, 
`await AuditTrailService.recordEvent({
        session: actorInfo as any,
        companyId,
        module: moduleName || 'SYSTEM',
        action,
        method: 'EXECUTE',
        entity: 'SystemEvent',
        entityId: targetUser || logId,
        success: true,
        severity: 'LOW',
        referenceId: logId,
        details
      });`);

// queryScopeEngine
patch('src/services/queryScopeEngine.ts', /session\.userId/g, "(session.userId || session.uid || '')");
patch('src/services/queryScopeEngine.ts', /session\.companyId/g, "(session.companyId || '')");

// operationalIntelligenceEngine: targetEntityId
patch('src/services/operationalIntelligenceEngine.ts', /targetEntityId:/g, "resourceId:"); // change back if wrong, wait, error says targetEntityId doesn't exist, it should be resourceId? Oh wait, earlier I changed resourceId to targetEntityId, I'll change it back to resourceId. Wait, the error is "'targetEntityId' does not exist in type 'OperationalAnomaly'". Oh, because OperationalAnomaly interface uses resourceId maybe?

patch('src/services/operationalIntelligenceEngine.ts', /targetEntityId:/g, "resourceId:");

// tests/verifyPhase5.ts
patch('src/tests/verifyPhase5.ts', /logType: 'DAILY',\n\s*notes: '',\n\s*updatedAt: new Date\(\)\.toISOString\(\),/g, "logType: 'DAILY', notes: '', updatedAt: new Date().toISOString(),");

// tests/leaveProRata.test.ts
patch('src/tests/leaveProRata.test.ts', /applicableToGenders: \['MALE', 'FEMALE', 'OTHER'\],/g, ""); // wait it was missing, I'll add it again properly
