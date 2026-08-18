const fs = require('fs');
let text = fs.readFileSync('src/components/crm/SlaBreachList.tsx', 'utf8');
text = text.replace("import { AlertTriangle, Clock, AlertCircle } from 'lucide-react';", "import { AlertTriangle, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';");
text = text.replace("import { CheckCircle2 } from 'lucide-react';\n", "");
fs.writeFileSync('src/components/crm/SlaBreachList.tsx', text);
