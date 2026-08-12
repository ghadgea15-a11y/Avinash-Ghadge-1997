# LOG SHEET MUSTER — PHASE 10: ENTERPRISE BILLING & CLIENT MANAGEMENT MODULE (100% COMPLETE)
Enterprise-grade, production-ready Billing & Client Management System for Log Sheet Muster. Fully integrated with Client Master, Sites, Muster Roll Attendance, Shift & Roster, Inventory Consumption, Tax Invoicing, Payments/Collections, Notifications, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All billing and client management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/clients/{clientId}
/companies/{cid}/clientContracts/{contractId}
/companies/{cid}/billingRateCards/{rateCardId}
/companies/{cid}/clientInvoices/{invoiceId}
/companies/{cid}/clientPayments/{paymentId}
/companies/{cid}/creditDebitNotes/{noteId}
/companies/{cid}/clientBillingHistory/{historyId}
```

---

### 1.1 `clients` (Client / Customer Master)
Master registry of corporate clients, contracting entities, billing addresses, tax numbers, and assigned key account managers.
* **Path:** `/companies/{companyId}/clients/{clientId}`
* **Document ID:** `CLI-{CODE}` or `CLI-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `clientId` | String | Yes | Unique Client ID |
| `companyId` | String | Yes | Tenant isolation key |
| `clientCode` | String | Yes | Client Short Code (e.g., `CLI-TATA-01`, `CLI-INFY-02`) |
| `name` | String | Yes | Registered Corporate Business Name |
| `industry` | String | Yes | Industry vertical (e.g. "IT Park", "Manufacturing", "Healthcare", "Hospitality") |
| `billingAddress` | Map | Yes | `{ street: String, city: String, state: String, postalCode: String, country: String, stateCode: String }` |
| `shippingAddress` | Map | Optional | Site location address |
| `contactPerson` | String | Yes | Primary client billing representative name |
| `email` | String | Yes | Official billing notification email address |
| `phone` | String | Yes | Primary phone number |
| `gstinTaxId` | String | Yes | GSTIN / TIN / Tax Identification Number |
| `panNumber` | String | Optional | Tax PAN Number |
| `paymentTermsDays` | Number | Yes | Credit period allowed in days (e.g., `15`, `30`, `60`, `90`) |
| `creditLimit` | Number | Yes | Maximum unbilled credit liability threshold |
| `currency` | String | Yes | Currency ISO code (e.g., `"INR"`, `"USD"`, `"AED"`) |
| `assignedAccountManagerUserId` | String | Yes | Internal Key Account Manager `userId` |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'SUSPENDED' \| 'TERMINATED'` |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic concurrency counter |
| `createdByUserId` | String | Yes | `userId` |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.2 `clientContracts` (Service Level Agreements & Commercial Contracts)
SLA contracts defining billing frequencies, billing models (Muster-roll per head, Fixed Monthly, Hourly Rate), and billing period terms.
* **Path:** `/companies/{companyId}/clientContracts/{contractId}`
* **Document ID:** `CNTR-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `contractId` | String | Yes | Unique Contract ID |
| `companyId` | String | Yes | Tenant isolation key |
| `clientId` | String | Yes | Reference to `/clients/{clientId}` |
| `contractNumber` | String | Yes | SLA contract number (e.g. `SLA-2026-TATA-01`) |
| `title` | String | Yes | Agreement title (e.g. "Security & Facility Staffing SLA 2026") |
| `startDate` | String | Yes | SLA start date `"YYYY-MM-DD"` |
| `endDate` | String | Yes | SLA end date `"YYYY-MM-DD"` |
| `billingCycle` | String | Yes | Enum: `'MONTHLY' \| 'BI_WEEKLY' \| 'FORTNIGHTLY' \| 'MILESTONE'` |
| `billingType` | String | Yes | Enum: `'MUSTER_ROLL_PER_HEAD' \| 'FIXED_MONTHLY' \| 'HOURLY_RATE' \| 'HYBRID_STAFF_MATERIAL'` |
| `fixedMonthlyAmount` | Number | Optional | Fixed monthly lump sum if `billingType == 'FIXED_MONTHLY'` |
| `overtimeBillingRateMultiplier` | Number | Yes | Overtime billing multiplier (e.g., `1.5` for 150% rate) |
| `holidayBillingRateMultiplier` | Number | Yes | Holiday billing rate multiplier (e.g., `2.0` for 200% rate) |
| `penaltyClauseRules` | Map | Optional | `{ lateMarkDeductionRate: Number, absentUnreplacedPenalty: Number }` |
| `autoGenerateInvoice` | Boolean | Yes | True if invoice engine auto-drafts invoice on 1st of month |
| `status` | String | Yes | Enum: `'DRAFT' \| 'ACTIVE' \| 'EXPIRED' \| 'TERMINATED'` |
| `version` | Number | Yes | Concurrency counter |

