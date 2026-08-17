import * as fs from 'fs';

let content = fs.readFileSync('src/types/index.ts', 'utf-8');

// I will just download index.ts from original if possible or clean duplicates manually.
// Let's clean up index.ts by replacing the duplicate IncidentReportRecord and DailySiteLogRecord.
// Let's just find the last block of added types and remove it?
// Actually I will manually replace the file because there are duplicates.
