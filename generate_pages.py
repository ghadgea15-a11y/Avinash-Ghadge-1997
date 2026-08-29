import os

pages = {
    "WorkforceManagementPage.tsx": {
        "title": "Enterprise Workforce Management",
        "description": "Unify your operational workforce across sites, zones, and regions with real-time deployment tracking.",
        "icon": "Users",
        "content": [
            ("The Problem", "Managing distributed workforces across multiple industrial and commercial sites leads to ghost rolls, compliance violations, and inefficient deployment."),
            ("The Solution", "Log Sheet Muster provides a centralized Command Center for tracking every employee, supervisor, and contractor across your entire portfolio."),
            ("Key Capabilities", "- Real-time Site Rostering\n- Skill-based Deployment\n- Contractor Compliance Tracking\n- Live Headcount Dashboards"),
            ("Business Value", "Eliminate up to 15% in payroll leakage due to ghost employees and reduce deployment mismatch by 40%.")
        ]
    },
    "AttendanceManagementPage.tsx": {
        "title": "Form II Statutory Attendance Muster",
        "description": "Automate compliance-ready attendance capture with biometric integration and supervisor verifications.",
        "icon": "Clock",
        "content": [
            ("The Problem", "Manual attendance registers and disconnected biometric machines result in delayed payroll, manipulation, and labor compliance risks."),
            ("The Solution", "A unified cloud muster roll that ingests data from biometric devices, mobile apps, and supervisor roll-calls in real-time."),
            ("Key Capabilities", "- Hardware Integration (Biometric, RFID)\n- Mobile Selfie & Geo-fenced Punch\n- Automated Form II Register Generation\n- Overtime & Late Approval Workflows"),
            ("Business Value", "Achieve 100% labor compliance and cut payroll processing time from days to hours.")
        ]
    },
    "SecurityManagementPage.tsx": {
        "title": "Guard Patrol & Security Operations",
        "description": "Ensure total site security with GPS-verified QR patrol checkpoints and instant incident reporting.",
        "icon": "ShieldCheck",
        "content": [
            ("The Problem", "Traditional guard tours use offline wands or paper logs, offering zero real-time visibility into missed checkpoints or active incidents."),
            ("The Solution", "Turn any smartphone into a verified patrol tool. Guards scan QR codes at designated zones, instantly transmitting GPS, timestamp, and visual evidence."),
            ("Key Capabilities", "- Custom QR Patrol Routes\n- GPS & Timestamp Verification\n- Offline-first Scanning with Auto-sync\n- Instant Incident Photo Capture"),
            ("Business Value", "Prove SLA compliance to clients with 100% verifiable patrol logs and reduce incident response time.")
        ]
    },
    "FacilityManagementPage.tsx": {
        "title": "Facility Logs & Work Orders",
        "description": "Digitize physical log sheets and automate preventive maintenance schedules.",
        "icon": "Building2",
        "content": [
            ("The Problem", "Critical equipment readings, visitor logs, and maintenance checklists are lost in paper binders, making audits impossible."),
            ("The Solution", "Digital log sheets that trigger automated alerts on out-of-bounds readings and dynamically generate work orders."),
            ("Key Capabilities", "- Digital Log Book Templates\n- Threshold-based SMS/Email Alerts\n- Preventive Maintenance Scheduling\n- Visitor Gate Pass Management"),
            ("Business Value", "Extend asset lifespan by ensuring 100% compliance on preventive maintenance schedules.")
        ]
    },
    "AssetManagementPage.tsx": {
        "title": "Enterprise Asset Tracking",
        "description": "Track the lifecycle, custody, and health of every operational asset.",
        "icon": "MonitorSmartphone",
        "content": [
            ("The Problem", "Untracked asset movements lead to theft, loss, and unrecorded depreciation across distributed sites."),
            ("The Solution", "A comprehensive EAM (Enterprise Asset Management) module tracking items from procurement to disposal."),
            ("Key Capabilities", "- Asset Custody Transfers\n- QR-based Asset Verification\n- Maintenance History Logs\n- Depreciation Tracking"),
            ("Business Value", "Reduce asset loss by 90% and maintain a verifiable digital twin of your physical infrastructure.")
        ]
    },
    "InventoryPage.tsx": {
        "title": "Operational Inventory & SCM",
        "description": "Control stock levels, material issues, and reorder points with transactional accuracy.",
        "icon": "FileText",
        "content": [
            ("The Problem", "Uncontrolled material issuance at sites leads to wastage, stock-outs, and inflated operational costs."),
            ("The Solution", "A transactional inventory engine that links material issuance directly to work orders and employee custody."),
            ("Key Capabilities", "- Multi-warehouse Stock Tracking\n- Material Issue & Return Workflows\n- Automated Reorder Alerts\n- Vendor Delivery Verification"),
            ("Business Value", "Optimize working capital by reducing excess stock and eliminating unauthorized material consumption.")
        ]
    },
    "PayrollPage.tsx": {
        "title": "Statutory Payroll Engine",
        "description": "Process complex industrial and security payrolls with built-in compliance rules.",
        "icon": "BarChart3",
        "content": [
            ("The Problem", "Calculating overtime, statutory deductions (PF, ESI, PT), and site-specific allowances manually is error-prone and non-compliant."),
            ("The Solution", "An automated payroll engine directly integrated with the Attendance Muster and Leave Management systems."),
            ("Key Capabilities", "- Configurable Salary Structures\n- Automated PF, ESI, PT Calculations\n- Overtime & Leave-Without-Pay Rules\n- One-click Payslip Generation"),
            ("Business Value", "Eliminate payroll calculation errors and ensure seamless statutory labor compliance.")
        ]
    },
    "CompliancePage.tsx": {
        "title": "Governance, Risk & Compliance (GRC)",
        "description": "Maintain audit-ready registers and enforce organizational policies automatically.",
        "icon": "CheckCircle2",
        "content": [
            ("The Problem", "Failing labor audits or losing client contracts due to missing documentation or expired employee certifications."),
            ("The Solution", "A proactive compliance engine that tracks document expiries, generates statutory registers, and blocks non-compliant deployments."),
            ("Key Capabilities", "- Form II, Form D, Form E Generation\n- Document Expiry Alerts (Police Verification, Medical)\n- Audit Trail Logging\n- Automated Policy Enforcement"),
            ("Business Value", "Achieve a zero-finding audit record and protect the organization from legal liabilities.")
        ]
    },
    "ReportsAnalyticsPage.tsx": {
        "title": "Operational Intelligence & Analytics",
        "description": "Transform operational data into executive dashboards and actionable insights.",
        "icon": "BarChart3",
        "content": [
            ("The Problem", "Executives lack visibility into site-level operations, leading to reactive decision-making based on stale data."),
            ("The Solution", "Real-time analytics dashboards providing a bird's-eye view of workforce capacity, compliance risks, and operational bottlenecks."),
            ("Key Capabilities", "- Customizable KPI Dashboards\n- Cross-module Data Aggregation\n- Automated Email Report Scheduling\n- Drill-down Site Level Analytics"),
            ("Business Value", "Empower leadership with the intelligence needed to optimize deployments and reduce operational costs proactively.")
        ]
    }
}

