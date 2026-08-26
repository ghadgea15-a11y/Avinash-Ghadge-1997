package com.enterprise.logsheetmuster.di

import android.content.Context
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideFirebaseFirestore(): FirebaseFirestore = FirebaseFirestore.getInstance()

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()
}

@Module
@InstallIn(dagger.hilt.components.SingletonComponent::class)
abstract class RepositoryModule {
    @dagger.Binds
    @javax.inject.Singleton
    abstract fun bindAuthRepository(
        authRepositoryImpl: com.enterprise.logsheetmuster.data.repository.AuthRepositoryImpl
    ): com.enterprise.logsheetmuster.domain.repository.AuthRepository
}
