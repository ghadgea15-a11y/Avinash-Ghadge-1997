const fs = require('fs');
let content = fs.readFileSync('src/components/crm/CrmExpiryAlerts.tsx', 'utf8');

const replacement = `
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [company.companyId]);

  const processNotifications = async () => {
    setProcessing(true);
    try {
      await contractExpiryEngine.processPendingNotifications(company.companyId);
      await loadEvents();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const loadEvents = async () => {
`;

content = content.replace(
  "  useEffect(() => {\n    loadEvents();\n  }, [company.companyId]);\n\n  const loadEvents = async () => {",
  replacement
);

const buttonHtml = `
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Active Expiration Alerts
        </h3>
        <div className="flex items-center gap-3">
          <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">
            {events.length} Alerts
          </span>
          {events.some(e => e.status === 'PENDING_NOTIFICATION') && (
            <button 
              onClick={processNotifications}
              disabled={processing}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Send Notifications'}
            </button>
          )}
        </div>
      </div>
`;

content = content.replace(
  /<div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">[\s\S]*?<\/div>/m,
  buttonHtml
);

fs.writeFileSync('src/components/crm/CrmExpiryAlerts.tsx', content);
