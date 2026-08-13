import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, UserRole } from './types';
import { SessionManager } from './services/sessionManager';
import { OfflineSyncService } from './services/offlineSyncService';
import { FirestoreService } from './services/firestoreService';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/common/Header';
import { NavigationDrawer } from './components/common/NavigationDrawer';
import { BottomNavigationBar } from './components/common/BottomNavigationBar';
import { TabletNavigationRail } from './components/common/TabletNavigationRail';
import { SplashScreen } from './components/screens/SplashScreen';
import { UpdateCheckerScreen } from './components/screens/UpdateCheckerScreen';
import { CompanyCodeScreen } from './components/screens/CompanyCodeScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { ForgotPasswordScreen } from './components/screens/ForgotPasswordScreen';
import { SessionLockScreen } from './components/screens/SessionLockScreen';
import { RoleDashboardScreen } from './components/screens/RoleDashboardScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { EmployeeModuleScreen } from './components/screens/EmployeeModuleScreen';
import { CompanyManagementScreen } from './components/screens/CompanyManagementScreen';
import { AttendanceShiftsScreen } from './components/screens/AttendanceShiftsScreen';
import { SiteOperationsScreen } from './components/screens/SiteOperationsScreen';
import { KotlinCodeViewer } from './components/screens/KotlinCodeViewer';
import { SignUpScreen } from './components/screens/SignUpScreen';
import { ApprovalPendingScreen } from './components/screens/ApprovalPendingScreen';
import { ApprovalManagementScreen } from './components/screens/ApprovalManagementScreen';
import { SuperAdminDashboard } from './components/screens/SuperAdminDashboard';
import { SuperAdminCreateCompany } from './components/screens/SuperAdminCreateCompany';
import { SuperAdminModulesScreen } from './components/screens/SuperAdminModulesScreen';
import { SuperAdminCompaniesScreen } from './components/screens/SuperAdminCompaniesScreen';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<PhaseAScreen>('SPLASH');
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

    const savedSession = SessionManager.getUserSession();
    if (savedSession) {
      setUserSession(savedSession);
    }

    return () => unsub();
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

  // Realtime notification monitor
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
    setCurrentScreen('LOGIN');
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
  };

  const handleSyncOfflineQueue = async () => {
    await OfflineSyncService.syncPendingQueue();
    setOfflineQueueCount(OfflineSyncService.getQueue().length);
  };

  const isMainAppScreen = [
    'ROLE_DASHBOARD', 
    'EMPLOYEES', 
    'ATTENDANCE_SHIFTS', 
    'SITE_OPERATIONS', 
    'PROFILE', 
    'SETTINGS', 
    'NOTIFICATIONS',
    'SUPER_ADMIN_DASHBOARD',
    'SUPER_ADMIN_COMPANIES',
    'SUPER_ADMIN_CREATE_COMPANY',
    'SUPER_ADMIN_MODULES',
    'SUPER_ADMIN_PENDING_APPROVALS'
  ].includes(currentScreen);

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">
        {/* Header */}
        <Header
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          activeCompany={activeCompany}
          userSession={userSession}
          isOnline={isOnline}
          viewportMode={viewportMode}
          onToggleViewport={setViewportMode}
          onLogout={handleLogout}
          onLockSession={handleLockSession}
          offlineQueueCount={offlineQueueCount}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          unreadNotifCount={unreadNotifCount}
        />

        {/* Slide-out Navigation Drawer */}
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
          {currentScreen === 'KOTLIN_CODE_VIEWER' ? (
            <div className="w-full max-w-5xl mx-auto my-4 px-2">
              <KotlinCodeViewer onBack={() => setCurrentScreen(userSession ? 'ROLE_DASHBOARD' : 'LOGIN')} />
            </div>
          ) : (
            <div className="flex-1 w-full flex flex-col overflow-hidden relative">
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
                    {currentScreen === 'SPLASH' && (
                      <SplashScreen
                        onComplete={(nextScreen) => setCurrentScreen(nextScreen)}
                        isOnline={isOnline}
                        activeCompany={activeCompany}
                        userSession={userSession}
                      />
                    )}

                    {currentScreen === 'UPDATE_CHECKER' && (
                      <UpdateCheckerScreen
                        onContinue={(nextScreen) => setCurrentScreen(nextScreen)}
                      />
                    )}

                    {currentScreen === 'COMPANY_CODE' && (
                      <CompanyCodeScreen
                        onCompanyVerified={(company) => {
                          setActiveCompany(company);
                          SessionManager.setActiveCompany(company);
                        }}
                        onNavigate={setCurrentScreen}
                        initialCode={activeCompany?.companyId || ''}
                      />
                    )}

                    {currentScreen === 'LOGIN' && (
                      <LoginScreen
                        activeCompany={activeCompany || {
                          companyId: 'SYSTEM',
                          companyLegalName: 'Log Sheet Muster System',
                          brandName: 'Log Sheet Muster',
                          licenseTier: 'ENTERPRISE',
                          status: 'ACTIVE',
                          primaryColorHex: '#4f46e5',
                          secondaryColorHex: '#06b6d4',
                          allowedBranches: ['MAIN'],
                          maxEmployeesAllowed: 10000,
                          maxSitesAllowed: 1000
                        }}
                        onLoginSuccess={(session) => {
                          setUserSession(session);
                          if (session.accountStatus === 'ACTIVE') {
                            if (session.email.toLowerCase() === 'ghadgea15@gmail.com' || session.role === 'SUPER_ADMIN') {
                              setCurrentScreen('SUPER_ADMIN_DASHBOARD');
                            } else {
                              setCurrentScreen('ROLE_DASHBOARD');
                            }
                          } else {
                            setCurrentScreen('APPROVAL_PENDING');
                          }
                        }}
                        onNavigate={setCurrentScreen}
                        onChangeCompany={() => setCurrentScreen('COMPANY_CODE')}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_DASHBOARD' && userSession && (
                      <SuperAdminDashboard
                        currentSession={userSession}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_CREATE_COMPANY' && userSession && (
                      <SuperAdminCreateCompany
                        currentSession={userSession}
                        onNavigate={setCurrentScreen}
                        onCompanyCreated={(companyId) => {
                          setCurrentScreen('SUPER_ADMIN_DASHBOARD');
                        }}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_MODULES' && userSession && (
                      <SuperAdminModulesScreen
                        currentSession={userSession}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_COMPANIES' && userSession && (
                      <SuperAdminCompaniesScreen
                        currentSession={userSession}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SUPER_ADMIN_PENDING_APPROVALS' && userSession && (
                      <ApprovalManagementScreen
                        session={userSession}
                        onNavigateBack={() => setCurrentScreen('SUPER_ADMIN_DASHBOARD')}
                      />
                    )}

                    {currentScreen === 'SIGN_UP' && (
                      <SignUpScreen
                        initialCompany={activeCompany}
                        onSignUpSuccess={(session) => {
                          setUserSession(session);
                          if (session.accountStatus === 'ACTIVE') {
                            setCurrentScreen('ROLE_DASHBOARD');
                          } else {
                            setCurrentScreen('APPROVAL_PENDING');
                          }
                        }}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'APPROVAL_PENDING' && userSession && (
                      <ApprovalPendingScreen
                        session={userSession}
                        onApprovalComplete={(updatedSession) => {
                          setUserSession(updatedSession);
                          setCurrentScreen('ROLE_DASHBOARD');
                        }}
                        onSignOut={handleLogout}
                      />
                    )}

                    {currentScreen === 'APPROVAL_MANAGEMENT' && userSession && (
                      <ApprovalManagementScreen
                        session={userSession}
                        onNavigateBack={() => setCurrentScreen('ROLE_DASHBOARD')}
                      />
                    )}

                    {currentScreen === 'FORGOT_PASSWORD' && (
                      <ForgotPasswordScreen
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SESSION_LOCK' && userSession && (
                      <SessionLockScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onUnlockSuccess={() => setCurrentScreen('ROLE_DASHBOARD')}
                        onSwitchAccount={handleLogout}
                      />
                    )}

                    {currentScreen === 'ROLE_DASHBOARD' && userSession && (
                      <RoleDashboardScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        viewportMode={viewportMode}
                        onNavigate={setCurrentScreen}
                        onRoleSwitch={handleRoleSwitch}
                        offlineQueueCount={offlineQueueCount}
                        onSyncOfflineQueue={handleSyncOfflineQueue}
                      />
                    )}

                    {currentScreen === 'EMPLOYEES' && userSession && (
                      <EmployeeModuleScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'ATTENDANCE_SHIFTS' && userSession && (
                      <AttendanceShiftsScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'SITE_OPERATIONS' && userSession && (
                      <SiteOperationsScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        isOnline={isOnline}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'COMPANY_MANAGEMENT' && userSession && (
                      <CompanyManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onCompanyUpdated={(updated) => {
                          setActiveCompany(updated);
                          SessionManager.setActiveCompany(updated);
                        }}
                      />
                    )}

                    {currentScreen === 'PROFILE' && userSession && (
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
                        onClearCache={() => {
                          SessionManager.clearUserSession();
                          setUserSession(null);
                          setCurrentScreen('COMPANY_CODE');
                        }}
                      />
                    )}

                    {currentScreen === 'NOTIFICATIONS' && (
                      <NotificationsScreen
                        userSession={userSession}
                        onNavigate={setCurrentScreen}
                      />
                    )}
                  </div>

                  {/* Mobile Bottom Navigation Bar (Phone Viewport) */}
                  {viewportMode === 'PHONE' && isMainAppScreen && userSession && (
                    <BottomNavigationBar
                      currentScreen={currentScreen}
                      onNavigate={setCurrentScreen}
                      unreadNotifCount={unreadNotifCount}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

