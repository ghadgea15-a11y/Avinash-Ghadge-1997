import re

with open('src/components/security/SecurityDashboard.tsx', 'r') as f:
    content = f.read()

# Replace the stray HTML with nothing
content = re.sub(r"          \n            <div className=\"overflow-x-auto\">[\s\S]*?</table>\n            </div>\n          \)\}", "", content)

with open('src/components/security/SecurityDashboard.tsx', 'w') as f:
    f.write(content)
