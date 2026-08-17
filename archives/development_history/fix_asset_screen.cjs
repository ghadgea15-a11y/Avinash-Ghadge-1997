const fs = require('fs');

let code = fs.readFileSync('src/components/screens/AssetTrackingScreen.tsx', 'utf8');

code = code.replace(
  /const success = await FirestoreService.saveAsset\(\s*companyId,\s*payload,\s*\{ uid: userSession.userId, name: userSession.fullName \}\s*\);/g,
  `const success = await FirestoreService.saveAsset(
      companyId,
      payload,
      { uid: userSession.userId, name: userSession.fullName },
      editingAsset || undefined
    );`
);

fs.writeFileSync('src/components/screens/AssetTrackingScreen.tsx', code);
