import { describe, it, expect } from 'vitest';
import { AccessibilityGovernanceEngine } from '../server/accessibilityGovernanceEngine';

describe('AccessibilityGovernanceEngine Architecture', () => {
  it('1. Engine should expose APIs for ingesting Automated WCAG 2.1 AA Scans', () => {
    expect(typeof AccessibilityGovernanceEngine.ingestScanReport).toBe('function');
  });

  it('2. Engine should expose Compliance Metrics retrieval', () => {
    expect(typeof AccessibilityGovernanceEngine.getComplianceMetrics).toBe('function');
  });
});
