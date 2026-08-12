# LOG SHEET MUSTER — PHASE 46: ENTERPRISE API GATEWAY MODULE (100% COMPLETE)

Enterprise-grade, production-ready API Gateway Module for Log Sheet Muster. Exposes secure, rate-limited RESTful and Webhook APIs for enterprise clients and third-party developer integrations with OAuth2 client-credential authentication, granular scope authorization, token caching, and request/response logging.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Enterprise API Gateway collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/apiClients/{clientId}
/companies/{cid}/apiAccessTokens/{tokenId}
/companies/{cid}/apiAuditLogs/{logId}
```

### 1.1 `apiClients` (Third-Party Developer API Keys)
* **Path:** `/companies/{companyId}/apiClients/{clientId}`
* **Document ID:** `AKEY-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `clientId` | String | Yes | Unique Client ID |
| `companyId` | String | Yes | Tenant isolation key |
| `clientName` | String | Yes | E.g. `"Client ERP Sync Portal"` |
| `apiKeyHash` | String | Yes | Hashed Secret Key |
| `allowedScopes` | Array<String> | Yes | E.g. `["attendance.read", "roster.read", "invoices.read"]` |
| `rateLimitPerMin` | Number | Yes | Max requests per minute (e.g. `120`) |
| `isActive` | Boolean | Yes | Status |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **OAuth2 Token Exchange & Rate Limiting**: Third-party application passes `client_id` + `client_secret` -> Gateway issues 1-hour JWT token with embedded tenant `companyId` -> Validates token and enforces rate limits via Redis/Cloud Engine.

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /apiClients/{clientId} {
        allow read: if sameCompany(cid) && ownerTier();
        allow write: if sameCompany(cid) && ownerTier();
      }
    }
  }
}
```

---

**End of Phase 46: Enterprise API Gateway Module.**
