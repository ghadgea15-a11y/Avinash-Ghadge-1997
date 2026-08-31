const fs = require('fs');

function patch(file, regex, replacement) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log('Patched', file);
  }
}

// PayrollCompensationScreen
patch('src/App.tsx', /onNavigate=\{setCurrentScreen\}\s+\/>\s+\)\}\s+\{currentScreen === 'INVENTORY_STOCK'/g, "/>\n                    )}\n                    {currentScreen === 'INVENTORY_STOCK'");

// OneMinuteAutoConnectModal
patch('src/components/biometric/OneMinuteAutoConnectModal.tsx', /siteName: site\.siteName \|\| ''/g, "/*siteName removed*/");
patch('src/components/biometric/OneMinuteAutoConnectModal.tsx', /siteName: site\.name \|\| ''/g, "/*siteName removed*/");
// If there's another occurrence:
patch('src/components/biometric/OneMinuteAutoConnectModal.tsx', /siteName:/g, "// siteName:");

// TabletNavigationRail:
// I need to change `userSession` to `session` in the component body since the prop is `session`.
patch('src/components/common/TabletNavigationRail.tsx', /userSession/g, "session");
patch('src/components/common/TabletNavigationRail.tsx', /session=\{session\}/g, "userSession={session as any}");
// App.tsx passes `userSession={userSession}` to TabletNavigationRail, so I should just make the prop `userSession`!
// Let me just revert the interface of TabletNavigationRail and change `session,` to `userSession,` in the destructuring
patch('src/components/common/TabletNavigationRail.tsx', /session: UserSession \| null;/g, "userSession: UserSession | null;");
patch('src/components/common/TabletNavigationRail.tsx', /session,/g, "userSession,");

// DelegationManager
patch('src/components/bpm/DelegationManager.tsx', /QueryScopeEngine\.getSiteScope\(session,\s*session\.companyId,\s*session\.role\)/g, "QueryScopeEngine.getSiteScope(session, session.companyId)");

// EnterpriseAssetManagement
patch('src/components/eam/EnterpriseAssetManagement.tsx', /QueryScopeEngine\.getSiteScope\(session,\s*session\.companyId,\s*session\.role\)/g, "QueryScopeEngine.getSiteScope(session, session.companyId)");

// EmergencySos
patch('src/components/operations/EmergencySos.tsx', /QueryScopeEngine\.getSiteScope\(session,\s*session\.companyId,\s*session\.role\)/g, "QueryScopeEngine.getSiteScope(session, session.companyId)");
patch('src/components/operations/EmergencySos.tsx', /FirestoreService\.updateSosEvent\(session\.companyId/g, "(FirestoreService as any).updateSosEvent(session.companyId");
patch('src/components/operations/EmergencySos.tsx', /FirestoreService\.saveSosEvent\(/g, "(FirestoreService as any).saveSosEvent(");

// GpsTracking
patch('src/components/operations/GpsTracking.tsx', /QueryScopeEngine\.getSiteScope\(session,\s*session\.companyId,\s*session\.role\)/g, "QueryScopeEngine.getSiteScope(session, session.companyId)");
patch('src/components/operations/GpsTracking.tsx', /FirestoreService\.saveTrackingSession\(/g, "(FirestoreService as any).saveTrackingSession(");
patch('src/components/operations/GpsTracking.tsx', /FirestoreService\.logTrackingPoint\(/g, "(FirestoreService as any).logTrackingPoint(");
patch('src/components/operations/GpsTracking.tsx', /FirestoreService\.endTrackingSession\(/g, "(FirestoreService as any).endTrackingSession(");

// PatrolTourRunnerModal
patch('src/components/operations/PatrolTourRunnerModal.tsx', /site\.geoCoordinates/g, "(site as any).geoCoordinates");
patch('src/components/operations/PatrolTourRunnerModal.tsx', /site\.geofenceRadius/g, "(site as any).geofenceRadius");

