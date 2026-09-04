import fs from 'fs';

const filePath = 'src/services/superAdminService.ts';
let code = fs.readFileSync(filePath, 'utf8');

const addSuperAdminNew = `
  static async addSuperAdmin(
    adminData: { email: string; name?: string; role?: PlatformRole; mfaEnabled?: boolean },
    createdByUid?: string,
    createdByEmail?: string
  ): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Must be logged in.");
    
    const idToken = await currentUser.getIdToken(true);
    const response = await fetch('/api/admin/create-super-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${idToken}\`
      },
      body: JSON.stringify(adminData)
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to provision super admin');
    }
    return result.uid;
  }
`;

const removeSuperAdminNew = `
  static async removeSuperAdmin(
    adminUid: string,
    revokedByUid?: string,
    revokedByEmail?: string
  ): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Must be logged in.");
    
    const idToken = await currentUser.getIdToken(true);
    const response = await fetch('/api/admin/remove-super-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${idToken}\`
      },
      body: JSON.stringify({ uid: adminUid })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to revoke super admin');
    }
    return true;
  }
`;

// Simple regex replace
code = code.replace(/static async addSuperAdmin\([\s\S]*?\} catch \(uErr\) \{[\s\S]*?\}\n  \}/, addSuperAdminNew.trim());
code = code.replace(/static async removeSuperAdmin\([\s\S]*?return true;\n    \} catch \(err\) \{[\s\S]*?return false;\n    \}\n  \}/, removeSuperAdminNew.trim());

fs.writeFileSync(filePath, code);
console.log("Patched SuperAdminService");
