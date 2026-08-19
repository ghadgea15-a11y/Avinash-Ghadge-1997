import re

with open('firestore.rules', 'r') as f:
    content = f.read()

pattern = re.compile(r"    match /approval_requests/\{requestId\} \{\n      allow read: if signedIn\(\) && \(\n        isSuperAdmin\(\) \|\|\n        resource == null \|\|\n        resource\.data\.uid == request\.auth\.uid \|\|\n        isCompanyAdmin\(resource\.data\.companyId\)\n      \);\n      allow create: if signedIn\(\);\n      allow update: if signedIn\(\) && \(\n        isSuperAdmin\(\) \|\|\n        isCompanyAdmin\(resource\.data\.companyId\)\n      \);\n      allow delete: if isSuperAdmin\(\);\n    \}")
content = pattern.sub("", content)

with open('firestore.rules', 'w') as f:
    f.write(content)
