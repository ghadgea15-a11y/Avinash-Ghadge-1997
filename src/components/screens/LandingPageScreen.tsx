import React, { useState, useEffect } from 'react';
import { PhaseAScreen } from '../../types';
import { getCurrentPathname, navigateToUrl } from '../../utils/publicRouter';
import { SEO_REGISTRY, updatePageSEO } from '../../utils/seo';

import { PublicPageLayout } from '../public/PublicPageLayout';
import { HeroSection } from '../public/HeroSection';
import { TrustValueStrip } from '../public/TrustValueStrip';
import { PlatformOverview } from '../public/PlatformOverview';
import { FeaturesSection } from '../public/FeaturesSection';
import { ModuleExplorer } from '../public/ModuleExplorer';
import { WebAndAndroidSection } from '../public/WebAndAndroidSection';
import { SecurityArchitectureSection } from '../public/SecurityArchitectureSection';
import { HowItWorksSection } from '../public/HowItWorksSection';
import { InteractiveDemoSection } from '../public/InteractiveDemoSection';
import { UseCasesSection } from '../public/UseCasesSection';
import { FaqSection } from '../public/FaqSection';
import { AboutSection } from '../public/AboutSection';
import { ContactDemoSection } from '../public/ContactDemoSection';

// Dedicated SEO Pages
import { HrmsPage } from '../public/HrmsPage';
import { AttendanceManagementPage } from '../public/AttendanceManagementPage';
import { PayrollPage } from '../public/PayrollPage';
import { EmployeeManagementPage } from '../public/EmployeeManagementPage';
import { LeaveManagementPage } from '../public/LeaveManagementPage';
import { ShiftManagementPage } from '../public/ShiftManagementPage';
import { WorkforceManagementPage } from '../public/WorkforceManagementPage';
import { FacilityManagementPage } from '../public/FacilityManagementPage';
import { SecurityManagementPage } from '../public/SecurityManagementPage';
import { EmployeeSelfServicePage } from '../public/EmployeeSelfServicePage';
import { ReportsAnalyticsPage } from '../public/ReportsAnalyticsPage';
import { CompliancePage } from '../public/CompliancePage';
import { PricingPage } from '../public/PricingPage';
import { AboutPage } from '../public/AboutPage';
import { ContactPage } from '../public/ContactPage';
import { SecurityPage } from '../public/SecurityPage';
import { FeaturesPage } from '../public/FeaturesPage';

import { PremiumLandingPage } from '../public/PremiumLandingPage';

import { AssetManagementPage } from '../public/AssetManagementPage';
import { InventoryPage } from '../public/InventoryPage';
import { SecurityOperationsSolutionPage } from '../public/SecurityOperationsSolutionPage';
import { FacilityManagementSolutionPage } from '../public/FacilityManagementSolutionPage';
import { MultiSiteSolutionPage } from '../public/MultiSiteSolutionPage';
import { IndustrialSolutionPage } from '../public/IndustrialSolutionPage';
import { CorporateSolutionPage } from '../public/CorporateSolutionPage';
import { ContractorsSolutionPage } from '../public/ContractorsSolutionPage';
import { FaqPage } from '../public/FaqPage';
import { SupportPage } from '../public/SupportPage';
import { DocumentationPage } from '../public/DocumentationPage';
import { ReleaseNotesPage } from '../public/ReleaseNotesPage';
import { CareersPage } from '../public/CareersPage';
import { PartnersPage } from '../public/PartnersPage';
import { PrivacyPage } from '../public/PrivacyPage';
import { TermsPage } from '../public/TermsPage';
import { CookiesPage } from '../public/CookiesPage';
import { AcceptableUsePage } from '../public/AcceptableUsePage';
import { DataProtectionPage } from '../public/DataProtectionPage';
import { DemoTermsPage } from '../public/DemoTermsPage';


interface LandingPageScreenProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const LandingPageScreen: React.FC<LandingPageScreenProps> = ({ onNavigate }) => {
  const [currentPath, setCurrentPath] = useState<string>(getCurrentPathname());

  // Listen for browser forward/back popstate and custom app route changes
  useEffect(() => {
    const handleLocationChange = () => {
      const path = getCurrentPathname();
      setCurrentPath(path);
      updatePageSEO(path);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('app-route-change', handleLocationChange);

    // Initial SEO update
    updatePageSEO(currentPath);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('app-route-change', handleLocationChange);
    };
  }, []);

