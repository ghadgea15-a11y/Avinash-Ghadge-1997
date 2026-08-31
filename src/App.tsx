import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, UserRole } from './types';
import { SessionManager } from './services/sessionManager';
import { OfflineSyncService } from './services/offlineSyncService';
import { FirestoreService } from './services/firestoreService';
import { EnterpriseRiskScheduler } from './services/enterpriseRiskScheduler';
import { ThemeProvider } from './context/ThemeContext';
import { ActionFeedbackProvider } from './context/ActionFeedbackContext';
import { getCurrentPathname, ROUTE_PATH_MAP, navigateToUrl } from './utils/publicRouter';
import { updatePageSEO } from './utils/seo';
import { useAppNavigation } from "./hooks/useAppNavigation";
import { NavigationDrawer } from './components/common/NavigationDrawer';
import { MobileTopHeader } from './components/common/MobileTopHeader';
import { TabletNavigationRail } from './components/common/TabletNavigationRail';
import { SplashScreen } from './components/screens/SplashScreen';
import { UpdateCheckerScreen } from './components/screens/UpdateCheckerScreen';
import { CompanyCodeScreen } from './components/screens/CompanyCodeScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { ForgotPasswordScreen } from './components/screens/ForgotPasswordScreen';
import { SessionLockScreen } from './components/screens/SessionLockScreen';
import { PlatformLoginScreen } from './components/screens/PlatformLoginScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { EmployeeModuleScreen } from './components/screens/EmployeeModuleScreen';

import { CrmModule } from './components/crm/CrmModule';
import { DeploymentManagementScreen } from './components/screens/DeploymentManagementScreen';
import { ShiftRosterScreen } from './components/screens/ShiftRosterScreen';

