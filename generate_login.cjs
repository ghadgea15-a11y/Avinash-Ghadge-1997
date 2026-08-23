const fs = require('fs');

const file = 'src/components/screens/LoginScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// I will just use sed or string replacement to inject the state machine.
