import re

with open('src/services/scmService.ts', 'r') as f:
    content = f.read()

content = content.replace("doc(collection(db, 'companies', companyId, 'notifications'))", "doc(collection(db, 'companies', companyId, 'notifications'))")

print("Done")
