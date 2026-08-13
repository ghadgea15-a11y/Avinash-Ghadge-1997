import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, UserRole } from './types';
import { SessionManager } from './services/sessionManager';
import { OfflineSyncService } from './services/offlineSyncService';
import { FirestoreService } from './services/firestoreService';
import { MOCK_TENANTS, MOCK_USERS, MOCK_NOTIFICATIONS } from './services/mockData';
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
import { KotlinCodeViewer } from './components/screens/KotlinCodeViewer';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<PhaseAScreen>('SPLASH');
  const [activeCompany, setActiveCompany] = useState<CompanyTenant | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(OfflineSyncService.isOnline());
  const [viewportMode, setViewportMode] = useState<'PHONE' | 'TABLET' | 'FULLSCREEN'>('PHONE');
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(OfflineSyncService.getQueue().length);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(2);

  // Initialize network & storage sync
  useEffect(() => {
    const unsub = OfflineSyncService.subscribe((onlineStatus) => {
      setIsOnline(onlineStatus);
    });

    const savedCompany = SessionManager.getActiveCompany() || MOCK_TENANTS['APEX-SEC-101'];
    setActiveCompany(savedCompany);

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
    
    // Set initial size immediately
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
    const mockPreset = MOCK_USERS.find(u => u.role === newRole) || MOCK_USERS[0];
    const updatedSession: UserSession = {
      ...userSession,
      role: newRole,
      fullName: mockPreset.fullName,
      employeeId: mockPreset.employeeId,
      email: mockPreset.email,
      assignedSiteId: mockPreset.assignedSiteId
    };
    setUserSession(updatedSession);
    SessionManager.setUserSession(updatedSession);
  };

  const handleSyncOfflineQueue = async () => {
    await OfflineSyncService.syncPendingQueue();
    setOfflineQueueCount(OfflineSyncService.getQueue().length);
  };

  const isMainAppScreen = ['ROLE_DASHBOARD', 'PROFILE', 'SETTINGS', 'NOTIFICATIONS'].includes(currentScreen);

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
                        initialCode={activeCompany?.companyId || 'APEX-SEC-101'}
                      />
                    )}

                    {currentScreen === 'LOGIN' && (
                      <LoginScreen
                        activeCompany={activeCompany || MOCK_TENANTS['APEX-SEC-101']}
                        onLoginSuccess={(session) => {
                          setUserSession(session);
                          setCurrentScreen('ROLE_DASHBOARD');
                        }}
                        onNavigate={setCurrentScreen}
                        onChangeCompany={() => setCurrentScreen('COMPANY_CODE')}
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
