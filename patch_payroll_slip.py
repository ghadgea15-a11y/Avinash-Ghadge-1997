import re

with open('src/components/screens/PayrollCompensationScreen.tsx', 'r') as f:
    content = f.read()

# Add import
import_pattern = r"import \{ (.*?) \} from 'lucide-react';"
content = re.sub(import_pattern, r"import { \1 } from 'lucide-react';\nimport { PayslipModal } from './PayslipModal';", content)

# Add state
state_pattern = r'const \[selectedCycleId, setSelectedCycleId\] = useState<string>\(\'\'\);\n  const \[payrollRecords, setPayrollRecords\] = useState<PayrollRecord\[\]>\(\[\]\);'
content = re.sub(state_pattern, r"const [selectedCycleId, setSelectedCycleId] = useState<string>('');\n  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);\n  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);", content)

# Change handleDownloadPayslip
handle_pattern = r'const handleDownloadPayslip = \(record: PayrollRecord\) => \{.*?\n  \};'
new_handle = r'''const handleDownloadPayslip = (record: PayrollRecord) => {
    setViewingPayslip(record);
  };'''
content = re.sub(handle_pattern, new_handle, content, flags=re.DOTALL)

# Add component to render
render_pattern = r'(</DashboardLayout>)'
new_render = r'''{viewingPayslip && activeCompany && (
        <PayslipModal 
          record={viewingPayslip} 
          company={activeCompany} 
          onClose={() => setViewingPayslip(null)} 
        />
      )}
    \1'''
content = re.sub(render_pattern, new_render, content)

with open('src/components/screens/PayrollCompensationScreen.tsx', 'w') as f:
    f.write(content)
