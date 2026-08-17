import * as fs from 'fs';

// 1. Update PhaseAScreen in src/types/index.ts
let typesContent = fs.readFileSync('src/types/index.ts', 'utf-8');
typesContent = typesContent.replace(
  "| 'LEGAL_POLICIES';",
  "| 'LEGAL_POLICIES'\n  | 'TASK_MANAGEMENT'\n  | 'ANNOUNCEMENTS'\n  | 'MY_TASKS';"
);
fs.writeFileSync('src/types/index.ts', typesContent);

// 2. Add imports and route rendering in src/App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

const newImports = `
import { TaskManagementScreen } from './components/screens/TaskManagementScreen';
import { AnnouncementsScreen } from './components/screens/AnnouncementsScreen';
import { MyTasksScreen } from './components/screens/MyTasksScreen';
import { SiteOperationsScreen } from './components/screens/SiteOperationsScreen';
`;

appContent = appContent.replace(
  "import { AssetTrackingScreen } from './components/screens/AssetTrackingScreen';",
  "import { AssetTrackingScreen } from './components/screens/AssetTrackingScreen';\n" + newImports
);

const newRoutes = `
      case 'TASK_MANAGEMENT':
        return <TaskManagementScreen userSession={userSession!} company={company!} onNavigate={navigate} />;
      case 'ANNOUNCEMENTS':
        return <AnnouncementsScreen userSession={userSession!} company={company!} onNavigate={navigate} />;
      case 'MY_TASKS':
        return <MyTasksScreen userSession={userSession!} company={company!} onNavigate={navigate} />;
`;

// Site operations might already be there
if (!appContent.includes("case 'SITE_OPERATIONS':")) {
    appContent = appContent.replace(
      "case 'ASSET_TRACKING':",
      "case 'ASSET_TRACKING':\n" + newRoutes + "\n      case 'SITE_OPERATIONS':\n        return <SiteOperationsScreen userSession={userSession!} company={company!} onNavigate={navigate} />;"
    );
} else {
    appContent = appContent.replace(
      "case 'ASSET_TRACKING':",
      "case 'ASSET_TRACKING':\n" + newRoutes
    );
}

fs.writeFileSync('src/App.tsx', appContent);
