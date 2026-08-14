package com.enterprise.logsheetmuster.data.repository

import com.enterprise.logsheetmuster.data.local.SessionManager
import com.enterprise.logsheetmuster.data.model.CompanyTenant
import com.enterprise.logsheetmuster.data.model.UserRole
import com.enterprise.logsheetmuster.data.model.UserSession
import com.enterprise.logsheetmuster.domain.repository.AuthRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    private val sessionManager: SessionManager
) : AuthRepository {

    override suspend fun verifyCompanyCode(companyCode: String): Result<CompanyTenant> {
        val cleanCode = companyCode.trim().uppercase()
        if (cleanCode.isEmpty()) return Result.failure(Exception("Company Code is mandatory."))

        return try {
            // 1. Direct document lookup in 'companies' collection
            val companySnap = firestore.collection("companies").document(cleanCode).get().await()
            if (companySnap.exists()) {
                val status = companySnap.getString("status") ?: "ACTIVE"
                if (status != "ACTIVE") {
                    return Result.failure(Exception("Company Code is inactive or expired"))
                }
                
                val tenant = CompanyTenant(
                    companyId = companySnap.getString("companyId") ?: cleanCode,
                    companyLegalName = companySnap.getString("companyLegalName") ?: cleanCode,
                    brandName = companySnap.getString("brandName") ?: cleanCode,
                    licenseTier = companySnap.getString("licenseTier") ?: "ENTERPRISE",
                    status = status,
                    primaryColorHex = companySnap.getString("primaryColorHex") ?: "#4f46e5",
                    secondaryColorHex = companySnap.getString("secondaryColorHex") ?: "#06b6d4"
                )
                sessionManager.saveCompanyCode(tenant.companyId)
                return Result.success(tenant)
            }

            // 2. Lookup in 'company_codes' mapping
            val codeMappingSnap = firestore.collection("company_codes").document(cleanCode).get().await()
            if (codeMappingSnap.exists()) {
                val mappedCompanyId = codeMappingSnap.getString("companyId") ?: cleanCode
                val targetSnap = firestore.collection("companies").document(mappedCompanyId).get().await()
                if (targetSnap.exists()) {
                    val status = targetSnap.getString("status") ?: "ACTIVE"
                    if (status != "ACTIVE") {
                        return Result.failure(Exception("Company Code is inactive or expired"))
                    }
                    val tenant = CompanyTenant(
                        companyId = targetSnap.getString("companyId") ?: mappedCompanyId,
                        companyLegalName = targetSnap.getString("companyLegalName") ?: mappedCompanyId,
                        brandName = targetSnap.getString("brandName") ?: mappedCompanyId,
                        licenseTier = targetSnap.getString("licenseTier") ?: "ENTERPRISE",
                        status = status,
                        primaryColorHex = targetSnap.getString("primaryColorHex") ?: "#4f46e5",
                        secondaryColorHex = targetSnap.getString("secondaryColorHex") ?: "#06b6d4"
                    )
                    sessionManager.saveCompanyCode(tenant.companyId)
                    return Result.success(tenant)
                }
            }

            Result.failure(Exception("Invalid Company Code"))
        } catch (e: Exception) {
            val msg = e.message?.lowercase() ?: ""
            if (msg.contains("offline") || msg.contains("unavailable") || msg.contains("timeout")) {
                Result.failure(Exception("Network offline: Unable to verify company code. Please connect to the internet."))
            } else {
                Result.failure(Exception("Failed to verify company code: ${e.localizedMessage}"))
            }
        }
    }

    override suspend fun loginWithEmail(email: String, password: String, companyId: String): Result<UserSession> {
        val cleanEmail = email.trim().lowercase()
        return try {
            val authResult = auth.signInWithEmailAndPassword(cleanEmail, password).await()
            val fbUser = authResult.user ?: return Result.failure(Exception("Authentication failed"))

            try {
                val userSnap = firestore.collection("users").document(fbUser.uid).get().await()
                if (!userSnap.exists()) {
                    return Result.failure(Exception("Account not found. Please register or wait for approval."))
                }

                val uCompanyId = userSnap.getString("companyId")
                val uRoleStr = userSnap.getString("role")

                if (uCompanyId != null && uCompanyId != companyId && uRoleStr != "SUPER_ADMIN") {
                    return Result.failure(Exception("User is not authorized for company: $companyId"))
                }

                val accountStatus = userSnap.getString("accountStatus") ?: "PENDING"
                if (accountStatus == "SUSPENDED" || accountStatus == "REJECTED") {
                    return Result.failure(Exception("Account is ${accountStatus.lowercase()}."))
                }

                val role = try { UserRole.valueOf(uRoleStr ?: throw Exception("Account has no assigned role.")) } catch (e: Exception) { throw Exception("Account has an invalid role.") }
                val employeeId = userSnap.getString("employeeId") ?: "EMP-${fbUser.uid.take(6).uppercase()}"
                val fullName = userSnap.getString("fullName") ?: fbUser.displayName ?: cleanEmail.substringBefore("@")
                val branchId = userSnap.getString("branchId") ?: "MAIN_BRANCH"
                val assignedSiteId = userSnap.getString("assignedSiteId")
                val userCompanyId = uCompanyId ?: companyId

                val token = fbUser.getIdToken(true).await().token ?: ""
                val session = UserSession(
                    userId = fbUser.uid,
                    employeeId = employeeId,
                    fullName = fullName,
                    email = cleanEmail,
                    role = role,
                    companyId = userCompanyId,
                    branchId = branchId,
                    assignedSiteId = assignedSiteId,
                    token = token,
                    tokenExpiresAt = System.currentTimeMillis() + (12 * 60 * 60 * 1000),
                    lastActiveAt = System.currentTimeMillis()
                )

                sessionManager.saveSessionToken(token)
                Result.success(session)
            } catch (e: Exception) {
                val msg = e.message?.lowercase() ?: ""
                if (msg.contains("offline") || msg.contains("unavailable") || msg.contains("timeout")) {
                    Result.failure(Exception("Network offline. Unable to verify user profile."))
                } else {
                    Result.failure(Exception(e.message ?: "Profile verification failed"))
                }
            }
        } catch (e: Exception) {
            Result.failure(Exception("Invalid email or password. Please verify your login details."))
        }
    }

    override suspend fun logout() {
        auth.signOut()
        sessionManager.clearSession()
    }

    override suspend fun getCurrentSession(): UserSession? {
        // Implementation omitted for brevity in this audit patch
        return null
    }
}
