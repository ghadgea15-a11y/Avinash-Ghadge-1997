package com.enterprise.logsheetmuster.domain.repository

import com.enterprise.logsheetmuster.data.model.CompanyTenant
import com.enterprise.logsheetmuster.data.model.UserSession

interface AuthRepository {
    suspend fun verifyCompanyCode(companyCode: String): Result<CompanyTenant>
    suspend fun loginWithEmail(email: String, password: String, companyId: String): Result<UserSession>
    suspend fun logout()
    suspend fun getCurrentSession(): UserSession?
}
