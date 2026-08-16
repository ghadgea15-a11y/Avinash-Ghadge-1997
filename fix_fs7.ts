import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');

// Add updateDoc to firebase/firestore import
content = content.replace("import { \n  collection,", "import { \n  updateDoc,\n  collection,");

// Add TaskRecord, AnnouncementRecord, DocumentRecord to ../types import
content = content.replace("import { \n  AppNotification,", "import { \n  TaskRecord,\n  AnnouncementRecord,\n  DocumentRecord,\n  AppNotification,");

// Add QueryScopeEngine to imports
content = content.replace("import { db, auth } from '../firebase';", "import { db, auth } from '../firebase';\nimport { QueryScopeEngine } from './queryScopeEngine';");

fs.writeFileSync('src/services/firestoreService.ts', content);
