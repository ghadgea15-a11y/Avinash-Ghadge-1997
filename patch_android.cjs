const fs = require('fs');
let code = fs.readFileSync('android/app/build.gradle.kts', 'utf8');

code = code.replace(/compileSdk = 36/g, 'compileSdk = 34');
code = code.replace(/targetSdk = 36/g, 'targetSdk = 34');

fs.writeFileSync('android/app/build.gradle.kts', code);
console.log('Android Patched');
