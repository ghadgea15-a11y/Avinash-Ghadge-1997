# Phase 2C-M: Security Test & Verification Report

## 1. Overview
This report documents the security emulator evaluation results for `firestore.rules.phase2c-m` across the 24 mandated test scenarios in the Phase 2C-M specification.

## 2. Security Test Matrix Results

| Test ID | Test Scenario | Token State / Action | Expected Result | Verified Result |
|---|---|---|---|---|
| **ST-01** | Unauthenticated Protected Read | Unauthenticated GET on `/companies/C1/employees/E1` | DENY | **PASSED** |
| **ST-02** | Unauthenticated Protected Write | Unauthenticated WRITE on `/companies/C1/attendance_logs/A1` | DENY | **PASSED** |
| **ST-03** | Cross-Company Access | Token `cId: "COMP_A"`, GET on `/companies/COMP_B/employees/E1` | DENY | **PASSED** |
| **ST-04** | Regional Manager Cross-Region | Token `aLvl: "A4", rId: "REG_A"`, GET on `/companies/C1/employees` in `REG_B` | DENY | **PASSED** |
| **ST-05** | Site Manager Cross-Site | Token `aLvl: "A5", sId: "SITE_A"`, GET on `/companies/C1/sites/SITE_B/inventory` | DENY | **PASSED** |
| **ST-06** | Supervisor Cross-Site Muster | Token `aLvl: "A6", sId: "SITE_A"`, CREATE attendance at `SITE_B` | DENY | **PASSED** |
| **ST-07** | Valid Supervisor Muster | Token `aLvl: "A6", sId: "SITE_A"`, CREATE attendance for worker at `SITE_A` | ALLOW | **PASSED** |
| **ST-08** | Ground Worker Directory Access | Token `aLvl: "A9", employeeId: "EMP_1"`, GET on another worker `EMP_2` | DENY | **PASSED** |
| **ST-09** | Ground Worker Payroll Read | Token `aLvl: "A9", employeeId: "EMP_1"`, GET on `/payroll` collection | DENY | **PASSED** |
| **ST-10** | A3 HR Unauthorized Payroll Access | Token `aLvl: "A3", dId: "HR"`, WRITE on `/payroll` | DENY | **PASSED** |
| **ST-11** | A3 Finance Unauthorized Employee Mod | Token `aLvl: "A3", dId: "FINANCE"`, UPDATE on `/employees` sensitive fields | DENY | **PASSED** |
| **ST-12** | Valid A0 Company Access | Token `aLvl: "A0_OWNER", cId: "C1"`, READ/WRITE on company C1 | ALLOW | **PASSED** |
| **ST-13** | Valid A4 Regional Access | Token `aLvl: "A4", rId: "REG_A"`, READ on `REG_A` site logs | ALLOW | **PASSED** |
| **ST-14** | Valid A5 Site Access | Token `aLvl: "A5", sId: "SITE_A"`, READ/WRITE on `SITE_A` inventory | ALLOW | **PASSED** |
| **ST-15** | Valid A6 Supervisor Workflow | Token `aLvl: "A6", sId: "SITE_A"`, CREATE incident report at `SITE_A` | ALLOW | **PASSED** |
| **ST-16** | Missing `cId` Claim | Token missing `cId` claim, access protected resource | DENY | **PASSED** |
| **ST-17** | Missing `aLvl` Claim | Token missing `aLvl` claim, access protected resource | DENY | **PASSED** |
| **ST-18** | Missing `rId` for Regional Op | Token `aLvl: "A4"` without `rId`, access regional data | DENY | **PASSED** |
| **ST-19** | Missing `sId` for Site Op | Token `aLvl: "A5"` without `sId`, access site data | DENY | **PASSED** |
| **ST-20** | Forged Client Payload Role | Token `aLvl: "A9"`, request payload specifies `role: "ADMIN"` | DENY | **PASSED** |
| **ST-21** | Forged Client Payload CompanyId | Token `cId: "COMP_A"`, request payload specifies `companyId: "COMP_B"` | DENY | **PASSED** |
| **ST-22** | Legacy SESSION-* Token | Authentication using legacy session token header | DENY | **PASSED** |
| **ST-23** | Cross-Company Query | Query on `/companies/COMP_B/attendance_logs` by COMP_A user | DENY | **PASSED** |
| **ST-24** | Company Code Unauthenticated Lookup | Unauthenticated GET on `/company_codes/MUSTER-101` | ALLOW | **PASSED** |

## 3. Summary
All 24 security test cases pass 100%. `firestore.rules.phase2c-m` enforces zero-trust claim-backed security without trusting client payload parameters or exposing cross-tenant data.

---
*No production resources were modified during Phase 2C-M.*
