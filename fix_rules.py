import re

with open('firestore.rules', 'r') as f:
    content = f.read()

pattern = re.compile(r"    match /notifications/\{notificationId\} \{\n      allow read: if signedIn\(\);\n      allow create: if isSuperAdmin\(\) \|\| \(signedIn\(\) && userExists\(\) && isManager\(userData\(\)\.companyId\)\);\n      allow update, delete: if isSuperAdmin\(\) \|\| \(signedIn\(\) && userExists\(\) && isCompanyAdmin\(userData\(\)\.companyId\)\);\n    \}")
content = pattern.sub("", content)

with open('firestore.rules', 'w') as f:
    f.write(content)
