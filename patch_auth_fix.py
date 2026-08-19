with open('src/services/firebaseAuthService.ts', 'r') as f:
    content = f.read()

content = content.replace("code\\?: string;", "code?: string;")
content = content.replace("message\\?: string", "message?: string")

with open('src/services/firebaseAuthService.ts', 'w') as f:
    f.write(content)
