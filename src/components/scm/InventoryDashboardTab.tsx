import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, StockBalanceRecord, InventoryItemRecord, InventoryAlertRecord } from '../../types';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { AlertTriangle, CheckCircle, Package, TrendingDown, ArrowUpRight } from 'lucide-react';

export function InventoryDashboardTab({ session, company }: { session: UserSession, company: CompanyTenant }) {
  const [alerts, setAlerts] = useState<InventoryAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const q = query(
        collection(db, 'companies', company.companyId, 'inventory_alerts'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setAlerts(snap.docs.map(d => d.data() as InventoryAlertRecord));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, [company.companyId]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const ref = doc(db, 'companies', company.companyId, 'inventory_alerts', alertId);
      await updateDoc(ref, {
        acknowledged: true,
        acknowledgedByUid: session.userId,
        acknowledgedByName: session.fullName,
        acknowledgedAt: new Date().toISOString()
      });
      loadAlerts();
    } catch (e: any) { alert(e.message); }
  };

  const unacknowledged = alerts.filter(a => !a.acknowledged);

  return (
    <div className="flex h-full flex-col space-y-6">
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Alerts" value={alerts.length} icon={<AlertTriangle className="h-5 w-5" />} color="blue" />
        <MetricCard title="Unacknowledged" value={unacknowledged.length} icon={<TrendingDown className="h-5 w-5" />} color="orange" />
        <MetricCard title="Critical Stock" value={unacknowledged.filter(a => a.newStatus === 'CRITICAL_STOCK').length} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
        <MetricCard title="Out of Stock" value={unacknowledged.filter(a => a.newStatus === 'OUT_OF_STOCK').length} icon={<Package className="h-5 w-5" />} color="purple" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900">Alert History & Status</h3>
      </div>

      <div className="flex-1 rounded-md border border-slate-200 bg-white shadow-sm overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium text-right">Qty</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Ack</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alerts.map(a => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {new Date(a.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{a.itemName}</td>
                <td className="px-4 py-3 text-slate-600">{a.locationId}</td>
                <td className="px-4 py-3 text-slate-600">
                  {a.previousStatus} &rarr; {a.newStatus}
                </td>
                <td className="px-4 py-3 text-right font-medium">{a.currentQuantity}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold 
                    ${a.newStatus === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-800' : 
                      a.newStatus === 'CRITICAL_STOCK' ? 'bg-orange-100 text-orange-800' :
                      a.newStatus === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'}`}>
                    {a.newStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.acknowledged ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" /> By {a.acknowledgedByName?.split(' ')[0]}
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleAcknowledge(a.id)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Acknowledge
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {alerts.length === 0 && !loading && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No alerts found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: 'blue'|'orange'|'red'|'purple' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mr-4 flex h-10 w-10 items-center justify-center rounded-lg ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
