import * as fs from 'fs';

['SemiSkilledDashboard.tsx', 'SupportStaffDashboard.tsx'].forEach(filename => {
  let content = fs.readFileSync('src/components/screens/dashboards/' + filename, 'utf-8');

  // Fix state
  content = content.replace(
    "const [loading, setLoading] = useState(true);",
    "const [tasks, setTasks] = useState<TaskRecord[]>([]);\n  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);\n  const [loading, setLoading] = useState(true);"
  );

  // Fix CheckSquare import for SupportStaffDashboard
  if (filename === 'SupportStaffDashboard.tsx') {
    content = content.replace(
      "import { Clock, AlertTriangle, Mails } from 'lucide-react';",
      "import { Clock, AlertTriangle, Mails, CheckSquare } from 'lucide-react';"
    );
  }

  // Also I noticed subscriptions might have failed if it was just unsub instead of unsubs
  fs.writeFileSync('src/components/screens/dashboards/' + filename, content);
});
