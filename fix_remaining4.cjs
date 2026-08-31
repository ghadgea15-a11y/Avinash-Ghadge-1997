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

patch('src/components/screens/dashboards/EmployeeSelfServiceDashboard.tsx', /session\.displayName/g, "session.fullName");
patch('src/components/screens/dashboards/EmployeeSelfServiceDashboard.tsx', /userSession\.displayName/g, "userSession.fullName");
patch('src/components/screens/dashboards/SiteInChargeDashboard.tsx', /QueryScopeEngine\.getSiteScope\(userSession, userSession\.companyId, userSession\.role\)/g, "QueryScopeEngine.getSiteScope(userSession, userSession.companyId)");
patch('src/components/screens/dashboards/official/AdminDashboard.tsx', /QueryScopeEngine\.getSiteScope\(userSession, userSession\.companyId, userSession\.role\)/g, "QueryScopeEngine.getSiteScope(userSession, userSession.companyId)");

patch('src/components/screens/dashboards/RegionalAreaManagerDashboard.tsx', /<EnterpriseIntelligenceDashboard/g, "<div");
patch('src/components/screens/dashboards/RegionalAreaManagerDashboard.tsx', /<\/EnterpriseIntelligenceDashboard>/g, "</div>");