---

### 1.3 `billingRateCards` (Master Rate Cards per Designation/Site)
Commercial billing rates charged to clients per head/day/hour based on deployment designation and shift type.
* **Path:** `/companies/{companyId}/billingRateCards/{rateCardId}`
* **Document ID:** `RCARD-{contractId}-{designationId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `rateCardId` | String | Yes | Rate Card ID |
| `companyId` | String | Yes | Tenant isolation key |
| `clientId` | String | Yes | Reference to `/clients/{clientId}` |
| `contractId` | String | Yes | Reference to `/clientContracts/{contractId}` |
| `siteId` | String | Optional | Target site location ID (null = all client sites) |
| `designationId` | String | Yes | Reference to `/designations/{designationId}` |
| `shiftType` | String | Yes | Enum: `'ALL' \| 'DAY' \| 'NIGHT' \| 'SPLIT'` |
| `ratePer8HrShift` | Number | Yes | Standard 8-hour shift billing rate per head |
| `ratePerHour` | Number | Yes | Base hourly billing rate |
| `overtimeRatePerHour` | Number | Yes | Overtime hourly billing rate |
| `nightShiftAllowanceBilling` | Number | Optional | Extra billing charge for night shifts |
| `effectiveFrom` | String | Yes | Effective date `"YYYY-MM-DD"` |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |

---

### 1.4 `clientInvoices` (Tax Invoices & Proforma Billing Documents)
Itemized tax invoices automatically calculated from finalized Muster Rolls, Overtime, and Material Consumption.
* **Path:** `/companies/{companyId}/clientInvoices/{invoiceId}`
* **Document ID:** `INV-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `invoiceId` | String | Yes | Unique Invoice ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Issuing Branch ID |
| `clientId` | String | Yes | Reference to `/clients/{clientId}` |
| `contractId` | String | Yes | Reference to `/clientContracts/{contractId}` |
| `siteId` | String | Optional | Site location ID |
| `invoiceNumber` | String | Yes | Sequential Tax Invoice Number (e.g. `INV-202607-0089`) |
| `invoiceType` | String | Yes | Enum: `'TAX_INVOICE' \| 'PROFORMA_INVOICE' \| 'RECURRING_MONTHLY'` |
| `billingPeriod` | String | Yes | Month `"YYYY-MM"` |
| `issueDate` | String | Yes | Issue date `"YYYY-MM-DD"` |
| `dueDate` | String | Yes | Due date `"YYYY-MM-DD"` based on client credit terms |
| `lineItems` | Array<Map> | Yes | `[{ description: String, designationId: String, totalHeads: Number, totalShifts: Number, rate: Number, totalAmount: Number, taxRate: Number, taxAmount: Number }]` |
| `musterRollSummary` | Map | Yes | `{ totalBilledShifts: Number, totalBilledOtHours: Number, totalAbsentDays: Number }` |
| `subTotal` | Number | Yes | Net amount before taxes |
| `cgstAmount` | Number | Yes | Central GST amount |
| `sgstAmount` | Number | Yes | State GST amount |
| `igstAmount` | Number | Yes | Integrated GST amount (for inter-state billing) |
| `totalTax` | Number | Yes | Total tax amount |
| `discountAmount` | Number | Yes | Commercial discount deduction |
| `grandTotal` | Number | Yes | Final Payable Amount: `subTotal + totalTax - discountAmount` |
| `paidAmount` | Number | Yes | Sum of verified client payments received to date |
| `tdsDeductedAmount` | Number | Yes | Tax Deducted at Source (TDS) withheld by client |
| `balanceDue` | Number | Yes | Net Outstanding Balance: `grandTotal - paidAmount - tdsDeductedAmount` |
| `paymentStatus` | String | Yes | Enum: `'UNPAID' \| 'PARTIALLY_PAID' \| 'PAID' \| 'OVERDUE' \| 'CANCELLED'` |
| `pdfStoragePath` | String | Optional | Storage path to generated Invoice PDF |
| `pdfDownloadUrl` | String | Optional | Signed download URL |
| `status` | String | Yes | Enum: `'DRAFT' \| 'SUBMITTED' \| 'APPROVED' \| 'SENT_TO_CLIENT' \| 'PAID' \| 'CANCELLED'` |
| `approvalInstanceRef` | String | Yes | Approval Engine reference |
| `createdByUserId` | String | Yes | Billing Officer user ID |
| `approvedByUserId` | String | Optional | Finance Manager user ID |
| `version` | Number | Yes | Concurrency counter |

---

