import * as fs from 'fs';

// 1. AnnouncementsScreen
let ann = fs.readFileSync('src/components/screens/AnnouncementsScreen.tsx', 'utf-8');
ann = ann.replace("updatedAt: new Date().toISOString()", "");
ann = ann.replace("...newAnn, title:", "...newAnn, message:"); // already done probably, let's use regex to replace all
ann = ann.replace(/title: e\.target\.value/g, 'message: e.target.value');
ann = ann.replace(/content: e\.target\.value/g, "message: e.target.value + ' '"); // avoid duplicate keys if same
fs.writeFileSync('src/components/screens/AnnouncementsScreen.tsx', ann);

// 2. SiteOperationsScreen
let siteOps = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf-8');
siteOps = siteOps.replace(
  "{ siteId: '', title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '' }",
  "{ siteId: '', title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '', type: 'INCIDENT' as const }"
);
siteOps = siteOps.replace(
  "createdAt: Date.now()",
  "createdAt: new Date().toISOString()"
);
siteOps = siteOps.replace(
  "createdAt: Date.now()",
  "createdAt: new Date().toISOString()"
);
fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', siteOps);

// 3. TaskRecord in src/types/index.ts (remove updatedAt if I added it? Let's just add it as optional string)
let types = fs.readFileSync('src/types/index.ts', 'utf-8');
if (!types.includes("updatedAt?: string;")) {
  types = types.replace(
    "createdAt: number;",
    "createdAt: number;\n  updatedAt?: string;"
  );
}
fs.writeFileSync('src/types/index.ts', types);

