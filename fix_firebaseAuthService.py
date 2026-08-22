import re

with open('src/services/firebaseAuthService.ts', 'r') as f:
    content = f.read()

# Revert my bad sed command
content = content.replace("      }\n    };", "      },")

# Now apply the correct syntax for predefinedTenants end.
# We know the last predefined tenant is 'SUPER'.
# We need to replace:
#       'SUPER': {
#         // ...
#         status: 'ACTIVE'
#       },
#     if (predefinedTenants[cleanCode]) {
# With:
#       'SUPER': {
#         // ...
#         status: 'ACTIVE'
#       }
#     };
#     if (predefinedTenants[cleanCode]) {

pattern = r"('SUPER': \{[^\}]+status: 'ACTIVE'\n      \},)"
def replacer(match):
    # change the trailing comma to \n    };
    s = match.group(1)
    s = s[:-1] + "\n    };\n"
    return s

content = re.sub(pattern, replacer, content)

with open('src/services/firebaseAuthService.ts', 'w') as f:
    f.write(content)
