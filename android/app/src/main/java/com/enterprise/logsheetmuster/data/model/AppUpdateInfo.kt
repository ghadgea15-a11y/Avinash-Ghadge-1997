package com.enterprise.logsheetmuster.data.model

data class AppUpdateInfo(
    val currentVersion: String = "v1.0.0",
    val latestVersion: String = "v1.0.0",
    val isMandatory: Boolean = false,
    val releaseNotes: List<String> = emptyList(),
    val downloadUrl: String = "",
    val releasedAt: String = ""
)
