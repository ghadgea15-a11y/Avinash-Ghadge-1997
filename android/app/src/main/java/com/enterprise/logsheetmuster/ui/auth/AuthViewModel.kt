package com.enterprise.logsheetmuster.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enterprise.logsheetmuster.data.model.CompanyTenant
import com.enterprise.logsheetmuster.data.model.UserSession
import com.enterprise.logsheetmuster.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class CompanyVerified(val company: CompanyTenant) : AuthState()
    data class Authenticated(val session: UserSession) : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthState>(AuthState.Idle)
    val uiState: StateFlow<AuthState> = _uiState

    private var activeCompanyId: String? = null

    fun verifyCompany(code: String) {
        viewModelScope.launch {
            _uiState.value = AuthState.Loading
            val result = repository.verifyCompanyCode(code)
            result.onSuccess { tenant ->
                activeCompanyId = tenant.companyId
                _uiState.value = AuthState.CompanyVerified(tenant)
            }.onFailure { error ->
                _uiState.value = AuthState.Error(error.message ?: "Verification failed")
            }
        }
    }

    fun login(email: String, pass: String) {
        val cid = activeCompanyId
        if (cid == null) {
            _uiState.value = AuthState.Error("Please verify company code first.")
            return
        }
        viewModelScope.launch {
            _uiState.value = AuthState.Loading
            val result = repository.loginWithEmail(email, pass, cid)
            result.onSuccess { session ->
                _uiState.value = AuthState.Authenticated(session)
            }.onFailure { error ->
                _uiState.value = AuthState.Error(error.message ?: "Login failed")
            }
        }
    }
}
