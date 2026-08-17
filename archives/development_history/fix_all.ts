import * as fs from 'fs';

// 1. Fix AnnouncementsScreen.tsx
let annScreen = fs.readFileSync('src/components/screens/AnnouncementsScreen.tsx', 'utf-8');
annScreen = annScreen.replace(
  "useState<Partial<AnnouncementRecord>>({ title: '', content: '' });",
  "useState<Partial<AnnouncementRecord>>({ message: '', priority: 'NORMAL' });"
);
annScreen = annScreen.replace(
  "if (!newAnn.title || !newAnn.content) return;",
  "if (!newAnn.message) return;"
);
annScreen = annScreen.replace(
  "title: newAnn.title,",
  "targetAudience: 'ALL',\n      priority: newAnn.priority as any,"
);
annScreen = annScreen.replace(
  "content: newAnn.content,",
  "message: newAnn.message || '',\n      expiresAt: Date.now() + 86400000 * 7," // 7 days
);
annScreen = annScreen.replace(
  "setNewAnn({ title: '', content: '' });",
  "setNewAnn({ message: '', priority: 'NORMAL' });"
);
annScreen = annScreen.replace(
  /newAnn\.title/g,
  "newAnn.message"
);
annScreen = annScreen.replace(
  /newAnn\.content/g,
  "newAnn.message"
);
annScreen = annScreen.replace(
  /<h3 className="font-bold text-lg">\{ann\.title\}<\/h3>/g,
  `<h3 className="font-bold text-lg">Announcement</h3>`
);
annScreen = annScreen.replace(
  /<p className="text-slate-600 whitespace-pre-wrap">\{ann\.content\}<\/p>/g,
  `<p className="text-slate-600 whitespace-pre-wrap">{ann.message}</p>`
);

fs.writeFileSync('src/components/screens/AnnouncementsScreen.tsx', annScreen);

// 2. Fix MyTasksScreen.tsx
let myTasks = fs.readFileSync('src/components/screens/MyTasksScreen.tsx', 'utf-8');
myTasks = myTasks.replace(
  "StorageService.uploadFile(file, `companies/${company.companyId}/task-proofs`)",
  "StorageService.uploadFile(`companies/${company.companyId}/task-proofs/${file.name}`, file)"
);
fs.writeFileSync('src/components/screens/MyTasksScreen.tsx', myTasks);

// 3. Fix TaskManagementScreen.tsx
let tm = fs.readFileSync('src/components/screens/TaskManagementScreen.tsx', 'utf-8');
tm = tm.replace(
  "createdAt: Date.now(),\n      updatedAt: new Date().toISOString()",
  "createdAt: Date.now()"
);
fs.writeFileSync('src/components/screens/TaskManagementScreen.tsx', tm);

