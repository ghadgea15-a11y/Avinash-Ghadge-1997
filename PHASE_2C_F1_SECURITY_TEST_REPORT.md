# Phase 2C-F.1: Security Test Report (Local Mock Suite)

## 1. Test Results Summary
| Test Case ID | Scenario | Expected Result | Actual Local Result | Status |
|---|---|---|---|---|
| TC-01 | A0 Owner Company Access | ALLOW | ALLOW | **PASS** |
| TC-02 | A3 HR Authorized Module Access | ALLOW | ALLOW | **PASS** |
| TC-03 | A3 HR Unauthorized Finance Write | DENY | DENY | **PASS** |
| TC-04 | A4 Region A to Region B Access | DENY | DENY | **PASS** |
| TC-05 | A5 Site A to Site B Access | DENY | DENY | **PASS** |
| TC-06 | A6 Site A Attendance Creation | ALLOW | ALLOW | **PASS** |
| TC-07 | A6 Site A to Site B Attendance | DENY | DENY | **PASS** |
| TC-08 | A6 Records Attendance for A9 Worker | ALLOW | ALLOW | **PASS** |
| TC-09 | A9 Support Self Attendance | ALLOW | ALLOW | **PASS** |
| TC-10 | A9 Support accessing Worker B Payroll | DENY | DENY | **PASS** |
| TC-11 | Terminated User Access | DENY | DENY | **PASS** |
| TC-12 | Manual SESSION-* Token Access | DENY | DENY | **PASS** |
| TC-13 | Forged Authority Level (`A0` claim on `A9`) | DENY | DENY | **PASS** |

## 2. Conclusion
All local mock security test cases passed successfully. The claim-backed design properly restricts unauthorized cross-site, cross-region, and privilege escalation attempts.
