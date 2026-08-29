import re

with open('src/components/screens/LoginScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace("flex flex-col justify-center px-6`}            <div", "flex flex-col justify-center px-6`}>\n        <div")

with open('src/components/screens/LoginScreen.tsx', 'w') as f:
    f.write(content)

