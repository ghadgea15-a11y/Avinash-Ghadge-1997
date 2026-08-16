const fs = require('fs');
let srs = fs.readFileSync('src/components/screens/ShiftRosterScreen.tsx', 'utf8');
srs = srs.replace(/emp \? \(emp\.firstName \+ " " \+ emp\.lastName\) \: "" \|\| 'Unknown'/g, 'emp ? (emp.firstName + " " + emp.lastName) : "Unknown"');
fs.writeFileSync('src/components/screens/ShiftRosterScreen.tsx', srs);
