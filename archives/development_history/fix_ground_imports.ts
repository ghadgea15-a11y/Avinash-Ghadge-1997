import * as fs from 'fs';

['SemiSkilledDashboard.tsx', 'SupportStaffDashboard.tsx'].forEach(filename => {
  let content = fs.readFileSync('src/components/screens/dashboards/' + filename, 'utf-8');

  content = content.replace(
    "PhaseAScreen, AttendanceLogRecord",
    "PhaseAScreen, AttendanceLogRecord, TaskRecord, AnnouncementRecord"
  );
  
  if (filename === 'SupportStaffDashboard.tsx') {
    content = content.replace(
      "import { Clock, AlertTriangle, Mails, CheckSquare } from 'lucide-react';",
      "import { Clock, AlertTriangle, Mails, CheckSquare } from 'lucide-react';"
    );
    // Let's just do a blanket replace if it missed
    content = content.replace(
      "import { Clock, AlertTriangle, Mails } from 'lucide-react';",
      "import { Clock, AlertTriangle, Mails, CheckSquare } from 'lucide-react';"
    );
  }

  if (filename === 'SemiSkilledDashboard.tsx') {
     content = content.replace(
      "import { Clock, AlertTriangle } from 'lucide-react';",
      "import { Clock, AlertTriangle, CheckSquare } from 'lucide-react';"
     );
  }

  fs.writeFileSync('src/components/screens/dashboards/' + filename, content);
});
