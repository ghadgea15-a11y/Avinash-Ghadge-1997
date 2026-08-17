import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');

content = content.replace(
  "const q = QueryScopeEngine.getScopedQuery<TaskRecord>(userSession, companyId, 'tasks');",
  "const colRef = collection(db, 'companies', companyId, 'tasks');\n    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'TASKS'));"
);

content = content.replace(
  "const q = QueryScopeEngine.getScopedQuery<AnnouncementRecord>(userSession, companyId, 'announcements');",
  "const colRef = collection(db, 'companies', companyId, 'announcements');\n    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'ANNOUNCEMENTS'));"
);

content = content.replace(
  "const q = QueryScopeEngine.getScopedQuery<DocumentRecord>(userSession, companyId, 'documents');",
  "const colRef = collection(db, 'companies', companyId, 'documents');\n    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'DOCUMENTS'));"
);

fs.writeFileSync('src/services/firestoreService.ts', content);