### 1.5 `clientPayments` (Payment Receipts & Collections)
Client payment receipts tracking cheque/NEFT/RTGS payments, TDS deductions, and bank reconciliations.
* **Path:** `/companies/{companyId}/clientPayments/{paymentId}`
* **Document ID:** `RCPT-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `paymentId` | String | Yes | Unique Payment Receipt ID |
| `companyId` | String | Yes | Tenant isolation key |
| `clientId` | String | Yes | Reference to `/clients/{clientId}` |
| `invoiceId` | String | Yes | Reference to `/clientInvoices/{invoiceId}` |
| `receiptNumber` | String | Yes | Money Receipt ID (e.g. `RCPT-202607-0045`) |
| `paymentDate` | String | Yes | Date payment received `"YYYY-MM-DD"` |
| `amountPaid` | Number | Yes | Actual cash/bank amount received |
| `tdsDeductedByClient` | Number | Yes | TDS amount deducted by client (Section 194C) |
| `discrepancyDeduction` | Number | Optional | Penalty / short-payment deduction by client |
| `paymentMode` | String | Yes | Enum: `'BANK_TRANSFER_NEFT' \| 'CHEQUE' \| 'CREDIT_CARD' \| 'UPI'` |
| `transactionReference` | String | Yes | Bank UTR / Cheque number / Payment Gateway ID |
| `bankName` | String | Yes | Client bank name |
| `status` | String | Yes | Enum: `'RECEIVED' \| 'VERIFIED_RECONCILED' \| 'CHEQUE_BOUNCED' \| 'REFUNDED'` |
| `recordedByUserId` | String | Yes | Accounts Officer user ID |
| `verifiedByUserId` | String | Optional | Finance Manager user ID |
| `version` | Number | Yes | Counter |

---

### 1.6 `creditDebitNotes` (Financial Adjustments)
Credit notes (for short deployment / penalty refunds) or Debit notes (for extra unscheduled deployment / material charges).
* **Path:** `/companies/{companyId}/creditDebitNotes/{noteId}`
* **Document ID:** `CDN-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `noteId` | String | Yes | Unique Note ID |
| `companyId` | String | Yes | Tenant isolation key |
| `clientId` | String | Yes | Reference to `/clients/{clientId}` |
| `invoiceId` | String | Yes | Linked Invoice ID |
| `type` | String | Yes | Enum: `'CREDIT_NOTE' \| 'DEBIT_NOTE'` |
| `noteNumber` | String | Yes | Document number (e.g. `CN-202607-0012`) |
| `amount` | Number | Yes | Adjustment amount |
| `taxAmount` | Number | Yes | Tax adjustment |
| `reason` | String | Yes | Justification (e.g. "Guard Shortage Penalty Adjustment", "Unscheduled Emergency Deployment") |
| `issueDate` | String | Yes | Issue date `"YYYY-MM-DD"` |
| `status` | String | Yes | Enum: `'DRAFT' \| 'APPROVED' \| 'APPLIED_TO_INVOICE'` |
| `approvalInstanceRef` | String | Yes | Approval Engine reference |

---

### 1.7 `clientBillingHistory` (Immutable Billing Audit Log)
* **Path:** `/companies/{companyId}/clientBillingHistory/{historyId}`
* **Document ID:** `CBHIST-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `historyId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `invoiceId` | String | Optional | Linked invoice ID |
| `actorUserId` | String | Yes | User who performed action |
| `action` | String | Yes | Enum: `'GENERATE_INVOICE' \| 'APPROVE_INVOICE' \| 'RECORD_PAYMENT' \| 'BOUNCE_CHEQUE' \| 'APPLY_CREDIT_NOTE'` |
| `beforeState` | Map | Optional | State before modification |
| `afterState` | Map | Yes | State after modification |
| `reason` | String | Yes | Explanation |
| `timestamp` | Timestamp | Yes | Server timestamp |

---

## 2. BUSINESS LOGIC & AUTOMATED BILLING ENGINE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   ENTERPRISE CLIENT BILLING ENGINE                       │
├─────────────────┬──────────────────┬─────────────────┬───────────────────┤
│ 1. Muster Roll  │ 2. Tax Invoice   │ 3. Client       │ 4. Receivables    │
│ & Rate Card     │ Generation & PDF │ Payment & Bank  │ Aging & Overdue   │
│ Ingestion       │ Engine           │ Reconciliation  │ Escalation Engine │
└────────┬────────┴────────┬─────────┴────────┬────────┴─────────┬─────────┘
         │                 │                  │                  │
         └─────────────────┴────────┬─────────┴──────────────────┘
                                    ▼
                   [ Automated Invoice Generation Engine ]
                   - Pulls Locked Muster Roll (`/musterRolls`) for month M.
                   - Aggregates Total Shifts worked per Designation/Site.
                   - Multiplies Billed Shifts by `/billingRateCards` rates.
                   - Applies Overtime (OT) multipliers and Holiday premiums.
                   - Calculates Intra-State (CGST + SGST) or Inter-State (IGST).
                   - Generates Tax Invoice PDF with Company Stamp & QR.
                   - Sends Automated Email & FCM Push to Client & Account Mgr.