import { CompanyManagementScreen } from './components/screens/CompanyManagementScreen';
import { NotificationAdminScreen } from './components/screens/NotificationAdminScreen';
import { OrgControlScreen } from './components/screens/OrgControlScreen';
import { ChangeControlScreen } from './components/screens/ChangeControlScreen';
import { AttendanceShiftsScreen } from './components/screens/AttendanceShiftsScreen';
import { SiteOperationsScreen } from './components/screens/SiteOperationsScreen';
import { WorkOrdersScreen } from './components/screens/WorkOrdersScreen';
import { KotlinCodeViewer } from './components/screens/KotlinCodeViewer';
import { SignUpScreen } from './components/screens/SignUpScreen';
import { ApprovalPendingScreen } from './components/screens/ApprovalPendingScreen';
import { ApprovalManagementScreen } from './components/screens/ApprovalManagementScreen';
import { ApprovalIntelligenceScreen } from './components/screens/ApprovalIntelligenceScreen';
import { ThirdPartyRiskScreen } from './components/screens/ThirdPartyRiskScreen';
import { DocumentLifecycleScreen } from './components/screens/DocumentLifecycleScreen';
import { AiAssistantScreen } from './components/screens/AiAssistantScreen';
import { SyncDashboardScreen } from './components/screens/SyncDashboardScreen';
import { ExecutiveOperationalIntelligenceScreen } from './components/screens/ExecutiveOperationalIntelligenceScreen';
import { WorkforceCapacityPlanningScreen } from './components/screens/WorkforceCapacityPlanningScreen';
import { EnterpriseConflictManagementScreen } from './components/screens/EnterpriseConflictManagementScreen';
import { HistoricalTraceabilityScreen } from './components/screens/HistoricalTraceabilityScreen';
import { EnterpriseScalabilityAssessmentScreen } from './components/screens/EnterpriseScalabilityAssessmentScreen';
import { BiometricHubScreen } from './components/screens/BiometricHubScreen';
import { SuperAdminGate } from './components/guards/SuperAdminGate';
import { SuperAdminDashboard } from './components/screens/SuperAdminDashboard';
import { EnterpriseDashboardScreen } from './components/screens/EnterpriseDashboardScreen';
import { CompanyBillingScreen } from './components/screens/CompanyBillingScreen';
import { SuperAdminCreateCompany } from './components/screens/SuperAdminCreateCompany';
import { SuperAdminModulesScreen } from './components/screens/SuperAdminModulesScreen';
import { SuperAdminCompaniesScreen } from './components/screens/SuperAdminCompaniesScreen';
import { SuperAdminSubscriptionsScreen } from './components/screens/SuperAdminSubscriptionsScreen';
import { SuperAdminManagementScreen } from './components/screens/SuperAdminManagementScreen';
import { SuperAdminLeadsScreen } from './components/screens/SuperAdminLeadsScreen';
import { SuperAdminAuditScreen } from './components/screens/SuperAdminAuditScreen';
import { SuperAdminMonitoringScreen } from './components/screens/SuperAdminMonitoringScreen';
import { SuperAdminSupportScreen } from './components/screens/SuperAdminSupportScreen';
import { SuperAdminConfigScreen } from './components/screens/SuperAdminConfigScreen';
import { SuperAdminSecurityScreen } from './components/screens/SuperAdminSecurityScreen';
import { SuperAdminReportsScreen } from './components/screens/SuperAdminReportsScreen';
import { SuperAdminAdminsScreen } from './components/screens/SuperAdminAdminsScreen';
import { LandingPageScreen } from './components/screens/LandingPageScreen';
import { LegalPoliciesScreen } from './components/screens/LegalPoliciesScreen';
import { LeaveManagementScreen } from './components/screens/LeaveManagementScreen';
import { PayrollCompensationScreen } from './components/screens/PayrollCompensationScreen';
import { ScmModule } from './components/scm/ScmModule';
import { AssetTrackingScreen } from './components/screens/AssetTrackingScreen';
import { ServiceDeskScreen } from './components/screens/ServiceDeskScreen';
import { TalentAcquisitionScreen } from './components/screens/TalentAcquisitionScreen';
import { TrainingLmsScreen } from './components/screens/TrainingLmsScreen';
import { MandatoryRefreshersScreen } from './components/screens/MandatoryRefreshersScreen';
import { CertificationTrackingScreen } from './components/screens/CertificationTrackingScreen';
import { ProcurementSrmScreen } from './components/screens/ProcurementSrmScreen';
import { VendorDirectoryScreen } from './components/screens/VendorDirectoryScreen';
import { RfqManagementScreen } from './components/screens/RfqManagementScreen';
import { PurchaseOrderManagementScreen } from './components/screens/PurchaseOrderManagementScreen';
import { ThreeWayMatchScreen } from './components/screens/ThreeWayMatchScreen';

import { TaskManagementScreen } from './components/screens/TaskManagementScreen';
import { AnnouncementsScreen } from './components/screens/AnnouncementsScreen';
import { IdentityBadgeScreen } from './components/screens/IdentityBadgeScreen';
import { ComplianceDashboardScreen } from './components/screens/ComplianceDashboardScreen';
import { MyTasksScreen } from './components/screens/MyTasksScreen';

import { ReportsAnalyticsScreen } from './components/screens/ReportsAnalyticsScreen';

import { ApprovalCenter } from './components/bpm/ApprovalCenter';
import { FirebaseAuthService } from './services/firebaseAuthService';
import { Loader2 } from 'lucide-react';

