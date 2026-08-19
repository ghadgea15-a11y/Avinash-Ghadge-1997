import re

with open('src/components/operations/ShiftHandover.tsx', 'r') as f:
    content = f.read()

# Remove all metrics blocks
content = re.sub(r"const \[metrics, setMetrics\].*?\}, \[session\?\.companyId, formData\.siteId\]\);\n", "", content, flags=re.DOTALL)

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

content = re.sub(r"(  const \[formData, setFormData\] = useState\(\{.*?\n  \}\);)", r"\1\n\n" + state_addition.strip(), content, flags=re.DOTALL)

with open('src/components/operations/ShiftHandover.tsx', 'w') as f:
    f.write(content)
