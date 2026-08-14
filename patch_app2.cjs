const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{\/\* Mobile Bottom Navigation Bar \(Phone Viewport\) \*\/\}.*?\<BottomNavigationBar.*?\/\>.*?\)}/gs;
file = file.replace(regex, '');

fs.writeFileSync('src/App.tsx', file);
