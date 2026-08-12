# LOG SHEET MUSTER — PHASE 14: ENTERPRISE NOTIFICATION ENGINE MODULE (100% COMPLETE)
Enterprise-grade, production-ready Notification Engine for Log Sheet Muster. Fully integrated across all company modules: Employee Master, Attendance, Leave, Shift & Roster, Payroll, Inventory & Procurement, Asset Management, Billing & Clients, Operations, Dashboards, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All notification collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/notificationTemplates/{templateId}
/companies/{cid}/notifications/{notificationId}
/companies/{cid}/userNotificationPreferences/{prefId}
/companies/{cid}/fcmTokens/{tokenId}
/companies/{cid}/notificationLogs/{logId}
```

---

### 1.1 `notificationTemplates` (Notification Master Templates)
Template registry mapping system event triggers to localized notification content, parameters, action deep-links, and multi-channel delivery configuration (FCM Push, In-App Bell, Email, SMS/WhatsApp).
* **Path:** `/companies/{companyId}/notificationTemplates/{templateId}`
* **Document ID:** `NTMPL-{EVENT_CODE}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `templateId` | String | Yes | Template ID |
| `companyId` | String | Yes | Tenant isolation key |
| `eventCode` | String | Yes | Unique Event Trigger Code (e.g., `EVT_ATT_GEOFENCE_BREACH`, `EVT_PAY_PAYSLIP_RELEASED`, `EVT_INV_LOW_STOCK`, `EVT_OPS_CRITICAL_INCIDENT`, `EVT_BIL_INVOICE_OVERDUE`) |
| `titleTemplate` | String | Yes | Interpolated title string (e.g. `"Geofence Breach Alert: {employeeName}"`, `"Payslip Released: {payPeriod}"`) |
| `bodyTemplate` | String | Yes | Interpolated body string (e.g. `"{employeeName} clocked in {distanceMeters}m outside designated site boundary at {siteName}."`) |
| `channels` | Array<String> | Yes | Delivery channels array: `["FCM_PUSH", "IN_APP_BELL", "EMAIL", "SMS", "WHATSAPP"]` |
| `priority` | String | Yes | Enum: `'LOW' \| 'NORMAL' \| 'HIGH' \| 'CRITICAL_URGENT'` |
| `actionDeepLink` | Map | Yes | `{ screen: String, targetModule: String, queryParams: Map }` |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `version` | Number | Yes | Concurrency counter |

---

