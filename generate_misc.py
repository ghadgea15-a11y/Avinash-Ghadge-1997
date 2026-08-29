import os

pages = {
    "FaqPage.tsx": {
        "title": "Frequently Asked Questions",
        "description": "Find answers to the most common questions about the Log Sheet Muster enterprise platform.",
        "icon": "HelpCircle",
        "sections": [
            ("What is Log Sheet Muster?", "Log Sheet Muster is a comprehensive cloud-based SaaS platform designed for enterprise workforce management, security guarding, and facility operations. It digitizes attendance, payroll, shift scheduling, log sheets, and compliance tracking into a single unified system."),
            ("Who uses this platform?", "Our clients include large security guarding agencies, facility management service (FMS) providers, manufacturing plants, retail chains, and corporate office parks who need to manage distributed workforces and physical operations."),
            ("Does it support offline operations?", "Yes. The mobile application for supervisors and guards is built with an offline-first architecture. Attendance punches, patrol QR scans, and log entries are cached locally and automatically synced to the server when network connectivity is restored."),
            ("How do you handle data security and tenant isolation?", "We employ strict multi-tenant isolation at the database level using Firestore Security Rules. A user belonging to Company A is mathematically restricted from reading or writing Company B data. All data in transit and at rest is encrypted."),
            ("Can it integrate with our existing biometric machines?", "Yes. Log Sheet Muster provides hardware integration modules that can ingest attendance logs from IP-based biometric devices (fingerprint/face recognition) and map them to the unified attendance engine."),
            ("What are the pricing plans?", "We offer tier-based enterprise licensing depending on the modules activated and the volume of active employees/users. Please contact our sales team to request a demo and customized pricing quotation.")
        ]
    },
    "SupportPage.tsx": {
        "title": "Enterprise Support",
        "description": "Get help from our technical operations team.",
        "icon": "LifeBuoy",
        "sections": [
            ("Dedicated Account Management", "Enterprise clients are assigned a dedicated technical account manager who understands your specific operational workflows and custom configurations."),
            ("Service Level Agreements (SLAs)", "We provide guaranteed uptime SLAs and tiered response times for critical production issues affecting payroll runs or attendance capture."),
            ("Implementation & Onboarding", "Our deployment engineers assist with bulk data migration, device configuration, and supervisor training during the initial onboarding phase."),
            ("Helpdesk Contact", "For urgent support queries, please email support@shouryaenterprises.com or contact your assigned account manager directly.")
        ]
    },
    "DocumentationPage.tsx": {
        "title": "Platform Documentation",
        "description": "Technical resources and user guides for administrators and supervisors.",
        "icon": "BookOpen",
        "sections": [
            ("User Guides", "Step-by-step documentation for everyday tasks: managing employees, generating attendance reports, and creating shift rosters."),
            ("Administrator Manuals", "Detailed instructions on configuring company settings, managing roles and permissions, and setting up complex payroll structures."),
            ("API Reference", "For enterprise clients requiring custom integrations, we provide detailed REST API documentation for pushing and pulling workforce data."),
            ("Security Whitepapers", "Comprehensive overviews of our cloud architecture, data encryption standards, and compliance certifications.")
        ]
    },
    "ReleaseNotesPage.tsx": {
        "title": "Release Notes",
        "description": "Track the latest feature updates and platform improvements.",
        "icon": "GitCommit",
        "sections": [
            ("Continuous Improvement", "The Log Sheet Muster platform is updated continuously with new modules, performance optimizations, and security patches without requiring downtime."),
            ("Recent Updates", "- Introduced advanced geo-fencing for mobile attendance.\n- Added custom claim-based role resolution for fine-grained access control.\n- Upgraded the offline sync engine for faster conflict resolution."),
            ("Upcoming Features", "Our roadmap includes enhanced AI predictive analytics for workforce attrition and automated compliance risk scoring.")
        ]
    },
    "CareersPage.tsx": {
        "title": "Careers at Shourya Enterprises",
        "description": "Join the team building the operating system for India's physical workforce.",
        "icon": "Briefcase",
        "sections": [
            ("Our Mission", "We are solving hard engineering problems to bring dignity, compliance, and efficiency to blue-collar and gray-collar operational workforces."),
            ("Engineering Culture", "We value pragmatism, robust architecture, and a deep understanding of our users' real-world constraints. We build resilient software that works in low-bandwidth environments."),
            ("Current Openings", "We are currently hiring for: \n- Senior Full-Stack Engineer (React/Firebase)\n- Android Developer (Kotlin)\n- Enterprise Sales Executive\n\nPlease send your resume to hr@shouryaenterprises.com.")
        ]
    },
    "PartnersPage.tsx": {
        "title": "Partner Ecosystem",
        "description": "Collaborate with us to deliver comprehensive operational solutions.",
        "icon": "Handshake",
        "sections": [
            ("Hardware Partners", "We integrate with leading biometric and access control manufacturers to provide seamless end-to-end attendance and security solutions."),
            ("Implementation Partners", "Consulting firms and IT integrators can partner with us to deploy the Log Sheet Muster platform for their enterprise clients."),
            ("Strategic Alliances", "We collaborate with HR consultants and compliance experts to ensure our platform constantly adheres to the latest statutory labor laws."),
            ("Become a Partner", "Interested in partnering with Shourya Enterprises? Contact our business development team at partners@shouryaenterprises.com.")
        ]
    },
    "PrivacyPage.tsx": {
        "title": "Privacy Policy",
        "description": "How we collect, use, and protect your personal and operational data.",
        "icon": "Shield",
        "sections": [
            ("Data Collection", "We collect data necessary to provide our workforce management services, including employee details, attendance logs, location data (when using mobile punches), and operational records."),
            ("Data Usage", "The data is used exclusively to generate attendance reports, process payroll, and facilitate operational workflows as directed by the employer (our client)."),
            ("Data Sharing", "We do not sell personal data to third parties. Data is only shared with authorized sub-processors necessary for providing the cloud service (e.g., hosting providers) under strict confidentiality agreements."),
            ("Data Security", "We implement robust security measures, including encryption at rest and in transit, to protect data against unauthorized access or disclosure.")
        ]
    },
    "TermsPage.tsx": {
        "title": "Terms of Service",
        "description": "The legal agreement governing your use of the Log Sheet Muster platform.",
        "icon": "FileText",
        "sections": [
            ("Acceptance of Terms", "By accessing or using the Log Sheet Muster platform, you agree to be bound by these terms of service and all applicable laws and regulations."),
            ("License to Use", "We grant you a non-exclusive, non-transferable license to use the platform for your internal business operations in accordance with your subscription plan."),
            ("User Responsibilities", "You are responsible for maintaining the confidentiality of your account credentials and for ensuring that all data entered into the platform complies with applicable laws."),
            ("Limitation of Liability", "Shourya Enterprises Pvt. Ltd. shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the platform.")
        ]
    },
    "CookiesPage.tsx": {
        "title": "Cookie Policy",
        "description": "Information about how we use cookies and similar technologies.",
        "icon": "Cookie",
        "sections": [
            ("What are Cookies?", "Cookies are small text files placed on your device to help the website provide a better user experience."),
            ("How We Use Cookies", "We use cookies to maintain your authenticated session, remember your preferences, and analyze anonymized platform usage to improve performance."),
            ("Managing Cookies", "You can control and/or delete cookies as you wish using your browser settings, but disabling cookies may affect the functionality of the platform.")
        ]
    },
    "AcceptableUsePage.tsx": {
        "title": "Acceptable Use Policy",
        "description": "Guidelines for appropriate and lawful use of our services.",
        "icon": "CheckSquare",
        "sections": [
            ("Prohibited Activities", "You may not use the platform for any illegal purpose, to transmit malicious code, or to attempt unauthorized access to other tenants' data."),
            ("System Integrity", "You must not attempt to bypass our security measures, overload our infrastructure, or reverse-engineer the platform."),
            ("Content Standards", "Any content uploaded to the platform must not be defamatory, obscene, or infringe on intellectual property rights."),
            ("Enforcement", "Violation of these guidelines may result in immediate suspension or termination of your account.")
        ]
    },
    "DataProtectionPage.tsx": {
        "title": "Data Protection Addendum (DPA)",
        "description": "Our commitment to data privacy and regulatory compliance.",
        "icon": "Lock",
        "sections": [
            ("Role of Parties", "For the purposes of data protection laws, the Client is the Data Controller and Shourya Enterprises Pvt. Ltd. is the Data Processor."),
            ("Processing Instructions", "We will only process personal data in accordance with the documented instructions of the Client."),
            ("Security Measures", "We maintain appropriate technical and organizational measures to ensure a level of security appropriate to the risk of processing."),
            ("Data Subject Rights", "We will assist the Client in fulfilling their obligations to respond to requests from individuals exercising their data privacy rights.")
        ]
    },
    "DemoTermsPage.tsx": {
        "title": "Trial & Demo Terms",
        "description": "Terms applicable to the 3-Month Free Demo and trial accounts.",
        "icon": "PlayCircle",
        "sections": [
            ("Trial Period", "The 3-Month Free Demo provides access to selected modules of the Log Sheet Muster platform for evaluation purposes only."),
            ("Data Retention", "At the end of the trial period, if you do not convert to a paid subscription, your trial data may be permanently deleted after a grace period."),
            ("Service Level", "Trial accounts do not include guaranteed uptime SLAs or dedicated account management, although standard support is provided."),
            ("Conversion", "You may convert your trial account to a production account at any time by selecting a subscription plan and executing a commercial agreement.")
        ]
    }
}

template = """import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { ICON_NAME } from 'lucide-react';

export const COMPONENT_NAME: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <ICON_NAME className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            TITLE_STR
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            DESC_STR
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          SECTIONS_HTML
        </div>
      </section>

    </div>
  );
};
"""

for filename, data in pages.items():
    sections_html = ""
    for title, content in data['sections']:
        paragraphs = content.split('\n')
        p_html = "".join([f"<p>{p}</p>" for p in paragraphs])
        sections_html += f"""
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              {p_html}
            </div>
          </div>
        """
    
    code = template.replace('COMPONENT_NAME', filename.split('.')[0])
    code = code.replace('ICON_NAME', data['icon'])
    code = code.replace('TITLE_STR', data['title'])
    code = code.replace('DESC_STR', data['description'])
    code = code.replace('SECTIONS_HTML', sections_html)
    
    with open(f"src/components/public/{filename}", "w") as f:
        f.write(code)

