import re

with open('firestore.rules', 'r') as f:
    content = f.read()

# Insert before audit_logs
new_rules = """
      match /suspicious_punches/{punchId} {
        allow read: if isSuperAdmin() || isCompanyAdmin(companyId);
        // Allow create by any signed in user (specifically employees creating their own punch anomalies via the engine)
        allow create: if signedIn();
        // Allow update only by admins (resolution workflow)
        allow update: if isSuperAdmin() || isCompanyAdmin(companyId);
        allow delete: if false; // Immutable detection
      }
"""

if "match /suspicious_punches/{punchId}" not in content:
    content = content.replace("match /audit_logs/{logId} {", new_rules.strip() + "\n\n      match /audit_logs/{logId} {")

with open('firestore.rules', 'w') as f:
    f.write(content)
