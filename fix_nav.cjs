const fs = require('fs');
let code = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');

// For navigation drawer, all className={...} where it should be a template literal
// Let's replace any `className={w-full` with `className={\`w-full`
// and `className={w-5` with `className={\`w-5`
// But we need to close the backtick before the closing brace!
// It's much easier to do it manually.

let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('className={w-full') || lines[i].includes('className={w-5') || lines[i].includes('className={w-6') || lines[i].includes('className={flex') || lines[i].includes('className={text-') || lines[i].includes('className={px-')) {
     lines[i] = lines[i].replace(/className=\{([^}]+)\$\{/g, 'className={`$1${');
  }
  // If the line has '}' and the previous line or this line was an unclosed template literal...
  // A better heuristic: if the line ends with '}}' or '}}>' we can replace with '}`}'
}
code = lines.join('\n');

// Also fix the ends of the template literals
code = code.replace(/                  \}\}/g, '                  }`}')
           .replace(/\n              \}\}/g, '\n              }`}')
           .replace(/\}\}\`/g, '}`}');

// It's probably easier to just download the original NavigationDrawer and append the 3 lines!
