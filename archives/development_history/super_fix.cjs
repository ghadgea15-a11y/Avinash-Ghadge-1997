const fs = require('fs');

function restoreBackticks(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  
  // This regex finds className={ ... } blocks that contain ${ ... }
  // We want to wrap the inside with backticks.
  text = text.replace(/className=\{([^}]+?\$\{[^}]+\}[^}]*?)\}/g, (match, inner) => {
    // If it already has backticks at the start/end, leave it alone.
    if (inner.trim().startsWith('`') && inner.trim().endsWith('`')) {
      return match;
    }
    // Otherwise wrap it in backticks.
    return 'className={`' + inner + '`}';
  });

  fs.writeFileSync(filePath, text);
}

restoreBackticks('src/components/common/NavigationDrawer.tsx');
