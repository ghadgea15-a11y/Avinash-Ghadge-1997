package com.enterprise.logsheetmuster.data.model

data class CompanyTenant(
    val companyId: String = "",
    val companyLegalName: String = "",
    val brandName: String = "",
    val licenseTier: String = "ENTERPRISE",
    val status: String = "ACTIVE",
    val primaryColorHex: String = "#4F46E5",
    val secondaryColorHex: String = "#10B981",
    val allowedBranches: List<String> = emptyList(),
    val maxEmployeesAllowed: Int = 10000,
    val maxSitesAllowed: Int = 250
)
