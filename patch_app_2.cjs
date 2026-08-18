const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "{currentScreen === 'INVENTORY_STOCK' && (\n                      {activeCompany && <ScmModule session={userSession} company={activeCompany} />}\n                    )}",
  "{currentScreen === 'INVENTORY_STOCK' && activeCompany && (\n                      <ScmModule session={userSession} company={activeCompany} />\n                    )}"
);

fs.writeFileSync('src/App.tsx', code);