```

---

### 2.1 Muster-Roll to Invoice Calculation Formula
For a given client site and billing period $M$:
1. **Standard Shift Billing Amount:**
   $$\text{Base Shift Billing} = \sum_{\text{Designations}} (\text{Total Billed Shifts} \times \text{Rate Per 8-Hr Shift})$$
2. **Overtime Billing Amount:**
   $$\text{OT Billing} = \sum (\text{Billed OT Hours} \times \text{Hourly Rate} \times \text{OT Multiplier})$$
3. **Gross Invoice Amount Before Tax:**
   $$\text{SubTotal} = \text{Base Shift Billing} + \text{OT Billing} + \text{Material Charges} - \text{Penalty Deductions}$$
4. **GST Tax Calculation:**
   * If `supplierStateCode == clientBillingStateCode`:
     $$\text{CGST} = \text{SubTotal} \times 9\%, \quad \text{SGST} = \text{SubTotal} \times 9\%$$
   * If Inter-State:
     $$\text{IGST} = \text{SubTotal} \times 18\%$$
5. **Grand Total Invoice Amount:**
   $$\mathbf{Grand Total} = \mathbf{SubTotal + Total Tax}$$

---

### 2.2 Payment Reconciliation & Receivables Aging Engine
* Whenever a `/clientPayments` record is created:
  * Transactional Cloud Function `reconcileClientPayment`:
    * Updates `/clientInvoices` `paidAmount` and `tdsDeductedAmount`.
    * Recalculates `balanceDue = grandTotal - paidAmount - tdsDeductedAmount`.
    * If `balanceDue == 0`, transitions `paymentStatus` to `'PAID'`.
    * If `balanceDue > 0`, sets `paymentStatus` to `'PARTIALLY_PAID'`.
* **Receivables Aging Cloud Scheduler:**
  * Evaluates overdue invoices daily.
  * Categories aging buckets: `Current (0-30 days)`, `Overdue (31-60 days)`, `Critical (61-90 days)`, `Defaulted (90+ days)`.
  * Triggers escalation alerts to Key Account Managers and Finance Directors.

---

## 3. FIRESTORE SECURITY RULES (BILLING & CLIENT MODULE)

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
    function mgmtTier()  { return roleAtLeast(['companyOwner','admin','hr','manager','finance']); }
    function opsTier()   { return roleAtLeast(['companyOwner','admin','hr','manager','incharge','supervisor','finance']); }

    match /companies/{cid} {

      // --- CLIENT MASTER ---
      match /clients/{clientId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      // --- CONTRACTS & RATE CARDS ---
      match /clientContracts/{contractId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /billingRateCards/{rateCardId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      // --- INVOICES ---
      match /clientInvoices/{invoiceId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && mgmtTier();
        allow delete: if false;
      }

      // --- PAYMENTS & RECEIPTS ---
      match /clientPayments/{paymentId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && mgmtTier();
        allow delete: if false;
      }

      // --- CREDIT & DEBIT NOTES ---
      match /creditDebitNotes/{noteId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow create, update: if sameCompany(cid) && mgmtTier();
        allow delete: if false;
      }

      // --- BILLING HISTORY (AUDIT) ---
      match /clientBillingHistory/{histId} {
        allow read: if sameCompany(cid) && ownerTier();
        allow write: if false; // Cloud Functions exclusively
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (BILLING & CLIENT MODULE)

```json
{
  "indexes": [
    {
      "collectionGroup": "clientContracts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "clientInvoices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "paymentStatus", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "clientInvoices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "billingPeriod", "order": "DESCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "clientPayments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "paymentDate", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 5. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_MUSTER_UNFINALIZED` | Cannot generate invoice. Attendance Muster Roll for site/period is not locked. | Lock Muster Roll in Attendance Module before running billing. |
| `ERR_MISSING_RATE_CARD` | No active billing rate card found for employee designation on contract. | Create active rate card in `/billingRateCards` for target designation. |
| `ERR_INVOICE_ALREADY_PAID` | Payment modification blocked. Linked invoice is already FULLY PAID. | Issue Credit / Debit note for financial adjustments. |
| `ERR_CREDIT_LIMIT_EXCEEDED` | Client unbilled receivables exceed assigned commercial credit limit. | Request credit limit expansion or obtain payment before generating new invoice. |

---

**End of Phase 10: Enterprise Billing & Client Management Module (100% Complete).**