function MainApp() {
  // Initialize current screen from URL if landing on legal, auth, or public route
  const getInitialScreen = (): PhaseAScreen => {
    const path = getCurrentPathname();
    const routeMatch = ROUTE_PATH_MAP[path];
    if (routeMatch) {
      return routeMatch.screen;
    }
    return 'LANDING';
  };

  const { currentScreen, navigate: setCurrentScreen } = useNavigation();

  useEffect(() => {
  }, []);

  useEffect(() => {
  }, []);
  useEffect(() => {
    if (import.meta.env.DEV || (window as any).PLAYWRIGHT_TEST) {
    }
  }, []);
  const [activeCompany, setActiveCompany] = useState<CompanyTenant | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(OfflineSyncService.isOnline());
  const [viewportMode, setViewportMode] = useState<'PHONE' | 'TABLET' | 'FULLSCREEN'>('PHONE');
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(OfflineSyncService.getQueue().length);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  // Sync route and SEO on screen changes
  useEffect(() => {
    const isPrivate = !['LANDING', 'LEGAL_POLICIES'].includes(currentScreen);
    const path = getCurrentPathname();
    updatePageSEO(path, isPrivate);
  }, [currentScreen, userSession]);

  // Initialize network & storage sync
  useEffect(() => {
    const unsub = OfflineSyncService.subscribe((onlineStatus) => {
      setIsOnline(onlineStatus);
    });

    const savedCompany = SessionManager.getActiveCompany();
    if (savedCompany) {
      setActiveCompany(savedCompany);
    }

    // Check if we have an active session to restore
    const initialSession = SessionManager.getUserSession();
    if (initialSession && initialSession.tokenExpiresAt > Date.now()) {
      setUserSession(initialSession);
      if (['LANDING', 'LOGIN', 'SIGN_UP'].includes(currentScreen)) {
         if (initialSession.accountStatus === 'ACTIVE') {
            if (initialSession.role === 'SUPER_ADMIN') {
              setCurrentScreen('SUPER_ADMIN_DASHBOARD');
            } else {
              setCurrentScreen('ENTERPRISE_DASHBOARD');
            }
         } else {
            setCurrentScreen('APPROVAL_PENDING');
         }
      }
    } else {
      SessionManager.clearUserSession();
      setUserSession(null);
    }

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

  // 5-Minute Inactivity Auto-Logout & Strict Refresh Logout
  useEffect(() => {
    // 1. Strict Refresh Logout: clear session on page unload/refresh
    const handleUnload = () => {
      SessionManager.clearUserSession();
    };
    window.addEventListener('beforeunload', handleUnload);

    // 2. 5-Minute Inactivity Timer
    let inactivityTimer: NodeJS.Timeout;
    
    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      
      // Only enforce timeout if the user is authenticated
      if (userSession) {
        inactivityTimer = setTimeout(async () => {
          // Trigger strict logout after 5 minutes (300,000 ms)
          await FirebaseAuthService.logoutUser();
          SessionManager.clearSession();
          setActiveCompany(null);
          setUserSession(null);
          setCurrentScreen('LOGIN');
          setIsDrawerOpen(false);
        }, 5 * 60 * 1000);
      }
    };

    // Throttle user activity handling to avoid performance hits
    let lastActivityTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > 1000) { // Throttle to 1 second
        lastActivityTime = now;
        resetInactivityTimer();
      }
    };

    // Listen to all relevant genuine user interactions
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Start timer on mount/session-change
    resetInactivityTimer();

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [userSession]);

  // Ensure activeCompany tenant is loaded & consistent with userSession on startup/refresh
  useEffect(() => {
    if (userSession && userSession.companyId && userSession.companyId !== 'GLOBAL_ADMIN') {
      if (!activeCompany || activeCompany.companyId !== userSession.companyId) {
        FirebaseAuthService.verifyCompanyCode(userSession.companyId)
          .then((comp) => {
            setActiveCompany(comp);
            SessionManager.setActiveCompany(comp);
          })
          .catch((err) => {
            console.warn('[App] Failed to auto-load company tenant for active session:', err);
          });
      }
    }
  }, [userSession?.companyId, activeCompany?.companyId]);

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
      const unsub = FirestoreService.subscribeToNotifications(userSession.companyId, userSession.role, (notifs) => {
        setUnreadNotifCount(notifs.filter(n => !n.isRead).length);
      });
      return () => unsub();
    }
  }, [userSession]);

  // Realtime user profile & membership listener (account status, role changes, site reassignments)
  useEffect(() => {
    if (!userSession || !userSession.userId || userSession.role === 'SUPER_ADMIN') return;
    
    // 1. Listen to users/{userId}
    const userDocRef = doc(db, 'users', userSession.userId);
    const unsubUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        if (uData.accountStatus === 'DISABLED' || uData.accountStatus === 'SUSPENDED') {
          handleLogout();
          return;
        }
        if (uData.role && uData.role !== userSession.role) {
          FirebaseAuthService.refreshSession(userSession).then(updated => {
            if (updated) setUserSession(updated);
            else setUserSession(prev => prev ? { ...prev, role: uData.role } : null);
          });
        }
      }
    }, (err) => console.warn('[App] Realtime user listener:', err));

    // 2. Listen to users/{userId}/memberships/{companyId}
    const memDocRef = doc(db, 'users', userSession.userId, 'memberships', userSession.companyId);
    const unsubMem = onSnapshot(memDocRef, (snap) => {
      if (snap.exists()) {
        const mData = snap.data();
        if (mData.status === 'SUSPENDED') {
          handleLogout();
          return;
        }
        if (mData.role && mData.role !== userSession.role) {
          FirebaseAuthService.refreshSession(userSession).then(updated => {
            if (updated) setUserSession(updated);
            else setUserSession(prev => prev ? { ...prev, role: mData.role } : null);
          });
        }
        if (mData.siteId && mData.siteId !== userSession.assignedSiteId) {
          setUserSession(prev => prev ? { ...prev, assignedSiteId: mData.siteId } : null);
        }
        if (mData.departmentId && mData.departmentId !== userSession.departmentId) {
          setUserSession(prev => prev ? { ...prev, departmentId: mData.departmentId } : null);
        }
      }
    }, (err) => console.warn('[App] Realtime membership listener:', err));

    return () => {
      unsubUser();
      unsubMem();
    };
  }, [userSession?.userId, userSession?.companyId]);

  // Sync queue count monitor
  useEffect(() => {
    const interval = setInterval(() => {
      setOfflineQueueCount(OfflineSyncService.getQueue().length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Automated background scheduler for enterprise risk and document expirations
  useEffect(() => {
    if (userSession && userSession.companyId) {
      EnterpriseRiskScheduler.startScheduler(userSession);
    } else {
      EnterpriseRiskScheduler.stopScheduler();
    }
    return () => {
      EnterpriseRiskScheduler.stopScheduler();
    };
  }, [userSession?.companyId, userSession?.role]);

  const handleLogout = async () => {
    await FirebaseAuthService.logoutUser();
    setActiveCompany(null);
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


  const handleSyncOfflineQueue = async () => {
    await OfflineSyncService.syncPendingQueue();
    setOfflineQueueCount(OfflineSyncService.getQueue().length);
  };

  const isMainAppScreen = [
    'ENTERPRISE_DASHBOARD',
    'EMPLOYEES', 
    'ATTENDANCE_SHIFTS', 
    'LEAVE_MANAGEMENT',
    'APPROVAL_CENTER',
    'PAYROLL_COMPENSATION',
    'INVENTORY_STOCK',
    'ASSET_TRACKING',
    'SITE_OPERATIONS', 
    'SAFETY_MANAGEMENT',
    'WORK_ORDERS',
    'REPORTS_ANALYTICS',
    'COMPANY_MANAGEMENT',
    'COMPANY_BILLING',
    'PROFILE', 
    'SETTINGS', 
    'NOTIFICATIONS',
    'SUPER_ADMIN_DASHBOARD',
    'SUPER_ADMIN_COMPANIES',
    'SUPER_ADMIN_CREATE_COMPANY',
    'SUPER_ADMIN_MODULES',
    'SUPER_ADMIN_PENDING_APPROVALS',
    'SUPER_ADMIN_SUBSCRIPTIONS',
    'SUPER_ADMIN_MANAGEMENT',
    'APPROVAL_MANAGEMENT',
    'BIOMETRIC_DEVICES',
    'DEVICE_INTEGRATION_HUB'
  ].includes(currentScreen);

  // Security guard: If unauthenticated and attempting to access protected screens, redirect to LANDING
  useEffect(() => {
    if (!userSession && isMainAppScreen) {
      setCurrentScreen('LANDING');
    }
  }, [userSession, isMainAppScreen]);

  return (
    <ThemeProvider>
      <ActionFeedbackProvider>
        {/* 1. PUBLIC MARKETING WEBSITE: Rendered directly as a standalone full-width website */}
      {currentScreen === 'LANDING' ? (
        <div className="min-h-screen w-full font-sans transition-colors duration-200">
          <LandingPageScreen onNavigate={(s) => setCurrentScreen(s as any)} />
        </div>
      ) : currentScreen === 'LEGAL_POLICIES' ? (
        /* Standalone Legal & Compliance Policy Center */
        <div className="min-h-screen w-full font-sans transition-colors duration-200">
          <LegalPoliciesScreen onNavigate={(screen: any) => setCurrentScreen(screen)} />
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
        <div 
          style={activeCompany?.loginBackgroundUrl ? { backgroundImage: `url(${activeCompany.loginBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          className={`min-h-screen w-full flex flex-col justify-center items-center font-sans transition-colors duration-200 p-4 ${!activeCompany?.loginBackgroundUrl ? 'bg-white dark:bg-slate-950' : ''}`}>
          <div className="w-full max-w-xl">
            {currentScreen === 'LOGIN' && (
              <LoginScreen activeCompany={activeCompany as any}
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
                onNavigate={(screen: any) => setCurrentScreen(screen)}
              />
            )}

            {currentScreen === 'PLATFORM_LOGIN' && (
              <PlatformLoginScreen
                onLoginSuccess={(session) => {
                  setUserSession(session);
                  if (session.accountStatus === 'ACTIVE') {
                    setCurrentScreen('SUPER_ADMIN_DASHBOARD');
                  } else {
                    setCurrentScreen('APPROVAL_PENDING');
                  }
                }}
                onNavigate={(screen: any) => setCurrentScreen(screen)}
              />
            )}

            {currentScreen === 'SIGN_UP' && (
              <SignUpScreen
                initialCompany={null}
                onSignUpSuccess={(session) => {
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
                onNavigate={(screen: any) => setCurrentScreen(screen)}
              />
            )}

            {currentScreen === 'FORGOT_PASSWORD' && (
              <ForgotPasswordScreen
                activeCompany={activeCompany as any}
                onNavigate={(screen: any) => setCurrentScreen(screen)}
              />
            )}

            {currentScreen === 'SPLASH' && (
              <SplashScreen
                onComplete={(nextScreen) => setCurrentScreen(nextScreen)}
                isOnline={isOnline}
                activeCompany={activeCompany as any}
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
                onNavigate={(screen: any) => setCurrentScreen(screen)}
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
            activeCompany={activeCompany as any}
            unreadNotifCount={unreadNotifCount}
            
            onLockSession={handleLockSession}
            onLogout={handleLogout}
            isOnline={isOnline}
          />

          {/* Main Stage Area */}
          <main className="flex-1 flex flex-col w-full h-full bg-white dark:bg-slate-950 dark:bg-slate-900">
            <div className="flex-1 w-full flex flex-col overflow-hidden relative">
              {/* Mobile Top Header */}
              {viewportMode === 'PHONE' && isMainAppScreen && (
                <MobileTopHeader
                  activeCompany={activeCompany as any}
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
                    onNavigate={(screen: any) => setCurrentScreen(screen)}
                    onOpenDrawer={() => setIsDrawerOpen(true)}
                    unreadNotifCount={unreadNotifCount}
                    userSession={userSession}
                    
                  />
                )}

                {/* Inner Screen Content View */}
                <div className="flex-1 flex flex-col justify-between overflow-hidden relative w-full">
                  <div className="flex-1 overflow-y-auto w-full">
    {currentScreen.startsWith('SUPER_ADMIN') && (
  <SuperAdminGate userSession={userSession} onNavigate={(s) => setCurrentScreen(s as any)}>
    {currentScreen === 'SUPER_ADMIN_DASHBOARD' && (
      <SuperAdminDashboard 
        currentSession={userSession!} 
        onNavigate={(screen: any) => setCurrentScreen(screen)} 
      />
    )}
    {currentScreen === 'SUPER_ADMIN_CREATE_COMPANY' && (
      <SuperAdminCreateCompany
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
        onCompanyCreated={(companyId) => {
          setCurrentScreen('SUPER_ADMIN_COMPANIES');
        }}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_MODULES' && (
      <SuperAdminModulesScreen
        currentSession={userSession}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_COMPANIES' && (
      <SuperAdminCompaniesScreen
        currentSession={userSession}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_SUBSCRIPTIONS' && (
      <SuperAdminSubscriptionsScreen
        userSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_MANAGEMENT' && (
      <SuperAdminManagementScreen
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_PENDING_APPROVALS' && (
      <ApprovalManagementScreen
        session={userSession}
        onNavigateBack={() => setCurrentScreen('SUPER_ADMIN_DASHBOARD')}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_LEADS' && (
      <SuperAdminLeadsScreen
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_AUDIT' && (
      <SuperAdminAuditScreen
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_MONITORING' && (
      <SuperAdminMonitoringScreen
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_SUPPORT' && (
      <SuperAdminSupportScreen
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_CONFIG' && (
      <SuperAdminConfigScreen
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_SECURITY' && (
      <SuperAdminSecurityScreen
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_REPORTS' && (
      <SuperAdminReportsScreen
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_ADMINS' && (
      <SuperAdminAdminsScreen
        currentSession={userSession!}
        onNavigate={(screen: any) => setCurrentScreen(screen)}
      />
    )}
  </SuperAdminGate>
)}
                    {currentScreen === 'APPROVAL_PENDING' && (
                      <ApprovalPendingScreen
                        session={userSession}
                        onApprovalComplete={(updatedSession) => {
                          setUserSession(updatedSession);
                          if (updatedSession.role === 'SUPER_ADMIN') {
                            setCurrentScreen('SUPER_ADMIN_DASHBOARD');
                          } else {
                            setCurrentScreen('ENTERPRISE_DASHBOARD');
                          }
                        }}
                        onSignOut={handleLogout}
                      />
                    )}
                    {currentScreen === 'ENTERPRISE_DASHBOARD' && (
                      activeCompany ? (
                        <EnterpriseDashboardScreen
                          userSession={userSession}
                          company={activeCompany}
                          onNavigate={(screen: any) => setCurrentScreen(screen)}
                          onLogout={handleLogout}
                        />
                      ) : (
                        <div id="company-resolving-loader" className="flex-1 flex items-center justify-center p-12 min-h-[400px]">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading company workspace...</p>
                          </div>
                        </div>
                      )
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
                        activeCompany={activeCompany as any}
                        onUnlockSuccess={() => setCurrentScreen('EMPLOYEES')}
                        onSwitchAccount={handleLogout}
                      />
                    )}

                    
                    {currentScreen === 'CLIENT_MANAGEMENT' && activeCompany && (
                      <CrmModule
                        session={userSession}
                        company={activeCompany}
                      />
                    )}
                    {currentScreen === 'DEPLOYMENT_MANAGEMENT' && activeCompany && (
                      <DeploymentManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                      />
                    )}
                    {currentScreen === 'SHIFT_ROSTER' && activeCompany && (
                      <ShiftRosterScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'EMPLOYEES' && (
                      <EmployeeModuleScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'ATTENDANCE_SHIFTS' && (
                      <AttendanceShiftsScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'LEAVE_MANAGEMENT' && (
                      <LeaveManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'APPROVAL_CENTER' && (
                      <ApprovalCenter
                        session={userSession}
                      />
                    )}

                    {currentScreen === 'PAYROLL_COMPENSATION' && activeCompany && (
                      <PayrollCompensationScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        />
                    )}
                    {currentScreen === 'INVENTORY_STOCK' && activeCompany && (
                      <ScmModule session={userSession} company={activeCompany} />
                    )}

                    
                    {currentScreen === 'TASK_MANAGEMENT' && activeCompany && (
                      <TaskManagementScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'ID_BADGES' && activeCompany && (
                      <IdentityBadgeScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'COMPLIANCE' && activeCompany && (
                      <ComplianceDashboardScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                      />
                    )}

                    {currentScreen === 'DOCUMENT_LIFECYCLE' && activeCompany && (
                      <DocumentLifecycleScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'OPERATIONAL_INTELLIGENCE' && activeCompany && (
                      <ExecutiveOperationalIntelligenceScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'WORKFORCE_CAPACITY' && activeCompany && (
                      <WorkforceCapacityPlanningScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                      />
                    )}

                    {currentScreen === 'CONFLICT_DETECTION' && activeCompany && (
                      <EnterpriseConflictManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                      />
                    )}

                    {currentScreen === 'AI_ASSISTANT' && activeCompany && (
                      <AiAssistantScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                      />
                    )}

                    {currentScreen === 'HISTORICAL_TRACEABILITY' && (
                      <HistoricalTraceabilityScreen
                        session={userSession}
                        onNavigateToScreen={(scr: any) => setCurrentScreen(scr as PhaseAScreen)}
                      />
                    )}

                    {currentScreen === 'SCALABILITY_ASSESSMENT' && (
                      <EnterpriseScalabilityAssessmentScreen
                        session={userSession}
                        companyId={userSession.companyId || (activeCompany ? activeCompany.companyId : 'MUSTER_SYSTEM')}
                      />
                    )}

                    {currentScreen === 'ANNOUNCEMENTS' && activeCompany && (
                      <AnnouncementsScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'MY_TASKS' && activeCompany && (
                      <MyTasksScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'ASSET_TRACKING' && (
                      <AssetTrackingScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'SERVICE_DESK' && (
                      <ServiceDeskScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'TALENT_ACQUISITION' && (
                      <TalentAcquisitionScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'CERTIFICATION_TRACKING' && (
                      <CertificationTrackingScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}
                    {currentScreen === 'MANDATORY_REFRESHERS' && activeCompany && (
                      <MandatoryRefreshersScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}
                    {currentScreen === 'TRAINING_LMS' && (
                      <TrainingLmsScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'VENDOR_MANAGEMENT' && (
                      <VendorDirectoryScreen
                        userSession={userSession}
                        activeCompany={activeCompany!}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}
                    {currentScreen === 'RFQ_MANAGEMENT' && (
                      <RfqManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany!}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}
                    {currentScreen === 'PURCHASE_ORDERS' && (
                      <PurchaseOrderManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany!}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}
                    {currentScreen === 'THREE_WAY_MATCH' && (
                      <ThreeWayMatchScreen
                        userSession={userSession}
                        activeCompany={activeCompany!}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}
                    {currentScreen === 'PROCUREMENT_SRM' && (
                      <ProcurementSrmScreen
                        userSession={userSession}
                        activeCompany={activeCompany!}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'SITE_OPERATIONS' && (
                      <SiteOperationsScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'SAFETY_MANAGEMENT' && (
                      <SiteOperationsScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                        initialTab="SAFETY_CHECKS"
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
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'COMPANY_BILLING' && (
                      <CompanyBillingScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'NOTIFICATION_ADMIN' && (
                      <NotificationAdminScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                      />
                    )}
                    {currentScreen === 'COMPANY_MANAGEMENT' && (
                      <CompanyManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onCompanyUpdated={(updated) => {
                          setActiveCompany(updated);
                          SessionManager.setActiveCompany(updated);
                        }}
                      />
                    )}

                    {currentScreen === 'PROFILE' && (
                      <ProfileScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                      />
                    )}

                    {(currentScreen === 'BIOMETRIC_DEVICES' || currentScreen === 'DEVICE_INTEGRATION_HUB') && (
                      <BiometricHubScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}

                    {currentScreen === 'SETTINGS' && (
                      <SettingsScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
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
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}


import { NavigationProvider, useNavigation } from './context/NavigationContext';

export function App() {
  const getInitialScreen = (): PhaseAScreen => {
    const path = window.location.pathname;
    
    const routeMatch = ROUTE_PATH_MAP[path];
    if (routeMatch) {
      return routeMatch.screen;
    }
    return 'LANDING';
  };

  return (
    <NavigationProvider initialScreen={getInitialScreen()}>
      <MainApp />
    </NavigationProvider>
  );
}
