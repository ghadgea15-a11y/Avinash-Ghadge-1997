package com.enterprise.logsheetmuster.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "lsm_user_prefs")

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val KEY_USER_SESSION = stringPreferencesKey("user_session_token")
        val KEY_COMPANY_CODE = stringPreferencesKey("company_code")
        val KEY_BIOMETRIC_BOUND = stringPreferencesKey("biometric_bound")
    }

    suspend fun saveCompanyCode(companyCode: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_COMPANY_CODE] = companyCode
        }
    }

    val companyCodeFlow: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[KEY_COMPANY_CODE]
    }

    suspend fun saveSessionToken(token: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_USER_SESSION] = token
        }
    }

    val sessionTokenFlow: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[KEY_USER_SESSION]
    }

    suspend fun clearSession() {
        context.dataStore.edit { prefs ->
            prefs.remove(KEY_USER_SESSION)
        }
    }
}
