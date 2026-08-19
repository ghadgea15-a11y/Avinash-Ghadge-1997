import re

with open('src/types/index.ts', 'r') as f:
    content = f.read()

content = content.replace("  | 'REPORTS_ANALYTICS'\n", "  | 'REPORTS_ANALYTICS'\n  | 'SECURITY_AUDIT'\n")

with open('src/types/index.ts', 'w') as f:
    f.write(content)
