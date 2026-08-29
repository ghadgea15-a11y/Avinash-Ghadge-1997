import re

with open('src/components/screens/LandingPageScreen.tsx', 'r') as f:
    content = f.read()

imports = """
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
"""

# add imports after import { PremiumLandingPage } from '../public/PremiumLandingPage';
content = content.replace("import { PremiumLandingPage } from '../public/PremiumLandingPage';", "import { PremiumLandingPage } from '../public/PremiumLandingPage';\n" + imports)

switch_cases = """
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
"""

# insert switch cases before default:
content = content.replace("      default:", switch_cases + "\n      default:")

with open('src/components/screens/LandingPageScreen.tsx', 'w') as f:
    f.write(content)