  const meta = SEO_REGISTRY[currentPath] || SEO_REGISTRY['/'];

  if (currentPath === '/' || currentPath === '') {
    return <PremiumLandingPage onNavigate={onNavigate} />;
  }

  // Route-specific Content Dispatcher
  const renderPageContent = () => {
    switch (currentPath) {
      case '/hrms':
      case '/hrms-software':
        return <HrmsPage onNavigate={onNavigate} />;
      
      case '/attendance-management':
        return <AttendanceManagementPage onNavigate={onNavigate} />;
      
      case '/payroll':
        return <PayrollPage onNavigate={onNavigate} />;

      case '/employee-management':
        return <EmployeeManagementPage onNavigate={onNavigate} />;

      case '/leave-management':
        return <LeaveManagementPage onNavigate={onNavigate} />;

      case '/shift-management':
        return <ShiftManagementPage onNavigate={onNavigate} />;

      case '/workforce-management':
        return <WorkforceManagementPage onNavigate={onNavigate} />;

      case '/facility-management':
        return <FacilityManagementPage onNavigate={onNavigate} />;

      case '/security-management':
        return <SecurityManagementPage onNavigate={onNavigate} />;

      case '/employee-self-service':
        return <EmployeeSelfServicePage onNavigate={onNavigate} />;

      case '/reports-analytics':
        return <ReportsAnalyticsPage onNavigate={onNavigate} />;

      case '/compliance':
        return <CompliancePage onNavigate={onNavigate} />;

      case '/features':
        return <FeaturesPage onNavigate={onNavigate} />;

      case '/pricing':
        return <PricingPage onNavigate={onNavigate} />;

      case '/about':
      case '/company':
        return <AboutPage onNavigate={onNavigate} />;

      case '/contact':
        return <ContactPage onNavigate={onNavigate} />;

      case '/security':
        return <SecurityPage onNavigate={onNavigate} />;


      case '/assets':
        return <AssetManagementPage onNavigate={onNavigate} />;
      case '/inventory':
        return <InventoryPage onNavigate={onNavigate} />;
      case '/solutions/security-operations':
      case '/solutions/security':
        return <SecurityOperationsSolutionPage onNavigate={onNavigate} />;
      case '/solutions/facility-management':
        return <FacilityManagementSolutionPage onNavigate={onNavigate} />;
      case '/solutions/multi-site':
        return <MultiSiteSolutionPage onNavigate={onNavigate} />;
      case '/solutions/industrial':
        return <IndustrialSolutionPage onNavigate={onNavigate} />;
      case '/solutions/corporate':
        return <CorporateSolutionPage onNavigate={onNavigate} />;
      case '/solutions/contractors':
        return <ContractorsSolutionPage onNavigate={onNavigate} />;
      case '/faq':
        return <FaqPage onNavigate={onNavigate} />;
      case '/support':
        return <SupportPage onNavigate={onNavigate} />;
      case '/documentation':
        return <DocumentationPage onNavigate={onNavigate} />;
      case '/release-notes':
        return <ReleaseNotesPage onNavigate={onNavigate} />;
      case '/careers':
        return <CareersPage onNavigate={onNavigate} />;
      case '/partners':
        return <PartnersPage onNavigate={onNavigate} />;
      case '/legal/privacy':
        return <PrivacyPage onNavigate={onNavigate} />;
      case '/legal/terms':
        return <TermsPage onNavigate={onNavigate} />;
      case '/legal/cookies':
        return <CookiesPage onNavigate={onNavigate} />;
      case '/legal/acceptable-use':
        return <AcceptableUsePage onNavigate={onNavigate} />;
      case '/legal/data-protection':
        return <DataProtectionPage onNavigate={onNavigate} />;
      case '/legal/demo-terms':
        return <DemoTermsPage onNavigate={onNavigate} />;

      default:
        // Redirect to root or show a 404. For now, default to root.
        return null;
    }
  };

  return (
    <PublicPageLayout
      currentPath={currentPath}
      onNavigate={onNavigate}
      breadcrumbs={meta.breadcrumbs}
      primaryH1={meta.primaryH1}
      categoryBadge={meta.category}
    >
      {renderPageContent()}
    </PublicPageLayout>
  );
};
