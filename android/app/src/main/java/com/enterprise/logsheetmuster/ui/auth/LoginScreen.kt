package com.enterprise.logsheetmuster.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    onLoginSuccess: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    var companyCode by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(modifier = Modifier.padding(16.dp)) {
        if (state is AuthState.Idle || state is AuthState.Error) {
            TextField(value = companyCode, onValueChange = { companyCode = it }, label = { Text("Company Code") })
            Button(onClick = { viewModel.verifyCompany(companyCode) }) {
                Text("Verify Company")
            }
        }

        if (state is AuthState.CompanyVerified) {
            TextField(value = email, onValueChange = { email = it }, label = { Text("Email") })
            TextField(value = password, onValueChange = { password = it }, label = { Text("Password") })
            Button(onClick = { viewModel.login(email, password) }) {
                Text("Login")
            }
        }

        if (state is AuthState.Loading) {
            CircularProgressIndicator()
        }

        if (state is AuthState.Error) {
            Text("Error: ${(state as AuthState.Error).message}", color = MaterialTheme.colorScheme.error)
        }

        LaunchedEffect(state) {
            if (state is AuthState.Authenticated) {
                onLoginSuccess()
            }
        }
    }
}
