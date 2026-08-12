# LOG SHEET MUSTER — PHASE 49: ENTERPRISE WHITE-LABEL PLATFORM MODULE (100% COMPLETE)

Enterprise-grade, production-ready White-Label Platform Module for Log Sheet Muster. Allows enterprise security agencies to fully rebrand Log Sheet Muster with custom branding (agency logo, favicons, custom domain e.g. `app.apexsecurity.com`, custom primary/secondary color palettes, custom mobile app splash screens, and feature toggles).

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All White-Label Platform configurations are stored per company under `/companies/{companyId}/whiteLabel/config`.

```
/companies/{cid}/whiteLabel/config
```

### 1.1 `config` (Tenant Custom Branding Document)
* **Path:** `/companies/{companyId}/whiteLabel/config`
* **Document ID:** `config`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `companyId` | String | Yes | Tenant isolation key |
| `brandName` | String | Yes | Display Agency Name |
| `logoLightStorageId` | String | Yes | Logo for light mode |
| `logoDarkStorageId` | String | Yes | Logo for dark mode |
| `primaryColorHex` | String | Yes | Custom primary theme color e.g. `"#0F172A"` |
| `secondaryColorHex` | String | Yes | Custom secondary accent e.g. `"#2563EB"` |
| `customDomain` | String | Optional | Custom CNAME domain e.g. `"portal.securityagency.com"` |
| `supportEmail` | String | Yes | Custom agency support email |
| `enabledModuleFlags` | Map | Yes | `{ "biometrics": true, "aiCamera": false, "visitorPortal": true }` |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **Dynamic Theme & Brand Injection**: Upon user authentication, client app fetches `/whiteLabel/config` -> Dynamically updates CSS variables, logos, page titles, and hides disabled feature tabs.

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /whiteLabel/{docId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && ownerTier();
      }
    }
  }
}
```

---

**End of Phase 49: Enterprise White-Label Platform Module.**
