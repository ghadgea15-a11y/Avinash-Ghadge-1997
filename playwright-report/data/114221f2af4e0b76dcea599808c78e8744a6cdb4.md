# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: super-admin.spec.ts >> Platform Super Admin Flow >> should render Super Admin Dashboard successfully
- Location: tests-e2e/super-admin.spec.ts:10:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=/Platform Administration|Super Admin Dashboard/i').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=/Platform Administration|Super Admin Dashboard/i').first()

```

```yaml
- navigation:
  - link "LOG SHEET MUSTER":
    - /url: /
  - link "Product":
    - /url: /workforce-management
  - link "Solutions":
    - /url: /solutions/security-operations
  - link "Features":
    - /url: /features
  - link "Security":
    - /url: /security
  - link "Resources":
    - /url: /support
  - link "Company":
    - /url: /about
  - link "Pricing":
    - /url: /pricing
  - button "Login"
  - button "Get 3 Month Demo"
- main:
  - text: All-in-One Workforce & Facility Management Platform
  - heading "Command Your Workforce. Elevate Every Operation." [level=1]
  - paragraph: Log Sheet Muster is a next-generation platform to manage attendance, operations, assets, compliance, payroll, and more — all in one secure system.
  - button "Get 3 Month Demo"
  - button "Login to Web App"
  - text: Secure Reliable Scalable Muster Sync
  - paragraph: Designed for Multi-Tenant Workforce Operations & Facility Governance
  - text: MULTI-TENANT ISOLATION ZERO-TRUST RBAC REAL-TIME WEB & ANDROID STATUTORY FORM II COMPLIANCE OFFLINE FIELD LOGGING IMMUTABLE AUDIT TRAILS
  - heading "One Platform. Every Operation." [level=2]
  - paragraph: Power your entire organization with connected modules.
  - heading "Workforce Management" [level=3]
  - paragraph: End-to-end employee lifecycle management
  - heading "Attendance & WFM" [level=3]
  - paragraph: Real-time attendance, rosters & shift planning
  - heading "Operations & Security" [level=3]
  - paragraph: Visitor, patrols, incidents & safety management
  - heading "Assets & Maintenance" [level=3]
  - paragraph: Track assets, breakdowns, maintenance & warranty
  - heading "Inventory & SCM" [level=3]
  - paragraph: Stock, transfer, gate pass & inventory control
  - heading "Payroll & Compliance" [level=3]
  - paragraph: Automated payroll, statutory & compliance
  - heading "Reports & Intelligence" [level=3]
  - paragraph: Real-time dashboards & advanced analytics
  - text: Try Risk-Free
  - heading "Get 3 Months Free Demo" [level=2]
  - list:
    - listitem: Full platform access
    - listitem: All modules included
    - listitem: No credit card required
    - listitem: Cancel anytime
  - heading "No Commitment." [level=4]
  - paragraph: Just Results. Test our enterprise features in your own environment before deciding.
  - heading "Request Your 3-Month Free Demo" [level=3]
  - paragraph: Our team will contact you within 24 hours.
  - text: Full Name *
  - textbox "Enter your full name"
  - text: Work Email *
  - textbox "Enter your work email"
  - text: Company Name *
  - textbox "Enter company name"
  - text: Phone Number *
  - textbox "Enter phone number"
  - text: Designation
  - textbox "Your designation"
  - text: Number of Employees
  - combobox:
    - option "1-50" [selected]
    - option "51-200"
    - option "201-500"
    - option "500-1000"
    - option "1000+"
  - text: Your Message (Optional)
  - textbox "Tell us about your requirements..."
  - button "Submit Request"
  - heading "About Shourya Enterprises Pvt. Ltd." [level=2]
  - paragraph: Shourya Enterprises Pvt. Ltd. is committed to building technology that simplifies operations and empowers organizations to achieve excellence.
  - paragraph: Owner
  - paragraph: Avinash Ghadge
  - link "ghadgea162@gmail.com":
    - /url: mailto:ghadgea162@gmail.com
  - heading "Multi-Tenant Isolation" [level=4]
  - paragraph: Cryptographic data partition across enterprise accounts
  - heading "Role-Based Access" [level=4]
  - paragraph: Granular controls from Super Admin to Site Guards
  - heading "Real-Time Sync" [level=4]
  - paragraph: Instant synchronization across Web & Android apps
  - heading "Statutory Compliance" [level=4]
  - paragraph: Form II labor register & wage calculation compliance
  - heading "Enterprise-Grade Security" [level=2]
  - paragraph: Bank-level encryption and strict access controls to keep your operational data safe.
  - heading "Multi-Tenant Architecture" [level=3]
  - paragraph: Strict data isolation ensures your company data is completely partitioned from other organizations.
  - heading "Role-Based Access (RBAC)" [level=3]
  - paragraph: Granular permissions based on custom Firebase claims. Employees only see what they are authorized to see.
  - heading "Secure Infrastructure" [level=3]
  - paragraph: Powered by Firebase with robust security rules preventing unauthorized reads or writes.
  - heading "Audit Trails" [level=3]
  - paragraph: Immutable logs for every critical action, approval, or data mutation within the system.
  - heading "Data Isolation" [level=3]
  - paragraph: Site-level and Region-level scoping prevents supervisors from accessing unassigned territories.
  - heading "Frequently Asked Questions" [level=2]
  - button "What is Log Sheet Muster?"
  - button "Which industries can use Log Sheet Muster?"
  - button "Is my data secure?"
  - button "What is included in the 3-month demo?"
  - button "Can I cancel the demo anytime?"
  - button "How do I get support?"
  - heading "Contact for Demo" [level=3]
  - paragraph: Have questions? We are here to help.
  - link "ghadgea162@gmail.com":
    - /url: mailto:ghadgea162@gmail.com
  - text: Pune, Maharashtra, India
  - img