### 1.2 `notifications` (In-App Notification Center & Bell Counter)
User-specific in-app notification records powering the notification bell, unread indicators, and mobile push history.
* **Path:** `/companies/{companyId}/notifications/{notificationId}`
* **Document ID:** `NOTIF-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `notificationId` | String | Yes | Unique Notification ID |
| `companyId` | String | Yes | Tenant isolation key |
| `recipientUserId` | String | Yes | Target user ID |
| `eventCode` | String | Yes | Reference to event trigger code |
| `title` | String | Yes | Rendered title text |
| `body` | String | Yes | Rendered body text |
| `priority` | String | Yes | Enum: `'LOW' \| 'NORMAL' \| 'HIGH' \| 'CRITICAL_URGENT'` |
| `actionDeepLink` | Map | Optional | Action payload `{ screen: "IncidentDetails", docId: "INC-102" }` |
| `isRead` | Boolean | Yes | Read flag (false by default) |
| `readAt` | Timestamp | Optional | Timestamp when user opened notification |
| `createdAt` | Timestamp | Yes | Server creation timestamp |
| `expiresAt` | Timestamp | Optional | Retention expiration timestamp |

---

### 1.3 `userNotificationPreferences` (Channel & Quiet Hours Preferences)
User-controlled settings governing which channels are active per notification category and quiet hours duration.
* **Path:** `/companies/{companyId}/userNotificationPreferences/{prefId}`
* **Document ID:** `NPREF-{userId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `prefId` | String | Yes | `NPREF-{userId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `userId` | String | Yes | User ID |
| `channelPreferences` | Map | Yes | `{ pushEnabled: true, emailEnabled: true, smsEnabled: false, whatsappEnabled: true }` |
| `categoryPreferences` | Map | Yes | `{ attendanceAlerts: true, payrollAlerts: true, inventoryAlerts: true, operationsAlerts: true }` |
| `quietHoursConfig` | Map | Optional | `{ enabled: true, startTime: "22:00", endTime: "06:00", allowCriticalEmergency: true }` |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.4 `fcmTokens` (Firebase Cloud Messaging Device Registration)
Active Android phone/tablet FCM registration tokens for real-time mobile push delivery.
* **Path:** `/companies/{companyId}/fcmTokens/{tokenId}`
* **Document ID:** `FCM-{userId}-{deviceId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `tokenId` | String | Yes | Token ID |
| `companyId` | String | Yes | Tenant isolation key |
| `userId` | String | Yes | Target user ID |
| `fcmToken` | String | Yes | Unique FCM registration token string |
| `deviceType` | String | Yes | Enum: `'ANDROID_PHONE' \| 'ANDROID_TABLET' \| 'WEB'` |
| `deviceModel` | String | Optional | Device model (e.g. "Samsung Galaxy Tab A8") |
| `appVersion` | String | Yes | App build version |
| `lastActiveAt` | Timestamp | Yes | Last ping timestamp |

---

### 1.5 `notificationLogs` (Delivery & Dispatch Audit Trail)
Auditing delivery receipts across FCM, SendGrid Email, and Twilio SMS/WhatsApp providers.
* **Path:** `/companies/{companyId}/notificationLogs/{logId}`
* **Document ID:** `NLOG-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `logId` | String | Yes | Unique Log ID |
| `companyId` | String | Yes | Tenant isolation key |
| `notificationId` | String | Yes | Reference to `/notifications/{notificationId}` |
| `channel` | String | Yes | Enum: `'FCM_PUSH' \| 'EMAIL' \| 'SMS' \| 'WHATSAPP'` |
| `providerMessageId` | String | Optional | External API provider message ID |
| `deliveryStatus` | String | Yes | Enum: `'DISPATCHED' \| 'DELIVERED' \| 'FAILED' \| 'BOUNCED'` |
| `failureReason` | String | Optional | Error message if delivery failed |
| `dispatchedAt` | Timestamp | Yes | Dispatch timestamp |

---

## 2. FIRESTORE SECURITY RULES (NOTIFICATION ENGINE)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function claims() { return request.auth.token; }
    function isSignedIn() { return request.auth != null; }
    function companyId() { return claims().companyId; }
    function role() { return claims().role; }
    function sameCompany(cid) { return isSignedIn() && companyId() == cid; }
    function roleAtLeast(list) { return role() in list; }

    function ownerTier() { return roleAtLeast(['companyOwner','admin']); }
    function mgmtTier()  { return roleAtLeast(['companyOwner','admin','hr','manager']); }

    match /companies/{cid} {

      // --- NOTIFICATION TEMPLATES ---
      match /notificationTemplates/{templateId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      // --- IN-APP NOTIFICATIONS ---
      match /notifications/{notifId} {
        allow read, update: if sameCompany(cid) && (
          request.auth.uid == resource.data.recipientUserId || mgmtTier()
        );
        allow create: if sameCompany(cid) && isSignedIn();
        allow delete: if sameCompany(cid) && ownerTier();
      }

      // --- USER PREFERENCES & FCM TOKENS ---
      match /userNotificationPreferences/{prefId} {
        allow read, write: if sameCompany(cid) && (
          request.auth.uid == resource.data.userId || mgmtTier()
        );
      }

      match /fcmTokens/{tokenId} {
        allow read, write: if sameCompany(cid) && (
          request.auth.uid == resource.data.userId || mgmtTier()
        );
      }

      // --- NOTIFICATION LOGS ---
      match /notificationLogs/{logId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if false; // Cloud Functions exclusively
      }
    }
  }
}
```

---

## 3. FIRESTORE COMPOSITE INDEXES (NOTIFICATION ENGINE)

```json
{
  "indexes": [
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "recipientUserId", "order": "ASCENDING" },
        { "fieldPath": "isRead", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "fcmTokens",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "lastActiveAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 4. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_FCM_TOKEN_EXPIRED` | Target device FCM registration token is invalid or expired. | Mobile app auto-refreshes FCM token upon next launch. |
| `ERR_QUIET_HOURS_BLOCKED` | Non-critical notification suppressed due to active user quiet hours configuration. | Notification queued for morning delivery. |

---

**End of Phase 14: Enterprise Notification Engine Module (100% Complete).**
