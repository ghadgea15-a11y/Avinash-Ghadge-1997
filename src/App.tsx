import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, UserRole } from './types';
import { SessionManager } from './services/sessionManager';
import { OfflineSyncService } from './services/offlineSyncService';
import { FirestoreService } from './services/firestoreService';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationDrawer } from './components/common/NavigationDrawer';
import { MobileTopHeader } from './components/common/MobileTopHeader';
import { TabletNavigationRail } from './components/common/TabletNavigationRail';
import { SplashScreen } from './components/screens/SplashScreen';
import { UpdateCheckerScreen } from './components/screens/UpdateCheckerScreen';
import { CompanyCodeScreen } from './components/screens/CompanyCodeScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { ForgotPasswordScreen } from './components/screens/ForgotPasswordScreen';
import { SessionLockScreen } from './components/screens/SessionLockScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { EmployeeModuleScreen } from './components/screens/EmployeeModuleScreen';

import { ClientManagementScreen } from './components/screens/ClientManagementScreen';
import { DeploymentManagementScreen } from './components/screens/DeploymentManagementScreen';
import { ShiftRosterScreen } from './components/screens/ShiftRosterScreen';

import { CompanyManagementScreen } from './components/screens/CompanyManagementScreen';
import { AttendanceShiftsScreen } from './components/screens/AttendanceShiftsScreen';
import { SiteOperationsScreen } from './components/screens/SiteOperationsScreen';
import { WorkOrdersScreen } from './components/screens/WorkOrdersScreen';
import { KotlinCodeViewer } from './components/screens/KotlinCodeViewer';
import { SignUpScreen } from './components/screens/SignUpScreen';
import { ApprovalPendingScreen } from './components/screens/ApprovalPendingScreen';
import { ApprovalManagementScreen } from './components/screens/ApprovalManagementScreen';
import { SuperAdminDashboard } from './components/screens/SuperAdminDashboard';
import { EnterpriseDashboardScreen } from './components/screens/EnterpriseDashboardScreen';
import { CompanyBillingScreen } from './components/screens/CompanyBillingScreen';
import { SuperAdminCreateCompany } from './components/screens/SuperAdminCreateCompany';
import { SuperAdminModulesScreen } from './components/screens/SuperAdminModulesScreen';
import { SuperAdminCompaniesScreen } from './components/screens/SuperAdminCompaniesScreen';
import { SuperAdminSubscriptionsScreen } from './components/screens/SuperAdminSubscriptionsScreen';
import { LandingPageScreen } from './components/screens/LandingPageScreen';
import { LegalPoliciesScreen } from './components/screens/LegalPoliciesScreen';
import { LeaveManagementScreen } from './components/screens/LeaveManagementScreen';
import { PayrollCompensationScreen } from './components/screens/PayrollCompensationScreen';
import { InventoryStockScreen } from './components/screens/InventoryStockScreen';
import { AssetTrackingScreen } from './components/screens/AssetTrackingScreen';
import { ServiceDeskScreen } from './components/screens/ServiceDeskScreen';
import { TalentAcquisitionScreen } from './components/screens/TalentAcquisitionScreen';
import { TrainingLmsScreen } from './components/screens/TrainingLmsScreen';
import { ProcurementSrmScreen } from './components/screens/ProcurementSrmScreen';

import { TaskManagementScreen } from './components/screens/TaskManagementScreen';
import { AnnouncementsScreen } from './components/screens/AnnouncementsScreen';
import { IdentityBadgeScreen } from './components/screens/IdentityBadgeScreen';
import { ComplianceDashboardScreen } from './components/screens/ComplianceDashboardScreen';
import { MyTasksScreen } from './components/screens/MyTasksScreen';

