const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const newContent = content.replace(
/const isMainAppScreen = \[[\s\S]*?\]\.includes\(currentScreen\);/m,
`const isMainAppScreen = ![
    'LANDING',
    'LOGIN',
    'PLATFORM_LOGIN',
    'SIGN_UP',
    'FORGOT_PASSWORD',
    'COMPANY_CODE',
    'SPLASH',
    'UPDATE_CHECKER',
    'APPROVAL_PENDING',
    'SESSION_LOCK',
    'LEGAL_POLICIES',
    'KOTLIN_CODE_VIEWER'
  ].includes(currentScreen);`
);

if (content === newContent) {
  console.log("No change!");
} else {
  fs.writeFileSync('src/App.tsx', newContent);
  console.log("Updated App.tsx");
}
