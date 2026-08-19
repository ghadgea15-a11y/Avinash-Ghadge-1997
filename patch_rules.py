import re

with open('firestore.rules', 'r') as f:
    content = f.read()

new_rules = """
      // GRC: Security Audit & Anomaly Detection
      match /security_events/{eventId} {
        allow read: if isSuperAdmin() || isCompanyAdmin(companyId);
        allow create: if signedIn() && (isSuperAdmin() || sameCompany(companyId)) 
                      && request.resource.data.companyId == companyId
                      && request.resource.data.userId == request.auth.uid; // Must use own userId
        // Backend can forge userId if needed, but from client must match. Wait, what about failed login? Failed login might not have auth.uid yet if not signed in, but we can't secure that easily on client.
        // Let's allow create if signedIn and sameCompany, or if SuperAdmin.
        allow update, delete: if false; // Append-only immutable audit log
      }

      match /security_anomalies/{anomalyId} {
        allow read: if isSuperAdmin() || isCompanyAdmin(companyId);
        // Only backend should ideally create anomalies, or if client creates them, they can't delete them.
        allow create: if signedIn() && (isSuperAdmin() || sameCompany(companyId));
        allow update: if signedIn() && (isSuperAdmin() || isCompanyAdmin(companyId));
        allow delete: if false;
      }
"""

if "match /security_events/{eventId}" not in content:
    content = content.replace("match /companies/{companyId} {\n", "match /companies/{companyId} {\n" + new_rules)

with open('firestore.rules', 'w') as f:
    f.write(content)
