package com.enterprise.logsheetmuster.ui.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object UpdateChecker : Screen("update_checker")
    object CompanyCode : Screen("company_code")
    object Login : Screen("login")
    object ForgotPassword : Screen("forgot_password")
    object SessionLock : Screen("session_lock")
    object RoleDashboard : Screen("role_dashboard")
}
