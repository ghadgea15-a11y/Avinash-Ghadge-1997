const fs = require('fs');

let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

file = file.replace(
  '{/* Global Status Banner */}\n      {statusMsg && (\n        <div className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in ${',
  '{/* Global Status Banner */}\n      {statusMsg && (\n        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4 ${'
);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);
console.log('Banner patched');
