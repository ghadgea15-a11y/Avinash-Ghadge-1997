import re

with open('src/types/index.ts', 'r') as f:
    content = f.read()

content = content.replace("  SECURITY_INCIDENTS: 'SECURITY_INCIDENTS',\n", "  SECURITY_INCIDENTS: 'SECURITY_INCIDENTS',\n  SECURITY_AUDIT: 'SECURITY_AUDIT',\n")

with open('src/types/index.ts', 'w') as f:
    f.write(content)
