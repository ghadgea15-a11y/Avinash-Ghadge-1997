package com.enterprise.logsheetmuster.data.model

enum class UserRole {
    GUARD,
    FIELD_OFFICER,
    OPS_MANAGER,
    HR_ADMIN,
    COMPANY_ADMIN,
    SUPER_ADMIN
}

data class UserSession(
    val userId: String,
    val employeeId: String,
    val fullName: String,
    val email: String,
    val role: UserRole,
    val companyId: String,
    val branchId: String,
    val assignedSiteId: String? = null,
    val avatarUrl: String? = null,
    val token: String,
    val tokenExpiresAt: Long,
    val isBiometricEnabled: Boolean = false,
    val lastActiveAt: Long = System.currentTimeMillis()
)
