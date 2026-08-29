import React, { useState } from 'react';
import { PhaseAScreen } from '../../types';
import { PageBreadcrumb } from '../../utils/seo';
import { PremiumHeader } from './PremiumHeader';
import { PremiumFooter } from './PremiumFooter';
import { RequestDemoModal } from './RequestDemoModal';

interface PublicPageLayoutProps {
  currentPath: string;
  onNavigate: (screen: PhaseAScreen) => void;
  children: React.ReactNode;
  breadcrumbs?: PageBreadcrumb[];
  primaryH1?: string;
  categoryBadge?: string;
}

export const PublicPageLayout: React.FC<PublicPageLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
  breadcrumbs,
  primaryH1,
  categoryBadge
}) => {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#060B19] text-white flex flex-col font-sans selection:bg-blue-500/30 selection:text-white antialiased">
      <PremiumHeader onNavigate={onNavigate} onOpenDemo={() => setShowDemoModal(true)} />

      {/* Main Page Content */}
      <main id="main-content" className="flex-1 w-full bg-[#060B19] pt-24 pb-16">
        {children}
      </main>

      <PremiumFooter onNavigate={onNavigate} onOpenDemo={() => setShowDemoModal(true)} />

      {showDemoModal && <RequestDemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />}
    </div>
  );
};
