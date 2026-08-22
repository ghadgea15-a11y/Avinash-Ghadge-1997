with open('src/services/firebaseAuthService.ts', 'r') as f:
    lines = f.readlines()
lines[93] = "      }\n    };\n"
with open('src/services/firebaseAuthService.ts', 'w') as f:
    f.writelines(lines)
