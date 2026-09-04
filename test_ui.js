const fs = require('fs');

// We are going to look for any instances where we try to render objects or undefined values incorrectly in RosterScheduler or ShiftMaster.
let roster = fs.readFileSync('src/components/wfm/RosterScheduler.tsx', 'utf8');
let shift = fs.readFileSync('src/components/wfm/ShiftMaster.tsx', 'utf8');

console.log("Roster Length:", roster.length);
console.log("Shift Length:", shift.length);
