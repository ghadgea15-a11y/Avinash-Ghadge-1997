import re

with open('src/components/operations/ShiftHandover.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(r"(  const \[metrics, setMetrics\] = useState\(\{ incidents: 0, visitors: 0, workOrders: 0 \}\);\n\n  useEffect\(\(\) => \{.*?\n  \}, \[session\?\.companyId, formData\.siteId\]\);\n\n)(  const \[formData, setFormData\] = useState\(\{.*?\n  \}\);)", re.DOTALL)

def replacer(match):
    return match.group(2) + "\n\n" + match.group(1)

content = pattern.sub(replacer, content)

with open('src/components/operations/ShiftHandover.tsx', 'w') as f:
    f.write(content)
