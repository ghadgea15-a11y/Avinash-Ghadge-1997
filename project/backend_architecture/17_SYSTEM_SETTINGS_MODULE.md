# LOG SHEET MUSTER — PHASE 16: ENTERPRISE SYSTEM SETTINGS & FEATURE FLAGS MODULE (100% COMPLETE)

Enterprise-grade, production-ready System Settings & Feature Flags Engine for Log Sheet Muster. Fully integrated across all modules to control global behavior, regional compliance, third-party integrations, and dynamic feature rollouts.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All system settings collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/systemSettings/{settingId}
/companies/{cid}/featureFlags/{flagId}
/companies/{cid}/complianceSettings/{settingId}
/companies/{cid}/integrationSettings/{integrationId}
```

### 1.1 `systemSettings` (Global Configuration & Branding)
Stores core company-wide preferences, localization defaults, fiscal configurations, and white-label branding.
* **Path:** `/companies/{companyId}/systemSettings/{settingId}`
* **Document ID:** `CORE_CONFIG` or `BRANDING_CONFIG`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `settingId` | String | Yes | ID of the setting profile |
| `companyId` | String | Yes | Tenant isolation key |
| `fiscalYearStartMonth` | Number | Yes | Month index (e.g., `4` for April to March) |
| `baseCurrency` | String | Yes | ISO currency code (e.g., `"INR"`, `"USD"`) |
| `defaultTimezone` | String | Yes | TZ identifier (e.g., `"Asia/Kolkata"`) |
| `dateFormat` | String | Yes | E.g., `"DD/MM/YYYY"` |
| `companyLogoUrl` | String | Optional | URL to white-label branding logo |
| `primaryColorHex` | String | Optional | UI theme branding color |
| `supportEmail` | String | Yes | Helpdesk email for employees |
| `updatedByUserId` | String | Yes | Admin `userId` who last modified |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

### 1.2 `featureFlags` (Module Toggles & Feature Rollouts)
Controls the activation of specific modules (e.g., Payroll, Billing) and beta features dynamically without code deployment.
* **Path:** `/companies/{companyId}/featureFlags/{flagId}`
* **Document ID:** `FLAG-{featureCode}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `flagId` | String | Yes | Unique Flag ID |
| `companyId` | String | Yes | Tenant isolation key |
| `featureCode` | String | Yes | E.g., `ENABLE_PAYROLL_MODULE`, `BETA_AI_ROSTER` |
| `isEnabled` | Boolean | Yes | True if the feature is globally active for the company |
| `allowedRoles` | Array<String> | Optional | If active, restrict to specific roles (e.g. `["companyOwner"]` for testing) |
| `description` | String | Yes | What this flag controls |
| `updatedByUserId` | String | Yes | Admin `userId` |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

### 1.3 `complianceSettings` (Statutory & Legal Configurations)
Regional statutory limits, tax rules, minimum wages, and compliance thresholds applicable globally or per state.
* **Path:** `/companies/{companyId}/complianceSettings/{settingId}`
* **Document ID:** `COMP-{regionCode}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `settingId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `regionCode` | String | Yes | E.g., `"GLOBAL"`, `"IN-MH"` |
| `minimumWagePerShift` | Number | Yes | Minimum statutory wage constraint |
| `maxOvertimeHoursPerWeek` | Number | Yes | Legal cap on overtime (e.g., `12` hours) |
| `providentFundRate` | Number | Optional | Statutory PF deduction rate |
| `esiRate` | Number | Optional | Statutory ESI deduction rate |
| `retirementAge` | Number | Optional | Standard retirement age |
| `updatedByUserId` | String | Yes | Admin `userId` |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

### 1.4 `integrationSettings` (External API & Webhook Configs)
Secure storage for third-party API keys (e.g., Payment Gateways, SMS Providers, Biometric Devices) and webhook endpoints.
* **Path:** `/companies/{companyId}/integrationSettings/{integrationId}`
* **Document ID:** `INT-{providerCode}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `integrationId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `providerCode` | String | Yes | E.g., `TWILIO_SMS`, `STRIPE_PAYMENTS`, `BIOMETRIC_ESSL` |
| `isActive` | Boolean | Yes | Toggle integration status |
| `configPayload` | Map | Yes | Encrypted or restricted key-value pairs (e.g., `{ apiKey: "***", endpoint: "https://api..." }`) |
| `webhookUrl` | String | Optional | Callback URL for inbound events |
| `updatedByUserId` | String | Yes | Admin `userId` |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Feature Flag Evaluation
* Mobile/Web client reads `featureFlags` on startup and caches them.
* UI conditionally renders modules (e.g., Hide Payroll tab if `ENABLE_PAYROLL_MODULE` is false).
* Backend Cloud Functions validate operations against flags (e.g., Block `/payrollRuns` creation if flag is disabled).

### 2.2 Compliance Validation Engine
* Before approving a Roster, the system checks `complianceSettings.maxOvertimeHoursPerWeek`.
* If a guard exceeds the legal overtime limit, the Roster triggers a `WARNING` or blocks submission based on severity configuration.

---

## 3. FIRESTORE SECURITY RULES (SETTINGS & FLAGS)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ...
    match /companies/{cid} {
      match /systemSettings/{settingId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && ownerTier();
      }

      match /featureFlags/{flagId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && ownerTier();
      }

      match /complianceSettings/{settingId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier(); // HR/Admin can update compliance
      }

      match /integrationSettings/{integrationId} {
        allow read: if sameCompany(cid) && ownerTier(); // Strictly restricted
        allow write: if sameCompany(cid) && ownerTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (SETTINGS & FLAGS)

```json
{
  "indexes": [
    {
      "collectionGroup": "featureFlags",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "isEnabled", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "complianceSettings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "regionCode", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 16: Enterprise System Settings & Feature Flags Module (100% Complete).**
