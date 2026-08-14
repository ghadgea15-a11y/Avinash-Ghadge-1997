const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');

const replaceStr = `if (session.role === 'SUPER_ADMIN') {
                              setCurrentScreen('SUPER_ADMIN_DASHBOARD');
                            } else if (session.role === 'GUARD' || session.role === 'FIELD_OFFICER') {
                              setCurrentScreen('ATTENDANCE_SHIFTS');
                            } else {
                              setCurrentScreen('EMPLOYEES');
                            }`;

file = file.replace(/if \(session\.role === 'SUPER_ADMIN'\) \{\n\s*setCurrentScreen\('SUPER_ADMIN_DASHBOARD'\);\n\s*\} else \{\n\s*setCurrentScreen\('EMPLOYEES'\);\n\s*\}/g, replaceStr);

fs.writeFileSync('src/App.tsx', file);
console.log('App route patched');
