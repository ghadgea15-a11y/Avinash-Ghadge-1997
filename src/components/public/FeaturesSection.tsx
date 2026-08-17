import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  Building2, 
  Boxes, 
  QrCode, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  MapPin,
  FileSpreadsheet,
  AlertTriangle,
  Flame,
  Activity,
  Layers,
  FileCheck2
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  return (
    <section id="capabilities" className="py-24 lg:py-32 bg-[#FBFBFA] space-y-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
            Core Capabilities
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#0A0D14] tracking-tight">
            ENGINEERED FOR OPERATIONAL PRECISION
          </h2>
          <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
            Five core disciplines orchestrated through dedicated operational workflows and auditable execution.
          </p>
        </div>

        {/* 01. WORKFORCE (Large Typography + Narrative + Shift Muster Timeline) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl sm:text-5xl font-extrabold text-[#0A0D14]">01</span>
              <div className="h-8 w-px bg-[#E2E0D8]" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
                Workforce Management
              </span>
            </div>

            <h3 className="font-display text-2xl sm:text-4xl font-extrabold text-[#0A0D14] tracking-tight">
              PRECISION SHIFT MUSTER & ATTENDANCE
            </h3>

            <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
              Eliminate paper attendance registers, ghost workers, and delayed payroll reconciliations. Log Sheet Muster enables supervisors to conduct live shift roll-calls with geo-coordinates and Aadhaar KYC verification.
            </p>

            <div className="space-y-3 pt-4 border-t border-[#E8E7E3] font-body text-xs text-[#27272A]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Multi-Shift Rotations:</strong> General, Morning, Afternoon, and Night shifts with grace-period logic.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Form II Statutory Export:</strong> Generate government-compliant muster ledgers in one click.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Overtime & Wage Calculation:</strong> Direct automated sync between daily muster logs and monthly payroll.</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="p-8 rounded-3xl border border-[#E7E6E1] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#F0EFEB]">
                <span className="font-mono text-xs font-bold uppercase text-[#0A0D14]">
                  SHIFT MUSTER TIMELINE &bull; PUNE SITE A
                </span>
                <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  ROLL-CALL ACTIVE
                </span>
              </div>

              {/* Visual Shift Timeline Sequence */}
              <div className="space-y-3 font-body">
                <div className="p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#0A0D14]">07:00 AM</span>
                    <div>
                      <strong className="text-xs text-[#0A0D14] block">Morning Shift Muster Assembly</strong>
                      <span className="text-[11px] text-[#71717A]">42 Personnel Present &bull; 2 Relief Replaced</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-600">VERIFIED</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#0A0D14]">07:15 AM</span>
                    <div>
                      <strong className="text-xs text-[#0A0D14] block">Biometric & Geo-Tag Validation</strong>
                      <span className="text-[11px] text-[#71717A]">Site Radius: 150m &bull; Accuracy: 4m</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-600">GEOFENCED</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#0A0D14]">07:30 AM</span>
                    <div>
                      <strong className="text-xs text-[#0A0D14] block">Post Allocation & Duty Handover</strong>
                      <span className="text-[11px] text-[#71717A]">12 Checkpoints Staffed &bull; Arms Log Signed</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-600">DELEGATED</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 02. SECURITY (Reversed Layout: Visual on Left, Text on Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="p-8 rounded-3xl border border-[#E7E6E1] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#F0EFEB]">
                <span className="font-mono text-xs font-bold uppercase text-[#0A0D14]">
                  PATROL ROUTE &bull; ZONE B NORTH PERIMETER
                </span>
                <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  SCAN SEQUENCE 100%
                </span>
              </div>

              {/* Patrol Route Visual */}
              <div className="space-y-3 font-body">
                <div className="p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-4 h-4 text-[#0A0D14]" />
                    <div>
                      <strong className="text-xs text-[#0A0D14] block">CP-01 Main Server Room</strong>
                      <span className="text-[11px] text-[#71717A]">Scanned 08:04:12 &bull; Temp: 21°C &bull; Normal</span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-600 font-bold">ON TIME</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-4 h-4 text-[#0A0D14]" />
                    <div>
                      <strong className="text-xs text-[#0A0D14] block">CP-02 High Voltage Transformer</strong>
                      <span className="text-[11px] text-[#71717A]">Scanned 08:14:50 &bull; Lock Verified</span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-600 font-bold">ON TIME</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-4 h-4 text-[#0A0D14]" />
                    <div>
                      <strong className="text-xs text-[#0A0D14] block">CP-03 Emergency Exit Gate #4</strong>
                      <span className="text-[11px] text-[#71717A]">Scanned 08:26:01 &bull; Photo Uploaded</span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-600 font-bold">ON TIME</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl sm:text-5xl font-extrabold text-[#0A0D14]">02</span>
              <div className="h-8 w-px bg-[#E2E0D8]" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
                Security & Patrol Operations
              </span>
            </div>

            <h3 className="font-display text-2xl sm:text-4xl font-extrabold text-[#0A0D14] tracking-tight">
              TAMPER-PROOF QR PATROLS & GATE PASSES
            </h3>

            <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
              Guarantee guard patrol accountability with cryptographically generated QR checkpoints. Track perimeter rounds, visitor digital badges, and material inward/outward gate passes in real-time.
            </p>

            <div className="space-y-3 pt-4 border-t border-[#E8E7E3] font-body text-xs text-[#27272A]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Sequential Route Enforcement:</strong> Prevents missed checkpoints and enforces mandatory scan intervals.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Material Gate Passes:</strong> Inward, Outward Returnable, and Non-Returnable goods tracking with vehicle records.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Incident Reporting:</strong> Instant photographic evidence, severity rating, and manager notification.</span>
              </div>
            </div>
          </div>

        </div>

        {/* 03. OPERATIONS (Text on Left, Telemetry Visual on Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl sm:text-5xl font-extrabold text-[#0A0D14]">03</span>
              <div className="h-8 w-px bg-[#E2E0D8]" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
                Facility Operations
              </span>
            </div>

            <h3 className="font-display text-2xl sm:text-4xl font-extrabold text-[#0A0D14] tracking-tight">
              EQUIPMENT LOG SHEETS & TELEMETRY
            </h3>

            <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
              Standardize hourly and daily equipment readings across Diesel Generator (DG) sets, HVAC chillers, water treatment plants, and electrical distribution panels.
            </p>

            <div className="space-y-3 pt-4 border-t border-[#E8E7E3] font-body text-xs text-[#27272A]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Threshold Violation Alerts:</strong> Auto-triggers incident work orders if oil pressure, voltage, or temperature exceed tolerance.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Fuel & Energy Auditing:</strong> Exact diesel consumption vs. running hours calculation to prevent leakage.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Preventive Maintenance Calendars:</strong> Automated reminder alerts for 250hr / 500hr service intervals.</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="p-8 rounded-3xl border border-[#E7E6E1] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#F0EFEB]">
                <span className="font-mono text-xs font-bold uppercase text-[#0A0D14]">
                  DG SET #01 LOG SHEET &bull; 500 KVA CUMMINS
                </span>
                <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  OPTIMAL STATUS
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-body">
                <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3]">
                  <span className="text-[11px] text-[#71717A] uppercase font-mono block">RUNNING HOURS</span>
                  <strong className="text-lg font-bold font-display text-[#0A0D14]">1,482.4 Hrs</strong>
                  <span className="text-[10px] text-emerald-600 font-mono block mt-1">+4.2 hrs today</span>
                </div>
                <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3]">
                  <span className="text-[11px] text-[#71717A] uppercase font-mono block">DIESEL TANK LEVEL</span>
                  <strong className="text-lg font-bold font-display text-[#0A0D14]">420 Liters</strong>
                  <span className="text-[10px] text-[#71717A] font-mono block mt-1">70% capacity</span>
                </div>
                <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3]">
                  <span className="text-[11px] text-[#71717A] uppercase font-mono block">OIL PRESSURE</span>
                  <strong className="text-lg font-bold font-display text-[#0A0D14]">4.2 bar</strong>
                  <span className="text-[10px] text-emerald-600 font-mono block mt-1">Within range (3.5 - 5.0)</span>
                </div>
                <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3]">
                  <span className="text-[11px] text-[#71717A] uppercase font-mono block">COOLANT TEMP</span>
                  <strong className="text-lg font-bold font-display text-[#0A0D14]">82°C</strong>
                  <span className="text-[10px] text-emerald-600 font-mono block mt-1">Normal operating temp</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 04. ASSETS & INVENTORY (Full-Width Dual Composition) */}
        <div className="p-8 sm:p-12 rounded-3xl border border-[#E7E6E1] bg-white shadow-sm space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E7E3]">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-display text-4xl font-extrabold text-[#0A0D14]">04</span>
                <div className="h-8 w-px bg-[#E2E0D8]" />
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
                  Enterprise Assets & Inventory
                </span>
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A0D14] mt-2">
                UNIFIED ASSET LIFECYCLE & PROCUREMENT PIPELINE
              </h3>
            </div>
            <span className="font-mono text-xs text-[#71717A]">
              EAM &bull; QR TRACKING &bull; POs &bull; GRN
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-body">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#0A0D14]" />
                <h4 className="font-display text-base font-bold text-[#0A0D14]">Asset Lifecycle & Custody Tracking</h4>
              </div>
              <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                Affix weatherproof QR stickers to every generator, pump, laptop, and security transceiver. Field technicians scan to instantly view service history, warranty status, and log breakdown tickets.
              </p>
              <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Asset Tag:</span>
                  <span className="font-mono font-bold text-[#0A0D14]">LSM-AST-2024-884</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Custody:</span>
                  <span className="font-semibold text-[#0A0D14]">Security Supervisor &bull; Main Gate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Next Preventive Maintenance:</span>
                  <span className="font-mono text-emerald-600 font-bold">14 Days Remaining</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[#0A0D14]" />
                <h4 className="font-display text-base font-bold text-[#0A0D14]">Consumable Stock & Goods Receipt Notes</h4>
              </div>
              <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                Track site consumable balances (diesel, housekeeping chemicals, security batons, badges) with automated reorder alerts, Purchase Orders, and physical GRN stock reconciliation.
              </p>
              <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Store Balance (Diesel):</span>
                  <span className="font-mono font-bold text-[#0A0D14]">1,850 L (Safe Stock)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Latest PO #084:</span>
                  <span className="font-semibold text-emerald-600">Approved &bull; GRN Inward Completed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Supplier Rate Registry:</span>
                  <span className="font-mono text-[#0A0D14]">12 Verified Vendors</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 05. INTELLIGENCE (Analytics-Inspired Visual + Form II Compliance) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl sm:text-5xl font-extrabold text-[#0A0D14]">05</span>
              <div className="h-8 w-px bg-[#E2E0D8]" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
                Executive Intelligence
              </span>
            </div>

            <h3 className="font-display text-2xl sm:text-4xl font-extrabold text-[#0A0D14] tracking-tight">
              CROSS-SITE AUDITING & STATUTORY COMPLIANCE
            </h3>

            <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
              Consolidate field muster logs, patrol SLA reports, and equipment maintenance metrics into executive dashboards and audit-ready statutory registers.
            </p>

            <div className="space-y-3 pt-4 border-t border-[#E8E7E3] font-body text-xs text-[#27272A]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Statutory Form II Muster Registers:</strong> Instant printable muster exports matching labor regulations.</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Security Guard Patrol SLA Audits:</strong> Instant compliance percentages per post and shift.</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Equipment MTTR & Downtime Analysis:</strong> Mean Time to Repair analytics for facility assets.</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="p-8 rounded-3xl border border-[#E7E6E1] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#F0EFEB]">
                <span className="font-mono text-xs font-bold uppercase text-[#0A0D14]">
                  EXECUTIVE AUDIT SUMMARY &bull; MONTHLY CONSOLIDATION
                </span>
                <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  AUDIT PASS
                </span>
              </div>

              <div className="space-y-3 font-body">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3]">
                  <span className="text-xs font-semibold text-[#0A0D14]">Muster Attendance Compliance</span>
                  <span className="font-mono text-xs font-bold text-emerald-600">99.4% (Zero Ghost Records)</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3]">
                  <span className="text-xs font-semibold text-[#0A0D14]">Guard Patrol Checkpoint SLA</span>
                  <span className="font-mono text-xs font-bold text-emerald-600">98.8% Verified Rounds</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3]">
                  <span className="text-xs font-semibold text-[#0A0D14]">Equipment Log Sheet Completion</span>
                  <span className="font-mono text-xs font-bold text-emerald-600">100% (48/48 Daily Logs)</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3]">
                  <span className="text-xs font-semibold text-[#0A0D14]">Statutory Wage Ledger Sync</span>
                  <span className="font-mono text-xs font-bold text-[#0A0D14]">Form II Generated</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
