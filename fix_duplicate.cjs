const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// The file was duplicated because code.substring(0) appended the whole file.
// So the file currently looks like:
// [0..startIdx of recordStockTransaction] + replacement + [ENTIRE ORIGINAL FILE starting from 0]
// Wait, startIdx of recordStockTransaction was around line 6379.
// The string "static async recordStockTransaction" should now appear TWICE.
const marker = "static async recordStockTransaction";
const firstOcc = code.indexOf(marker);
const secondOcc = code.indexOf(marker, firstOcc + 1);

if (secondOcc !== -1) {
    // The entire original file starts somewhere before the second occurrence.
    // Specifically, the original file started with imports.
    // Let's find the first 'import ' after the replacement.
    const importMarker = "import {";
    const secondImport = code.indexOf(importMarker, firstOcc);
    if (secondImport !== -1) {
        // The file got appended from index 0.
        // So from `secondImport` onwards is the original file.
        // But wait! We wanted to replace `recordStockTransaction`.
        // So the correct file should be:
        // code.substring(0, secondImport) + the rest of the original file AFTER the original recordStockTransaction?
        // No, the original file is intact starting at `secondImport`.
        // Let's just grab the original file (from secondImport to end),
        // and then we can correctly apply the replacement.
        const originalFile = code.substring(secondImport);
        fs.writeFileSync('src/services/firestoreService.ts', originalFile);
        console.log("Restored original file!");
    } else {
        console.log("Could not find second import");
    }
} else {
    console.log("Did not find two occurrences.");
}
