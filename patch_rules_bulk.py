import re

with open('firestore.rules', 'r') as f:
    content = f.read()

new_rule = """
      match /bulk_export_alerts/{alertId} {
        allow read: if isSuperAdmin() || isCompanyAdmin(companyId);
        // Allow create by signed in user performing bulk/export operations in their company
        allow create: if signedIn() && (isSuperAdmin() || sameCompany(companyId));
        // Allow update only by super/company admins for review & resolution workflow
        allow update: if isSuperAdmin() || isCompanyAdmin(companyId);
        allow delete: if false; // Immutable governance records
      }
"""

if "match /bulk_export_alerts/{alertId}" not in content:
    content = content.replace("match /suspicious_punches/{punchId} {", new_rule.strip() + "\n\n      match /suspicious_punches/{punchId} {")

with open('firestore.rules', 'w') as f:
    f.write(content)
