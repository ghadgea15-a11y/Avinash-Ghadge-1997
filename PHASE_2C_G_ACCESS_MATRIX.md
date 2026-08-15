# Phase 2C-G: Data Access Matrix (A0-A9)

| Role | Company Scope | Region Scope | Site Scope | Employee Scope | Attendance | Leave | Payroll | Inventory | Assets | Incidents | Visitors | Material Pass | Reports | Admin Functions |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **A0_OWNER** | All | All | All | All | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Full |
| **A1_DIRECTOR_CEO** | All | All | All | All | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Full |
| **A2_GENERAL_MANAGER** | All | All | All | All | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Operations |
| **A3_OFFICIAL_STAFF** (HR/Finance/Admin/etc.) | All (Functional) | All | All | All | Read | Read/Write | Read/Write (Finance) | Read | Read | Read | Read | Read | Read/Write | Module-specific |
| **A4_REGIONAL_AREA_MANAGER** | Tenant | Assigned Region | Assigned Region | Assigned Region | Read/Write | Read/Write | Read | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Regional | Regional Admin |
| **A5_SITE_IN_CHARGE** | Tenant | Parent Region | Assigned Site | Assigned Site | Read/Write | Read/Write | Read (Self/Site) | Read/Write | Read/Write | Read/Write | Read/Write | Read/Write | Site | Site Admin |
| **A6_SUPERVISOR** | Tenant | Parent Region | Assigned Site | Assigned Site | Read/Create | Read/Write | No | Read/Write | Read | Read/Write | Read/Write | Read/Write | Site Muster | Muster Entry |
| **A7_SKILLED** | Tenant | Parent Region | Assigned Site | Self Only | Self Read | Self Write | Self Pay | No | No | Read | No | No | Self | No |
| **A8_SEMI_SKILLED** | Tenant | Parent Region | Assigned Site | Self Only | Self Read | Self Write | Self Pay | No | No | Read | No | No | Self | No |
| **A9_SUPPORT** | Tenant | Parent Region | Assigned Site | Self Only | Self Read | Self Write | Self Pay | No | No | Read | No | No | Self | No |
