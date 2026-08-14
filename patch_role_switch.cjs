const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(
  '  const handleRoleSwitch = (newRole: UserRole) => {\n    if (!userSession) return;\n    const updatedSession: UserSession = {\n      ...userSession,\n      role: newRole\n    };\n    setUserSession(updatedSession);\n    SessionManager.setUserSession(updatedSession);\n  };',
  '  const handleRoleSwitch = (newRole: UserRole) => {\n    if (!userSession) return;\n    const updatedSession: UserSession = {\n      ...userSession,\n      role: newRole\n    };\n    setUserSession(updatedSession);\n    SessionManager.setUserSession(updatedSession);\n    if (newRole === "SUPER_ADMIN") {\n      setCurrentScreen("SUPER_ADMIN_DASHBOARD");\n    } else if (newRole === "GUARD" || newRole === "FIELD_OFFICER") {\n      setCurrentScreen("ATTENDANCE_SHIFTS");\n    } else {\n      setCurrentScreen("EMPLOYEES");\n    }\n  };'
);

fs.writeFileSync('src/App.tsx', file);
console.log('Role switch patched');
