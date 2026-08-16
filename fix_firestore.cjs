const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// 1. Extract the injected code (from "// ==========================================" down to the end of the file, except the last '}')
const injectStartStr = '  // ==========================================\n  // CLIENT MANAGEMENT (Phase 2F P0)';
const injectStartIndex = code.indexOf(injectStartStr);
if (injectStartIndex === -1) {
  console.log("Could not find injected code");
  process.exit(1);
}
let injectedCode = code.substring(injectStartIndex);
code = code.substring(0, injectStartIndex);

// Remove the extra "}\n" that was appended at the very end
if (injectedCode.endsWith('}\n}')) {
  injectedCode = injectedCode.substring(0, injectedCode.length - 2);
} else if (injectedCode.endsWith('}')) {
  injectedCode = injectedCode.substring(0, injectedCode.length - 1);
}

// 2. Find the end of the FirestoreService class. It's right before "// Indian Rupee Words Helper Function"
const helperStart = '// Indian Rupee Words Helper Function';
const classEndIndex = code.indexOf(helperStart);

let beforeClassEnd = code.substring(0, classEndIndex);
let afterClassEnd = code.substring(classEndIndex);

// 3. Remove the '}' from beforeClassEnd that closes the class
const lastBraceIndex = beforeClassEnd.lastIndexOf('}');
beforeClassEnd = beforeClassEnd.substring(0, lastBraceIndex) + '\n';

// 4. Re-assemble
const newCode = beforeClassEnd + injectedCode + '\n}\n\n' + afterClassEnd;
fs.writeFileSync('src/services/firestoreService.ts', newCode);
console.log("Fixed firestoreService.ts");