template = """import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { ICON_NAME, ArrowRight, CheckCircle2 } from 'lucide-react';

export const COMPONENT_NAME: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-24">
      
      {/* Hero */}
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 blur-[100px] rounded-full w-[800px] h-[400px] left-1/2 -translate-x-1/2 -top-20" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
            <ICON_NAME className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            TITLE_STR
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            DESC_STR
          </p>
        </div>
      </section>

      {/* Content Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
          
          <div className="space-y-12">
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-widest text-blue-400 uppercase">The Challenge</h3>
              <p className="text-slate-300 leading-relaxed text-lg border-l-2 border-slate-700 pl-4">CONTENT_0</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-widest text-emerald-400 uppercase">The Solution</h3>
              <p className="text-slate-300 leading-relaxed text-lg">CONTENT_1</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4">
              <h3 className="text-sm font-black tracking-widest text-white uppercase">Business Value</h3>
              <p className="text-blue-200 font-medium">CONTENT_3</p>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-2xl font-bold text-white">Key Capabilities</h3>
            <div className="grid gap-4">
              CONTENT_2
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
"""

for filename, data in pages.items():
    caps = "\n".join([f'<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /><span className="text-slate-300">{c.replace("- ", "")}</span></div>' for c in data['content'][2][1].split('\n')])
    
    code = template.replace('COMPONENT_NAME', filename.split('.')[0])
    code = code.replace('ICON_NAME', data['icon'])
    code = code.replace('TITLE_STR', data['title'])
    code = code.replace('DESC_STR', data['description'])
    code = code.replace('CONTENT_0', data['content'][0][1])
    code = code.replace('CONTENT_1', data['content'][1][1])
    code = code.replace('CONTENT_2', caps)
    code = code.replace('CONTENT_3', data['content'][3][1])
    
    with open(f"src/components/public/{filename}", "w") as f:
        f.write(code)

