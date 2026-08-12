# LOG SHEET MUSTER — PHASE 19: ENTERPRISE SEARCH & FILTER ENGINE MODULE (100% COMPLETE)

Enterprise-grade, production-ready Search & Filter Engine for Log Sheet Muster. This module provides global search capabilities, saved filter presets, and complex query configurations across all modules (Employees, Attendance, Billing, Inventory).

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All search-related metadata and saved filters are multi-tenant and isolated under `/companies/{companyId}/`. While the actual search queries run against the core module collections, these collections manage user preferences, saved searches, and search analytics.

```
/companies/{cid}/savedFilters/{filterId}
/companies/{cid}/searchHistory/{searchId}
/companies/{cid}/globalSearchIndexes/{indexId}
```

### 1.1 `savedFilters` (User & Role Specific Saved Searches)
Allows users to save complex filter configurations (e.g., "All Present Night Shift Guards in Mumbai", "Unpaid Invoices > $5000") for one-click reuse.
* **Path:** `/companies/{companyId}/savedFilters/{filterId}`
* **Document ID:** `SFILTER-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `filterId` | String | Yes | Unique Filter ID |
| `companyId` | String | Yes | Tenant isolation key |
| `userId` | String | Yes | Owner of the saved filter |
| `module` | String | Yes | Target module (e.g., `'EMPLOYEE'`, `'ATTENDANCE'`, `'BILLING'`) |
| `filterName` | String | Yes | Display name (e.g., "Pending High-Value Invoices") |
| `queryPayload` | Map | Yes | `{ status: ["PENDING"], amountMin: 5000, sortBy: "dueDate", sortDir: "ASC" }` |
| `isShared` | Boolean | Yes | True if shared with other users in the same role |
| `createdAt` | Timestamp | Yes | Creation timestamp |

### 1.2 `searchHistory` (Recent Searches & Autocomplete)
Maintains a log of recent searches per user to power the global search bar's "Recent Searches" drop-down.
* **Path:** `/companies/{companyId}/searchHistory/{searchId}`
* **Document ID:** `SHIST-{userId}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `searchId` | String | Yes | Unique Search ID |
| `companyId` | String | Yes | Tenant isolation key |
| `userId` | String | Yes | User who performed the search |
| `searchQuery` | String | Yes | The literal string searched (e.g., `"EMP-1024"`, `"Tata Motors"`) |
| `targetModule` | String | Optional | Module filter applied, if any |
| `timestamp` | Timestamp | Yes | Time of search (used to sort recent searches) |

### 1.3 `globalSearchIndexes` (Denormalized Multi-Module Search Index)
Optional helper collection for high-speed global search across multiple modules (Employees, Clients, Assets) using a single query, acting as a lightweight reverse-index or entity registry.
* **Path:** `/companies/{companyId}/globalSearchIndexes/{indexId}`
* **Document ID:** `IDX-{entityType}-{entityId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `indexId` | String | Yes | Index ID |
| `companyId` | String | Yes | Tenant isolation key |
| `entityType` | String | Yes | Enum: `'EMPLOYEE' \| 'CLIENT' \| 'ASSET' \| 'SITE'` |
| `entityId` | String | Yes | Original document ID |
| `searchTerms` | Array<String> | Yes | Array of lowercase n-grams or keywords for text matching |
| `displayTitle` | String | Yes | Main title to show in results (e.g., "Rahul Sharma (EMP-102)") |
| `displaySubtitle` | String | Yes | Secondary info (e.g., "Site: Mumbai HQ") |
| `route` | String | Yes | Deep link to entity (e.g., `/employees/EMP-102`) |
| `updatedAt` | Timestamp | Yes | Last synced time |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Global Search Execution
* When a user types in the global search bar, the client queries `globalSearchIndexes` where `searchTerms array-contains query.toLowerCase()`.
* The results are grouped by `entityType` and displayed in the UI drop-down.
* Choosing a result navigates to the `route` provided.

### 2.2 Advanced Filtering
* For list views (e.g., Employee Master), complex composite queries are constructed dynamically based on the active `savedFilters` payload.
* Requires exact composite indexes in Firestore for multi-field filtering.

---

## 3. FIRESTORE SECURITY RULES (SEARCH ENGINE)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ...
    match /companies/{cid} {
      match /savedFilters/{filterId} {
        allow read: if sameCompany(cid) && (resource.data.userId == request.auth.uid || resource.data.isShared == true);
        allow write: if sameCompany(cid) && request.auth.uid == request.resource.data.userId;
      }

      match /searchHistory/{searchId} {
        allow read, write: if sameCompany(cid) && request.auth.uid == resource.data.userId;
      }

      match /globalSearchIndexes/{indexId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if false; // Updated strictly via Cloud Functions matching core module changes
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (SEARCH ENGINE)

```json
{
  "indexes": [
    {
      "collectionGroup": "savedFilters",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "module", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "searchHistory",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "globalSearchIndexes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "searchTerms", "arrayConfig": "CONTAINS" },
        { "fieldPath": "entityType", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 19: Enterprise Search & Filter Engine Module (100% Complete).**
