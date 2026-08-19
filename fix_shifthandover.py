import re

with open('src/components/operations/ShiftHandover.tsx', 'r') as f:
    content = f.read()

import_addition = """
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
"""

# Insert imports
content = re.sub(r"import \{ (.*?) \} from 'lucide-react';", r"import { \1 } from 'lucide-react';\n" + import_addition.strip(), content)

state_addition = """
  const [metrics, setMetrics] = useState({ incidents: 0, visitors: 0, workOrders: 0 });

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!session?.companyId || !formData.siteId) return;
      try {
        const incSnap = await getCountFromServer(query(collection(db, 'companies', session.companyId, 'incident_reports'), where('siteId', '==', formData.siteId), where('status', 'in', ['OPEN', 'INVESTIGATING'])));
        const visSnap = await getCountFromServer(query(collection(db, 'companies', session.companyId, 'visitor_logs'), where('siteId', '==', formData.siteId), where('status', '==', 'CHECKED_IN')));
        const woSnap = await getCountFromServer(query(collection(db, 'companies', session.companyId, 'work_orders'), where('siteId', '==', formData.siteId), where('status', 'in', ['SUBMITTED', 'IN_PROGRESS', 'APPROVED'])));
        
        setMetrics({
          incidents: incSnap.data().count,
          visitors: visSnap.data().count,
          workOrders: woSnap.data().count
        });
      } catch (err) {
        console.error('Failed to fetch metrics', err);
      }
    };
    fetchMetrics();
  }, [session?.companyId, formData.siteId]);
"""

# Insert state
content = re.sub(r"  const \[formData, setFormData\] = useState\(\{", state_addition.strip() + r"\n\n  const [formData, setFormData] = useState({", content)

# Replace hardcoded counts
content = content.replace("0 Open Incidents", "{metrics.incidents} Open Incidents")
content = content.replace("0 Active Visitors", "{metrics.visitors} Active Visitors")
content = content.replace("0 Pending Work Orders", "{metrics.workOrders} Pending Work Orders")

with open('src/components/operations/ShiftHandover.tsx', 'w') as f:
    f.write(content)
