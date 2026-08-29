import os

pages = {
    "SecurityOperationsSolutionPage.tsx": {
        "title": "Security Guarding Companies",
        "description": "A purpose-built command center for security agencies managing hundreds of distributed sites and thousands of guards.",
        "icon": "ShieldCheck",
        "content": [
            ("The Challenge", "Security companies struggle with unverified guard patrols, phantom attendance, and complex billing cycles based on actual deployment versus contracted strength."),
            ("The Solution", "A specialized operational suite connecting mobile patrol verification, biometric attendance, and automated client billing into a single pane of glass."),
            ("Key Capabilities", "- Real-time Control Room Dashboard\n- QR-verified Guard Patrols\n- Automated Reliever Scheduling\n- Incident Management & Escalation"),
            ("Business Value", "Prove service delivery to clients, win enterprise contracts with tech-enabled guarding, and eliminate deployment leakages.")
        ]
    },
    "FacilityManagementSolutionPage.tsx": {
        "title": "Facility Management Services (FMS)",
        "description": "Digitize soft and hard services across commercial real estate, corporate parks, and residential complexes.",
        "icon": "Building2",
        "content": [
            ("The Challenge", "FMS providers lose margin due to undocumented consumable usage, delayed SLA responses, and manual penalty calculations by clients."),
            ("The Solution", "An integrated FMS operating system that tracks every housekeeper, technician, consumable, and work order in real-time."),
            ("Key Capabilities", "- SLA-driven Work Orders\n- Consumable Inventory Tracking\n- Digital Washroom Checklists\n- Client Transparency Portal"),
            ("Business Value", "Increase gross margins by 8-12% through tight inventory control and zero SLA penalties.")
        ]
    },
    "MultiSiteSolutionPage.tsx": {
        "title": "Multi-Site Retail & Branch Operations",
        "description": "Maintain standardized operations and workforce compliance across hundreds of distributed retail stores or bank branches.",
        "icon": "Map",
        "content": [
            ("The Challenge", "Head office lacks visibility into branch-level staff attendance, security incidents, and facility maintenance, leading to brand standard degradation."),
            ("The Solution", "A centralized monitoring platform giving regional and national managers real-time oversight of every location."),
            ("Key Capabilities", "- Geo-fenced Branch Attendance\n- Regional Hierarchy & Roll-ups\n- Branch Audit Checklists\n- Centralized Vendor Management"),
            ("Business Value", "Ensure 100% brand standard compliance across the network without increasing middle-management headcount.")
        ]
    },
    "IndustrialSolutionPage.tsx": {
        "title": "Industrial & Manufacturing",
        "description": "Manage complex contractor workforces, shift rosters, and safety compliance in heavy industrial environments.",
        "icon": "Factory",
        "content": [
            ("The Challenge", "Factories face severe legal risks from non-compliant contract laborers, complex shift rotations, and poor safety incident reporting."),
            ("The Solution", "An industrial-grade workforce engine that blocks non-compliant contractor entry and integrates seamlessly with plant turnstile hardware."),
            ("Key Capabilities", "- Contractor Compliance Blocking\n- Complex 3-Shift & 4-Shift Rostering\n- Safety Incident Logging\n- Factory Act Statutory Registers"),
            ("Business Value", "Achieve zero labor compliance violations and ensure plant safety through strict digital entry controls.")
        ]
    },
    "CorporateSolutionPage.tsx": {
        "title": "Corporate Office Parks",
        "description": "Deliver a premium, seamless experience for tenants, employees, and visitors in modern corporate environments.",
        "icon": "Briefcase",
        "content": [
            ("The Challenge", "Managing multiple sub-contractors (security, housekeeping, maintenance) in a corporate park leads to siloed data and poor tenant experiences."),
            ("The Solution", "A unified platform for the Principal Employer to monitor all vendors, track SLAs, and ensure compliance across the entire campus."),
            ("Key Capabilities", "- Principal Employer Dashboard\n- Cross-vendor Headcount Verification\n- Digital Visitor Management\n- Helpdesk & Ticketing"),
            ("Business Value", "Ensure all outsourced vendors deliver on their contracts and maintain a premium, uninterrupted corporate environment.")
        ]
    },
    "ContractorsSolutionPage.tsx": {
        "title": "Manpower Contractors & Agencies",
        "description": "Streamline recruitment, deployment, and payroll for specialized manpower supply agencies.",
        "icon": "Users",
        "content": [
            ("The Challenge", "Manpower agencies struggle to reconcile site attendance with payroll, leading to delayed invoicing and cash flow bottlenecks."),
            ("The Solution", "An end-to-end agency operating system that bridges the gap between field attendance and accurate client invoicing."),
            ("Key Capabilities", "- Employee Onboarding & KYC\n- Site-wise Attendance Consolidation\n- Automated Payroll Processing\n- Client Invoice Generation"),
            ("Business Value", "Reduce invoice generation time from 15 days to 2 days, significantly improving working capital cycle.")
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
        <div className="absolute inset-0 bg-indigo-600/5 blur-[100px] rounded-full w-[800px] h-[400px] left-1/2 -translate-x-1/2 -top-20" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
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
              <h3 className="text-sm font-black tracking-widest text-indigo-400 uppercase">The Challenge</h3>
              <p className="text-slate-300 leading-relaxed text-lg border-l-2 border-slate-700 pl-4">CONTENT_0</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-widest text-emerald-400 uppercase">The Solution</h3>
              <p className="text-slate-300 leading-relaxed text-lg">CONTENT_1</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
              <h3 className="text-sm font-black tracking-widest text-white uppercase">Business Value</h3>
              <p className="text-indigo-200 font-medium">CONTENT_3</p>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-2xl font-bold text-white">Solution Capabilities</h3>
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
    caps = "\n".join([f'<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /><span className="text-slate-300">{c.replace("- ", "")}</span></div>' for c in data['content'][2][1].split('\n')])
    
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

