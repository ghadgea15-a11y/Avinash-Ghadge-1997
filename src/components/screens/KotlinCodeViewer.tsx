import React, { useState } from 'react';
import { Code2, Copy, Check, FileCode, Folder, Search, ArrowLeft } from 'lucide-react';

interface KotlinCodeViewerProps {
  onBack: () => void;
}

const KOTLIN_FILES = [
  {
    path: 'app/src/main/java/com/enterprise/logsheetmuster/MainActivity.kt',
    label: 'MainActivity.kt',
    code: `package com.enterprise.logsheetmuster

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import com.enterprise.logsheetmuster.ui.navigation.NavGraph
import com.enterprise.logsheetmuster.ui.theme.LogSheetMusterTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            LogSheetMusterTheme(darkTheme = true) {
                Surface(color = MaterialTheme.colorScheme.background) {
                    NavGraph()
                }
            }
        }
    }
}`
  },
  {
    path: 'ui/screens/splash/SplashScreen.kt',
    label: 'SplashScreen.kt',
    code: `package com.enterprise.logsheetmuster.ui.screens.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun SplashScreen(
    viewModel: SplashViewModel = hiltViewModel(),
    onNavigateNext: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.isComplete) {
        if (state.isComplete) {
            onNavigateNext(state.nextDestination)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "LOG SHEET MUSTER",
                style = MaterialTheme.typography.headlineLarge,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(16.dp))
            CircularProgressIndicator(color = Color(0xFF6366F1))
        }
    }
}`
  },
  {
    path: 'data/repository/CompanyRepository.kt',
    label: 'CompanyRepository.kt',
    code: `package com.enterprise.logsheetmuster.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CompanyRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {
    suspend fun verifyCompanyCode(companyCode: String): Result<CompanyTenant> {
        return try {
            const cleanCode = companyCode.trim().uppercase()
            val snapshot = firestore.collection("companies").document(cleanCode).get().await()
            if (snapshot.exists()) {
                val company = snapshot.toObject(CompanyTenant::class.java)
                Result.success(company!!)
            } else {
                Result.failure(Exception("Company Code not found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}`
  },
  {
    path: 'data/local/SessionManager.kt',
    label: 'SessionManager.kt',
    code: `package com.enterprise.logsheetmuster.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "user_session_prefs")

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val KEY_USER_SESSION = stringPreferencesKey("user_session_json")
        val KEY_COMPANY_CODE = stringPreferencesKey("company_code")
    }

    suspend fun saveSession(sessionJson: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_USER_SESSION] = sessionJson
        }
    }

    val userSessionFlow: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[KEY_USER_SESSION]
    }
}`
  }
];

export const KotlinCodeViewer: React.FC<KotlinCodeViewerProps> = ({ onBack }) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const selectedFile = KOTLIN_FILES[selectedFileIdx];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between p-4 font-sans">
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Code2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Native Kotlin Jetpack Compose Code</h3>
              <p className="text-[10px] text-slate-400">Phase A Android Source Code Files</p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* File Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 shrink-0">
          {KOTLIN_FILES.map((f, i) => (
            <button
              key={f.path}
              onClick={() => setSelectedFileIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedFileIdx === i
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        {/* Code Editor Preview */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-indigo-200 overflow-y-auto leading-relaxed whitespace-pre select-text">
          {selectedFile.code}
        </div>
      </div>
    </div>
  );
};