import { ReportsAnalyticsScreen } from './components/screens/ReportsAnalyticsScreen';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<PhaseAScreen>('LANDING');
  const [activeCompany, setActiveCompany] = useState<CompanyTenant | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(OfflineSyncService.isOnline());
  const [viewportMode, setViewportMode] = useState<'PHONE' | 'TABLET' | 'FULLSCREEN'>('PHONE');
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(OfflineSyncService.getQueue().length);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  // Initialize network & storage sync
  useEffect(() => {
    const unsub = OfflineSyncService.subscribe((onlineStatus) => {
      setIsOnline(onlineStatus);
    });

    const savedCompany = SessionManager.getActiveCompany();
    if (savedCompany) {
      setActiveCompany(savedCompany);
    }

    // Never auto-login on public app start - always protect application
    SessionManager.clearUserSession();
    setUserSession(null);

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      const currentSession = SessionManager.getUserSession();
      if (!fbUser && currentSession && currentSession.loginMode !== 'PIN') {
        // Firebase session expired or user logged out remotely
        SessionManager.clearUserSession();
        setUserSession(null);
        setCurrentScreen('LANDING');
      }
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  // Auto-detect screen size and set responsive viewport layout dynamically
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setViewportMode('FULLSCREEN');
      } else if (width >= 768) {
        setViewportMode('TABLET');
      } else {
        setViewportMode('PHONE');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Realtime notification monitor (authenticated only)
  useEffect(() => {
    if (userSession) {
      const unsub = FirestoreService.subscribeToNotifications(userSession.role, (notifs) => {
        setUnreadNotifCount(notifs.filter(n => !n.isRead).length);
      });
      return () => unsub();
    }
  }, [userSession]);

  // Sync queue count monitor
  useEffect(() => {
    const interval = setInterval(() => {
      setOfflineQueueCount(OfflineSyncService.getQueue().length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    SessionManager.clearUserSession();
    setUserSession(null);
    setCurrentScreen('LANDING');
    setIsDrawerOpen(false);
  };

  const handleLockSession = () => {
    if (userSession) {
      setCurrentScreen('SESSION_LOCK');
      setIsDrawerOpen(false);
    }
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    if (!userSession) return;
    const updatedSession: UserSession = {
      ...userSession,
      role: newRole
    };
    setUserSession(updatedSession);
    SessionManager.setUserSession(updatedSession);
    if (newRole === "SUPER_ADMIN") {
      setCurrentScreen("SUPER_ADMIN_DASHBOARD");
    } else if (newRole === "GUARD" || newRole === "FIELD_OFFICER") {
      setCurrentScreen("ATTENDANCE_SHIFTS");
    } else {
      setCurrentScreen("EMPLOYEES");
    }
  };

  const handleSyncOfflineQueue = async () => {
    await OfflineSyncService.syncPendingQueue();
    setOfflineQueueCount(OfflineSyncService.getQueue().length);
  };

  const isMainAppScreen = [
    'ENTERPRISE_DASHBOARD',
    'EMPLOYEES', 
    'ATTENDANCE_SHIFTS', 
    'LEAVE_MANAGEMENT',
    'PAYROLL_COMPENSATION',
    'INVENTORY_STOCK',
    'ASSET_TRACKING',
    'SITE_OPERATIONS', 
    'WORK_ORDERS',
    'REPORTS_ANALYTICS',
    'COMPANY_MANAGEMENT',
    'COMPANY_BILLING',
    'PROFILE', 
    'SETTINGS', 
    'NOTIFICATIONS',
    'SUPER_ADMIN_DASHBOARD',
    'SUPER_ADMIN_COMPANIES',
    'SUPER_ADMIN_COMPANY_DETAILS',
    'SUPER_ADMIN_USERS',
    'SUPER_ADMIN_CREATE_COMPANY',
    'SUPER_ADMIN_MODULES',
    'SUPER_ADMIN_PENDING_APPROVALS',
    'SUPER_ADMIN_SUBSCRIPTIONS',
    'APPROVAL_MANAGEMENT'
  ].includes(currentScreen);

  // Security guard: If unauthenticated and attempting to access protected screens, redirect to LANDING
  useEffect(() => {
    if (!userSession && isMainAppScreen) {
      setCurrentScreen('LANDING');
    }
  }, [userSession, isMainAppScreen]);

  return (
    <ThemeProvider>
      {/* 1. PUBLIC MARKETING WEBSITE: Rendered directly as a standalone full-width website */}
      {currentScreen === 'LANDING' ? (
        <div className="min-h-screen w-full font-sans transition-colors duration-200">
          <LandingPageScreen onNavigate={setCurrentScreen} />
        </div>
      ) : currentScreen === 'LEGAL_POLICIES' ? (
        /* Standalone Legal & Compliance Policy Center */
        <div className="min-h-screen w-full font-sans transition-colors duration-200">
          <LegalPoliciesScreen onNavigate={setCurrentScreen} />
        </div>
      ) : currentScreen === 'KOTLIN_CODE_VIEWER' ? (
        /* Standalone Kotlin Code Viewer */
        <div className="min-h-screen w-full bg-slate-950 text-white p-4">
          <div className="max-w-5xl mx-auto">
            <KotlinCodeViewer onBack={() => setCurrentScreen(userSession ? 'EMPLOYEES' : 'LANDING')} />
          </div>
        </div>
      ) : !userSession ? (
        /* 2. PUBLIC AUTHENTICATION SCREENS (Login, SignUp, ForgotPassword, Splash) */
        <div className="min-h-screen w-full flex flex-col justify-center items-center font-sans bg-slate-50 dark:bg-slate-950 transition-colors duration-200 p-4">
          <div className="w-full max-w-xl">
            {currentScreen === 'LOGIN' && (
              <LoginScreen
                onLoginSuccess={(session, company) => {
                  setActiveCompany(company);
                  setUserSession(session);
                  if (session.accountStatus === 'ACTIVE') {
                    if (session.role === 'SUPER_ADMIN') {
                      setCurrentScreen('SUPER_ADMIN_DASHBOARD');
                    } else {
                      setCurrentScreen('ENTERPRISE_DASHBOARD');
                    }
                  } else {
                    setCurrentScreen('APPROVAL_PENDING');
                  }
                }}
                onNavigate={setCurrentScreen}
              />
            )}

            {currentScreen === 'SIGN_UP' && (
              <SignUpScreen
                initialCompany={null}
                onSignUpSuccess={(session) => {
                  setUserSession(session);
                  if (session.accountStatus === 'ACTIVE') {
                    setCurrentScreen('ENTERPRISE_DASHBOARD');
                  } else {
                    setCurrentScreen('APPROVAL_PENDING');
                  }
                }}
                onNavigate={setCurrentScreen}
              />
            )}

            {currentScreen === 'FORGOT_PASSWORD' && (
              <ForgotPasswordScreen
                activeCompany={activeCompany}
                onNavigate={setCurrentScreen}
              />
            )}

            {currentScreen === 'SPLASH' && (
              <SplashScreen
                onComplete={(nextScreen) => setCurrentScreen(nextScreen)}
                isOnline={isOnline}
                activeCompany={activeCompany}
                userSession={userSession}
              />
            )}

            {currentScreen === 'COMPANY_CODE' && (
              <CompanyCodeScreen
                onCompanyVerified={(company) => {
                  setActiveCompany(company);
                  SessionManager.setActiveCompany(company);
                  setCurrentScreen('LOGIN');
                }}
                onNavigate={setCurrentScreen}
              />
            )}

            {currentScreen === 'UPDATE_CHECKER' && (
              <UpdateCheckerScreen
                onContinue={(nextScreen) => setCurrentScreen(nextScreen)}
              />
            )}
          </div>
        </div>
      ) : (
        /* 3. AUTHENTICATED WEB APPLICATION: Protected Enterprise Workstation */
        <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">
          {/* Slide-out Navigation Drawer for Authenticated Users */}
          <NavigationDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            currentScreen={currentScreen}
            onNavigate={(screen) => {
              setCurrentScreen(screen);
              setIsDrawerOpen(false);
            }}
            userSession={userSession}
            activeCompany={activeCompany}
            unreadNotifCount={unreadNotifCount}
            onRoleSwitch={handleRoleSwitch}
            onLockSession={handleLockSession}
            onLogout={handleLogout}
            isOnline={isOnline}
          />

          {/* Main Stage Area */}
          <main className="flex-1 flex flex-col w-full h-full bg-slate-50 dark:bg-slate-900">
            <div className="flex-1 w-full flex flex-col overflow-hidden relative">
              {/* Mobile Top Header */}
              {viewportMode === 'PHONE' && isMainAppScreen && (
                <MobileTopHeader
                  onOpenDrawer={() => setIsDrawerOpen(true)}
                  unreadNotifCount={unreadNotifCount}
                  onNavigateNotifications={() => setCurrentScreen('NOTIFICATIONS')}
                />
              )}

              <div className="flex-1 flex flex-row overflow-hidden w-full h-full relative">
                {/* Tablet or Desktop Navigation Rail (for larger viewports) */}
                {(viewportMode === 'TABLET' || viewportMode === 'FULLSCREEN') && isMainAppScreen && (
                  <TabletNavigationRail
                    currentScreen={currentScreen}
                    onNavigate={setCurrentScreen}
                    onOpenDrawer={() => setIsDrawerOpen(true)}
                    unreadNotifCount={unreadNotifCount}
                    userSession={userSession}
                    onRoleSwitch={handleRoleSwitch}
                  />
                )}

                {/* Inner Screen Content View */}
                <div className="flex-1 flex flex-col justify-between overflow-hidden relative w-full">
                  <div className="flex-1 overflow-y-auto w-full">
                    {currentScreen === 'SUPER_ADMIN_DASHBOARD' && (
                      <SuperAdminDashboard
                        currentSession={userSession}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_CREATE_COMPANY' && (
                      <SuperAdminCreateCompany
                        currentSession={userSession}
                        onNavigate={setCurrentScreen}
                        onCompanyCreated={(companyId) => {
                          setCurrentScreen('SUPER_ADMIN_DASHBOARD');
                        }}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_MODULES' && (
                      <SuperAdminModulesScreen
                        currentSession={userSession}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_COMPANIES' && (
                      <SuperAdminCompaniesScreen
                        currentSession={userSession}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_COMPANY_DETAILS' && (
                      <SuperAdminCompaniesScreen
                        currentSession={userSession}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_USERS' && (
                      <ApprovalManagementScreen
                        session={userSession}
                        onNavigateBack={() => setCurrentScreen('SUPER_ADMIN_DASHBOARD')}
                      />
                    )}

                    
            {currentScreen === 'SUPER_ADMIN_SUBSCRIPTIONS' && (
              <SuperAdminSubscriptionsScreen 
                userSession={userSession!} 
                onNavigate={setCurrentScreen} 
              />
            )}

            {currentScreen === 'SUPER_ADMIN_PENDING_APPROVALS' && (
                      <ApprovalManagementScreen
                        session={userSession}
                        onNavigateBack={() => setCurrentScreen('SUPER_ADMIN_DASHBOARD')}
                      />
                    )}

                    {currentScreen === 'APPROVAL_PENDING' && (
                      <ApprovalPendingScreen
                        session={userSession}
                        onApprovalComplete={(updatedSession) => {
                          setUserSession(updatedSession);
                          setCurrentScreen('ENTERPRISE_DASHBOARD');
                        }}
                        onSignOut={handleLogout}
                      />
                    )}
                    {currentScreen === 'ENTERPRISE_DASHBOARD' && activeCompany && (
                      <EnterpriseDashboardScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={setCurrentScreen}
                        onLogout={handleLogout}
                      />
                    )}

                    {currentScreen === 'APPROVAL_MANAGEMENT' && (
                      <ApprovalManagementScreen
                        session={userSession}
                        onNavigateBack={() => setCurrentScreen('EMPLOYEES')}
                      />
                    )}

                    {currentScreen === 'SESSION_LOCK' && (
                      <SessionLockScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onUnlockSuccess={() => setCurrentScreen('EMPLOYEES')}
                        onSwitchAccount={handleLogout}
                      />
                    )}

                    
                    {currentScreen === 'CLIENT_MANAGEMENT' && activeCompany && (
                      <ClientManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                      />
                    )}
                    {currentScreen === 'DEPLOYMENT_MANAGEMENT' && activeCompany && (
                      <DeploymentManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                      />
                    )}
                    {currentScreen === 'SHIFT_ROSTER' && activeCompany && (
                      <ShiftRosterScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                      />
                    )}

                    {currentScreen === 'EMPLOYEES' && (
                      <EmployeeModuleScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'ATTENDANCE_SHIFTS' && (
                      <AttendanceShiftsScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'LEAVE_MANAGEMENT' && (
                      <LeaveManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'PAYROLL_COMPENSATION' && (
                      <PayrollCompensationScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'INVENTORY_STOCK' && (
                      <InventoryStockScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    
                    {currentScreen === 'TASK_MANAGEMENT' && activeCompany && (
                      <TaskManagementScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'ID_BADGES' && activeCompany && (
                      <IdentityBadgeScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'COMPLIANCE' && activeCompany && (
                      <ComplianceDashboardScreen
                        userSession={userSession}
                      />
                    )}

                    {currentScreen === 'ANNOUNCEMENTS' && activeCompany && (
                      <AnnouncementsScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'MY_TASKS' && activeCompany && (
                      <MyTasksScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'ASSET_TRACKING' && (
                      <AssetTrackingScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SERVICE_DESK' && (
                      <ServiceDeskScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'TALENT_ACQUISITION' && (
                      <TalentAcquisitionScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'TRAINING_LMS' && (
                      <TrainingLmsScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'PROCUREMENT_SRM' && (
                      <ProcurementSrmScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SITE_OPERATIONS' && (
                      <SiteOperationsScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'WORK_ORDERS' && (
                      <WorkOrdersScreen
                        userSession={userSession}
                        activeCompany={activeCompany!}
                        isOnline={isOnline}
                      />
                    )}

                    {currentScreen === 'REPORTS_ANALYTICS' && activeCompany && (
                      <ReportsAnalyticsScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'COMPANY_BILLING' && (
                      <CompanyBillingScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'COMPANY_MANAGEMENT' && (
                      <CompanyManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onCompanyUpdated={(updated) => {
                          setActiveCompany(updated);
                          SessionManager.setActiveCompany(updated);
                        }}
                      />
                    )}

                    {currentScreen === 'PROFILE' && (
                      <ProfileScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                      />
                    )}

                    {currentScreen === 'SETTINGS' && (
                      <SettingsScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                        onClearCache={() => {
                          SessionManager.clearUserSession();
                          setUserSession(null);
                          setCurrentScreen('LANDING');
                        }}
                        viewportMode={viewportMode}
                        onToggleViewport={setViewportMode}
                        onLogout={handleLogout}
                        onLockSession={handleLockSession}
                        onOpenDrawer={() => setIsDrawerOpen(true)}
                      />
                    )}

                    {currentScreen === 'NOTIFICATIONS' && (
                      <NotificationsScreen
                        userSession={userSession}
                        onNavigate={setCurrentScreen}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </ThemeProvider>
  );
}

