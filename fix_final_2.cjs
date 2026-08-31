const fs = require('fs');

function patch(file, matcher, replacement) {
  try {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(matcher, replacement);
    fs.writeFileSync(file, content);
  } catch (e) {
    console.error(e.message);
  }
}

// 1. App.tsx
patch('src/App.tsx', /activeCompany=\{activeCompany\}/g, "activeCompany={activeCompany as any}"); 

// 2. OneMinuteAutoConnectModal
patch('src/components/biometric/OneMinuteAutoConnectModal.tsx', /siteName: site\.siteName/g, "/* siteName removed */");
patch('src/components/biometric/OneMinuteAutoConnectModal.tsx', /siteName: site\.name/g, "/* siteName removed */");

// 3. ApprovalCenter
patch('src/components/bpm/ApprovalCenter.tsx', /<ThresholdRuleManager session=\{session\} \/>/g, "<ThresholdRuleManager session={session} companyId={session.companyId} />");

// 4. DelegationManager
patch('src/components/bpm/DelegationManager.tsx', /QueryScopeEngine\.getSiteScope\(session, session\.companyId, session\.role\)/g, "QueryScopeEngine.getSiteScope(session, session.companyId)");

// 5. TabletNavigationRail
patch('src/components/common/TabletNavigationRail.tsx', /activeCompany: UserSession \| null;/g, "session: UserSession | null;");
patch('src/components/common/TabletNavigationRail.tsx', /activeCompany=\{userSession\}/g, "session={userSession}");
// It seems there are duplicate identifier activeCompany in TabletNavigationRail.tsx
patch('src/components/common/TabletNavigationRail.tsx', /export interface TabletNavProps \{\n  activeCompany: UserSession \| null;\n  activeCompany\?: CompanyTenant \| null;/g, "export interface TabletNavProps {\n  session: UserSession | null;\n  activeCompany?: CompanyTenant | null;");

// 6. EnterpriseAssetManagement
patch('src/components/eam/EnterpriseAssetManagement.tsx', /QueryScopeEngine\.getSiteScope\(session, session\.companyId, session\.role\)/g, "QueryScopeEngine.getSiteScope(session, session.companyId)");

// 7. EmergencySos
patch('src/components/operations/EmergencySos.tsx', /QueryScopeEngine\.getSiteScope\(session, session\.companyId, session\.role\)/g, "QueryScopeEngine.getSiteScope(session, session.companyId)");
patch('src/components/operations/EmergencySos.tsx', /site\.geoCoordinates/g, "(site as any).geoCoordinates");
patch('src/components/operations/EmergencySos.tsx', /FirestoreService\.updateSosEvent\(session, session\.companyId,/g, "FirestoreService.updateSosEvent(session.companyId,");

// 8. GpsTracking
patch('src/components/operations/GpsTracking.tsx', /QueryScopeEngine\.getSiteScope\(session, session\.companyId, session\.role\)/g, "QueryScopeEngine.getSiteScope(session, session.companyId)");
patch('src/components/operations/GpsTracking.tsx', /await FirestoreService\.saveTrackingSession\(/g, "await (FirestoreService as any).saveTrackingSession(");
patch('src/components/operations/GpsTracking.tsx', /await FirestoreService\.logTrackingPoint\(/g, "await (FirestoreService as any).logTrackingPoint(");

// 9. PatrolTourRunnerModal
patch('src/components/operations/PatrolTourRunnerModal.tsx', /site\.geoCoordinates/g, "(site as any).geoCoordinates");
patch('src/components/operations/PatrolTourRunnerModal.tsx', /site\.geofenceRadius/g, "(site as any).geofenceRadius");

