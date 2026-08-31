const fs = require('fs');
let content = fs.readFileSync('src/components/common/TabletNavigationRail.tsx', 'utf8');
content = content.replace(/userSession,\n  session: UserSession \| null;/g, "session: UserSession | null;");
content = content.replace(/userSession,/g, "session,");
fs.writeFileSync('src/components/common/TabletNavigationRail.tsx', content);

