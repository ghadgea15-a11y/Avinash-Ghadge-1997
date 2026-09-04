const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SuperAdminReportsScreen.tsx', 'utf8');

// Find the last </div> before the final </div> </div> ); }
const idx = code.lastIndexOf('</div>\n    </div>\n  );\n};');
if (idx !== -1) {
  code = code.substring(0, idx) + '</div>\n      </>\n      )}\n    </div>\n  );\n};';
  fs.writeFileSync('src/components/screens/SuperAdminReportsScreen.tsx', code);
  console.log('Fixed');
} else {
  console.log('Not found');
}
