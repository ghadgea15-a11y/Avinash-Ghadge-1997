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

// SupervisorRollCall
patch('src/components/wfm/SupervisorRollCall.tsx', /'HALF_DAY'/g, "'HALFDAY'");
patch('src/components/wfm/OvertimeDashboard.tsx', /approvedMinutes: any/g, "approvedMinutes: number");

