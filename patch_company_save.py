import re

with open('src/components/screens/CompanyManagementScreen.tsx', 'r') as f:
    content = f.read()

# Add import for updateDoc if not there
if "updateDoc" not in content:
    content = content.replace("import { doc, getDoc, setDoc } from 'firebase/firestore';", "import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';")

# replace the onClick
old_onclick = r'''onClick=\{\(\) => \{
                onCompanyUpdated && onCompanyUpdated\(tenantInfo as any\);
                alert\("Branding saved to session for demo\."\);
              \}\}'''
new_onclick = r'''onClick={async () => {
                try {
                  if (tenantInfo) {
                    const { doc, updateDoc } = await import('firebase/firestore');
                    const { db } = await import('../../firebase');
                    await updateDoc(doc(db, 'companies', tenantInfo.companyId), {
                      brandName: tenantInfo.brandName || '',
                      tagline: tenantInfo.tagline || '',
                      primaryColorHex: tenantInfo.primaryColorHex || '',
                      logoUrl: tenantInfo.logoUrl || '',
                      loginBackgroundUrl: tenantInfo.loginBackgroundUrl || ''
                    });
                    if (onCompanyUpdated) onCompanyUpdated(tenantInfo as any);
                    alert("Branding saved successfully.");
                  }
                } catch (e) {
                  alert("Failed to save branding.");
                }
              }}'''

content = re.sub(old_onclick, new_onclick, content)

with open('src/components/screens/CompanyManagementScreen.tsx', 'w') as f:
    f.write(content)
