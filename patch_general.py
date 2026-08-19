import re

with open('src/components/screens/dashboards/GeneralManagerDashboard.tsx', 'r') as f:
    content = f.read()

security_button = """      <div className="flex gap-4">
        <button 
          onClick={() => onNavigate('SECURITY_AUDIT')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <ShieldCheck className="w-5 h-5" />
          Security Audit & Anomalies
        </button>
      </div>
"""

content = content.replace("      <ExecutiveBiDashboard", security_button + "      <ExecutiveBiDashboard")

with open('src/components/screens/dashboards/GeneralManagerDashboard.tsx', 'w') as f:
    f.write(content)