- contentinfo:
  - link "LOG SHEET MUSTER":
    - /url: /
  - paragraph: The unified operational operating system connecting enterprise workforce management, facility log sheets, security patrol muster, and statutory labor compliance.
  - text: Developed by
  - strong: Shourya Enterprises Pvt. Ltd.
  - text: "Founder: Avinash Shivaji Ghadge HQ: Ajanthanagar, Chinchwad, Pune, MH 411019 Email:"
  - link "ghadgea162@gmail.com":
    - /url: mailto:ghadgea162@gmail.com
  - text: "Phone:"
  - link "+91-9096345456":
    - /url: tel:+919096345456
  - button "Request Live Demo"
  - heading "Product" [level=4]
  - list:
    - listitem:
      - link "Workforce":
        - /url: /workforce
    - listitem:
      - link "Attendance":
        - /url: /attendance
    - listitem:
      - link "Operations":
        - /url: /operations
    - listitem:
      - link "Assets":
        - /url: /assets
    - listitem:
      - link "Inventory":
        - /url: /inventory
    - listitem:
      - link "Payroll":
        - /url: /payroll
    - listitem:
      - link "Compliance":
        - /url: /compliance
    - listitem:
      - link "Analytics":
        - /url: /analytics
  - heading "Solutions" [level=4]
  - list:
    - listitem:
      - link "Security":
        - /url: /solutions/security
    - listitem:
      - link "Facility Management":
        - /url: /solutions/facility-management
    - listitem:
      - link "Multi-Site Operations":
        - /url: /solutions/multi-site
    - listitem:
      - link "Industrial":
        - /url: /solutions/industrial
    - listitem:
      - link "Corporate":
        - /url: /solutions/corporate
    - listitem:
      - link "Contractors":
        - /url: /solutions/contractors
  - heading "Company" [level=4]
  - list:
    - listitem:
      - link "About":
        - /url: /about
    - listitem:
      - link "Careers":
        - /url: /careers
    - listitem:
      - link "Contact":
        - /url: /contact
    - listitem:
      - link "Partners":
        - /url: /partners
  - heading "Resources" [level=4]
  - list:
    - listitem:
      - link "FAQ":
        - /url: /faq
    - listitem:
      - link "Support":
        - /url: /support
    - listitem:
      - link "Documentation":
        - /url: /documentation
    - listitem:
      - link "Release Notes":
        - /url: /release-notes
  - paragraph: © 2026 Log Sheet Muster • Shourya Enterprises Pvt. Ltd. All rights reserved.
  - link "Privacy":
    - /url: /legal/privacy
  - link "Terms":
    - /url: /legal/terms
  - link "Cookies":
    - /url: /legal/cookies
  - link "Acceptable Use":
    - /url: /legal/acceptable-use
  - link "Data Protection":
    - /url: /legal/data-protection
  - link "Demo Terms":
    - /url: /legal/demo-terms
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { injectMockSession } from './test-helpers';
  3  | 
  4  | test.describe('Platform Super Admin Flow', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await injectMockSession(page, 'SUPER_ADMIN');
  7  |     await page.goto('/');
  8  |   });
  9  | 
  10 |   test('should render Super Admin Dashboard successfully', async ({ page }) => {
> 11 |     await expect(page.locator('text=/Platform Administration|Super Admin Dashboard/i').first()).toBeVisible({ timeout: 10000 });
     |                                                                                                 ^ Error: expect(locator).toBeVisible() failed
  12 |   });
  13 | });
  14 | 
```