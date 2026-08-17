import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  QrCode, 
  Boxes, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  RotateCcw, 
  Camera, 
  Clock, 
  AlertTriangle,
  Play,
  FileSpreadsheet,
  Download,
  Flame,
  Activity
} from 'lucide-react';

export const InteractiveDemoSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workforce' | 'operations' | 'security' | 'assets' | 'inventory' | 'analytics'>('workforce');

  // Workforce Interactive State
  const [musterStaff, setMusterStaff] = useState([
    { id: 1, name: 'Suresh Patil', role: 'Security Supervisor', status: 'Present', time: '06:55 AM', geo: 'Verified (Site A)' },
    { id: 2, name: 'Ramesh Shinde', role: 'Main Gate Guard', status: 'Present', time: '07:02 AM', geo: 'Verified (Site A)' },
    { id: 3, name: 'Amit Kumar', role: 'DG Technician', status: 'Late', time: '07:18 AM', geo: 'Verified (Site A)' },
    { id: 4, name: 'Vikas Jadhav', role: 'Perimeter Patrol', status: 'Absent', time: '--', geo: 'Relief Dispatched' },
    { id: 5, name: 'Rahul Deshmukh', role: 'CCTV Operator', status: 'Present', time: '06:58 AM', geo: 'Verified (Site A)' }
  ]);

  // Operations Interactive State
  const [dgRunningHours, setDgRunningHours] = useState('1482.4');
  const [dgDiesel, setDgDiesel] = useState('420');
  const [dgStatus, setDgStatus] = useState<'optimal' | 'logged'>('optimal');

  // Security Interactive State
  const [patrolPoints, setPatrolPoints] = useState([
    { id: 'CP-1', name: 'Main Server Room', scanned: true, time: '08:04:12' },
    { id: 'CP-2', name: 'High Voltage Yard', scanned: true, time: '08:14:50' },
    { id: 'CP-3', name: 'Emergency Exit #4', scanned: false, time: '--' },
    { id: 'CP-4', name: 'Raw Material Store', scanned: false, time: '--' }
  ]);

  const toggleStaffStatus = (id: number) => {
    setMusterStaff(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'Present' ? 'Absent' : s.status === 'Absent' ? 'Late' : 'Present';
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  const handleScanNextCheckpoint = () => {
    const unscanned = patrolPoints.find(p => !p.scanned);
    if (unscanned) {
      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      setPatrolPoints(prev => prev.map(p => p.id === unscanned.id ? { ...p, scanned: true, time: now } : p));
    }
  };

  const resetDemo = () => {
    setMusterStaff([
      { id: 1, name: 'Suresh Patil', role: 'Security Supervisor', status: 'Present', time: '06:55 AM', geo: 'Verified (Site A)' },
      { id: 2, name: 'Ramesh Shinde', role: 'Main Gate Guard', status: 'Present', time: '07:02 AM', geo: 'Verified (Site A)' },
      { id: 3, name: 'Amit Kumar', role: 'DG Technician', status: 'Late', time: '07:18 AM', geo: 'Verified (Site A)' },
      { id: 4, name: 'Vikas Jadhav', role: 'Perimeter Patrol', status: 'Absent', time: '--', geo: 'Relief Dispatched' },
      { id: 5, name: 'Rahul Deshmukh', role: 'CCTV Operator', status: 'Present', time: '06:58 AM', geo: 'Verified (Site A)' }
    ]);
    setPatrolPoints([
      { id: 'CP-1', name: 'Main Server Room', scanned: true, time: '08:04:12' },
      { id: 'CP-2', name: 'High Voltage Yard', scanned: true, time: '08:14:50' },
      { id: 'CP-3', name: 'Emergency Exit #4', scanned: false, time: '--' },
      { id: 'CP-4', name: 'Raw Material Store', scanned: false, time: '--' }
    ]);
    setDgStatus('optimal');
  };

  const tabs = [
    { id: 'workforce', label: 'Workforce', icon: Users },
    { id: 'operations', label: 'Operations', icon: Building2 },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'assets', label: 'Assets', icon: QrCode },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <section id="demo" className="py-24 lg:py-32 bg-[#F4F3EF] border-b border-[#E8E7E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D4D4D8] bg-white text-[11px] font-mono font-bold tracking-widest text-[#0A0D14] uppercase">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Interactive Application Sandbox</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#0A0D14] tracking-tight">
            SEE THE PLATFORM IN ACTION.
          </h2>

          <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
            Test live operational workflows directly in this interactive preview. Experience real-time shift muster roll-calls, guard patrol routing, and telemetry logging.
          </p>
        </div>

        {/* Demo Stage Container */}
        <div className="bg-white rounded-3xl border border-[#E7E6E1] shadow-lg overflow-hidden">
          
          {/* Top Control Bar: Tab Navigation & Demo Status */}
          <div className="bg-[#0A0D14] text-white p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#27272A]">
            
            {/* Demo Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3.5 py-2 rounded-xl font-body text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#18181B] text-slate-300 hover:bg-[#27272A] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Demo Watermark & Reset Button */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/30">
                PRODUCT DEMONSTRATION &bull; DEMO DATA
              </span>
              <button
                onClick={resetDemo}
                className="p-1.5 rounded-lg bg-[#27272A] text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Reset simulation data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Interactive Tab Body */}
          <div className="p-6 sm:p-10 font-body">
            
            {/* 1. WORKFORCE MUSTER DEMO */}
            {activeTab === 'workforce' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E7E3]">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0A0D14]">
                      Morning Shift Muster Roll-Call &bull; Site Alpha
                    </h3>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Click any status badge to toggle between Present, Late, and Absent.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      GEOFENCE: 150m (ACTIVE)
                    </span>
                    <span className="text-[#0A0D14] bg-[#F4F3EF] px-2.5 py-1 rounded">
                      PRESENT: {musterStaff.filter(s => s.status === 'Present').length} / {musterStaff.length}
                    </span>
                  </div>
                </div>

                {/* Interactive Muster Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E8E7E3] text-[#71717A] font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-3">Employee Name</th>
                        <th className="py-2.5 px-3">Designation</th>
                        <th className="py-2.5 px-3">Scan Time</th>
                        <th className="py-2.5 px-3">Geo Coordinates</th>
                        <th className="py-2.5 px-3 text-right">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EFEB]">
                      {musterStaff.map(staff => (
                        <tr key={staff.id} className="hover:bg-[#FBFBFA]">
                          <td className="py-3 px-3 font-semibold text-[#0A0D14]">{staff.name}</td>
                          <td className="py-3 px-3 text-[#52525B]">{staff.role}</td>
                          <td className="py-3 px-3 font-mono text-[#71717A]">{staff.time}</td>
                          <td className="py-3 px-3 text-emerald-700 font-mono text-[11px]">{staff.geo}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => toggleStaffStatus(staff.id)}
                              className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
                                staff.status === 'Present'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : staff.status === 'Late'
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              }`}
                            >
                              {staff.status} (Click to toggle)
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <span className="text-[#52525B]">
                    Validated muster roll-calls feed directly into automated payroll ledgers and statutory Form II registers.
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    AUTO-SYNC: ENABLED
                  </span>
                </div>
              </div>
            )}

            {/* 2. OPERATIONS EQUIPMENT LOG DEMO */}
            {activeTab === 'operations' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E7E3]">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0A0D14]">
                      DG Set #01 Telemetry Log Sheet (500 KVA)
                    </h3>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Simulate duty technician submitting hourly equipment readings.
                    </p>
                  </div>
                  <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 font-bold">
                    HEALTH: OPTIMAL
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-2">
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Running Hours</span>
                    <input
                      type="text"
                      value={dgRunningHours}
                      onChange={(e) => setDgRunningHours(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D4D4D8] font-mono text-sm font-bold text-[#0A0D14]"
                    />
                    <span className="text-[10px] text-[#71717A] block">Cumulative meter reading</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-2">
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Diesel Tank Level (L)</span>
                    <input
                      type="text"
                      value={dgDiesel}
                      onChange={(e) => setDgDiesel(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D4D4D8] font-mono text-sm font-bold text-[#0A0D14]"
                    />
                    <span className="text-[10px] text-[#71717A] block">Current diesel volume</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-2">
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Lube Oil Pressure</span>
                    <div className="text-sm font-bold font-mono text-emerald-700 pt-1">4.2 bar (Normal)</div>
                    <span className="text-[10px] text-[#71717A] block">Tolerance: 3.5 - 5.0 bar</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-2">
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Coolant Temp</span>
                    <div className="text-sm font-bold font-mono text-emerald-700 pt-1">82°C (Normal)</div>
                    <span className="text-[10px] text-[#71717A] block">Tolerance: 75 - 95°C</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setDgStatus('logged')}
                    className="px-6 py-2.5 rounded-xl bg-[#0A0D14] hover:bg-[#18221E] text-white text-xs font-bold font-body transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>{dgStatus === 'logged' ? 'Log Entry Saved & Synced' : 'Submit Hourly Log Entry'}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </button>
                  {dgStatus === 'logged' && (
                    <span className="font-mono text-xs text-emerald-700 font-bold">
                      ENTRY #1489 RECORDED IN FIRESTORE
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 3. SECURITY PATROL DEMO */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E7E3]">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0A0D14]">
                      Guard Patrol Tour Sequence &bull; Route Alpha
                    </h3>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Simulate security guard scanning QR checkpoints along the perimeter route.
                    </p>
                  </div>
                  <button
                    onClick={handleScanNextCheckpoint}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-body text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan Next QR Checkpoint</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {patrolPoints.map((cp, idx) => (
                    <div
                      key={cp.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        cp.scanned
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-[#FBFBFA] border-[#E8E7E3]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] font-bold text-[#0A0D14]">
                          {cp.id}
                        </span>
                        {cp.scanned ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[#A1A1AA]" />
                        )}
                      </div>
                      <strong className="text-xs font-bold text-[#0A0D14] block">
                        {cp.name}
                      </strong>
                      <span className="font-mono text-[11px] text-[#71717A] block mt-1">
                        {cp.scanned ? `Scanned: ${cp.time}` : 'Pending Scan'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] text-xs text-[#52525B]">
                  Missed checkpoints or out-of-sequence scans automatically alert the site security manager within 15 minutes.
                </div>
              </div>
            )}

            {/* 4. ASSETS DEMO */}
            {activeTab === 'assets' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E7E3]">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0A0D14]">
                      Enterprise Asset QR Registry &bull; Water Chiller #02
                    </h3>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Scan waterproof QR code to inspect service records and warranty.
                    </p>
                  </div>
                  <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 font-bold">
                    QR TAG: ACTIVE
                  </span>
                </div>

                <div className="p-6 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3] grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Asset Tag</span>
                    <strong className="font-display text-sm font-bold text-[#0A0D14] block mt-0.5">LSM-AST-HVAC-009</strong>
                    <span className="text-xs text-[#52525B] block mt-1">Carrier 150 Ton Water Cooled Chiller</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Assigned Custody</span>
                    <strong className="text-sm font-bold text-[#0A0D14] block mt-0.5">Facility Engineering Dept</strong>
                    <span className="text-xs text-[#52525B] block mt-1">Building B &bull; Basement 2</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Next PM Service</span>
                    <strong className="font-mono text-sm font-bold text-emerald-700 block mt-0.5">18 August 2026</strong>
                    <span className="text-xs text-emerald-700 block mt-1">Scheduled: Lubrication & Coil Cleaning</span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. INVENTORY DEMO */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E7E3]">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0A0D14]">
                      Consumables & Store Inventory &bull; Site Alpha Store
                    </h3>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Real-time stock balance with automated reorder trigger.
                    </p>
                  </div>
                  <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 font-bold">
                    REORDER LEVEL: SAFE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3]">
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Diesel Stock</span>
                    <strong className="font-display text-lg font-bold text-[#0A0D14]">1,850 Liters</strong>
                    <span className="text-[10px] text-emerald-700 block mt-1">Reorder threshold: 500 L</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3]">
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Security Badges</span>
                    <strong className="font-display text-lg font-bold text-[#0A0D14]">340 Units</strong>
                    <span className="text-[10px] text-emerald-700 block mt-1">Reorder threshold: 100 Units</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3]">
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">Purchase Order #084</span>
                    <strong className="font-display text-lg font-bold text-emerald-700">GRN Inward Complete</strong>
                    <span className="text-[10px] text-[#52525B] block mt-1">Approved by Operations Head</span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ANALYTICS DEMO */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E7E3]">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0A0D14]">
                      Statutory Compliance & Form II Muster Ledger
                    </h3>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      One-click statutory export generation for labor compliance audits.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-[#0A0D14] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export Form II (PDF/CSV)</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-4">
                  <div className="flex justify-between items-center text-xs font-mono pb-2 border-b border-[#E8E7E3]">
                    <span>FORM II REGISTER OF ATTENDANCE &bull; SECTION 62</span>
                    <span className="text-emerald-700 font-bold">100% AUDIT READY</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[#71717A] block">Total Roster Strength:</span>
                      <strong className="font-bold text-[#0A0D14]">148 Personnel</strong>
                    </div>
                    <div>
                      <span className="text-[#71717A] block">Muster Accuracy:</span>
                      <strong className="font-bold text-emerald-700">99.8% Geo-Verified</strong>
                    </div>
                    <div>
                      <span className="text-[#71717A] block">Patrol SLA Compliance:</span>
                      <strong className="font-bold text-emerald-700">98.9% Route Score</strong>
                    </div>
                    <div>
                      <span className="text-[#71717A] block">Pending Incidents:</span>
                      <strong className="font-bold text-[#0A0D14]">0 Critical</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};
