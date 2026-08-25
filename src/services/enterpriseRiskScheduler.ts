import { DocumentLifecycleService } from './documentLifecycleService';
import { VendorRiskService } from './vendorRiskService';
import { contractExpiryEngine } from './contractExpiryEngine';
import { UserSession } from '../types';

interface EvaluationSummary {
  timestamp: string;
  documentUpdates: number;
  vendorViolations: number;
  contractAlertsProcessed: boolean;
  success: boolean;
  error?: string;
}

let schedulerTimer: NodeJS.Timeout | null = null;
let lastEvaluationTime: Record<string, number> = {};

export class EnterpriseRiskScheduler {
  private static EVALUATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes default cadence
  private static MIN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes minimum cooldown between manual/auto runs

  /**
   * Evaluates all enterprise compliance and third-party risk streams for a company.
   * Additive, non-destructive evaluation of document expiries, vendor contracts, and compliance docs.
   */
  static async evaluateAll(companyId: string, force: boolean = false): Promise<EvaluationSummary> {
    if (!companyId) {
      return {
        timestamp: new Date().toISOString(),
        documentUpdates: 0,
        vendorViolations: 0,
        contractAlertsProcessed: false,
        success: false,
        error: 'Missing companyId'
      };
    }

    const now = Date.now();
    const lastRun = lastEvaluationTime[companyId] || 0;

    if (!force && now - lastRun < this.MIN_COOLDOWN_MS) {
      return {
        timestamp: new Date(lastRun).toISOString(),
        documentUpdates: 0,
        vendorViolations: 0,
        contractAlertsProcessed: false,
        success: true
      };
    }

    const summary: EvaluationSummary = {
      timestamp: new Date().toISOString(),
      documentUpdates: 0,
      vendorViolations: 0,
      contractAlertsProcessed: false,
      success: true
    };

    try {
      // 1. Evaluate Document Lifecycle Expirations and Reminders
      try {
        summary.documentUpdates = await DocumentLifecycleService.evaluateExpiries(companyId);
      } catch (docErr) {
        console.warn('[EnterpriseRiskScheduler] Document lifecycle evaluation error:', docErr);
      }

      // 2. Evaluate Vendor Risk, Expired Contracts & Access Boundaries
      try {
        summary.vendorViolations = await VendorRiskService.evaluateVendorRisks(companyId);
      } catch (vendorErr) {
        console.warn('[EnterpriseRiskScheduler] Vendor risk evaluation error:', vendorErr);
      }

      // 3. Process Pending Contract Expiry Notifications
      try {
        await contractExpiryEngine.processPendingNotifications(companyId);
        summary.contractAlertsProcessed = true;
      } catch (contractErr) {
        console.warn('[EnterpriseRiskScheduler] Contract notification processing error:', contractErr);
      }

      lastEvaluationTime[companyId] = now;
      return summary;
    } catch (err: any) {
      console.error('[EnterpriseRiskScheduler] Enterprise evaluation error:', err);
      summary.success = false;
      summary.error = err?.message || 'Evaluation failed';
      return summary;
    }
  }

  /**
   * Starts periodic automated evaluation for authorized enterprise sessions.
   */
  static startScheduler(session: UserSession) {
    if (!session || !session.companyId) return;

    // Only start for managerial and admin roles to minimize unnecessary client traffic
    const allowedRoles = [
      'SUPER_ADMIN',
      'COMPANY_ADMIN',
      'OWNER_PROMOTER',
      'DIRECTOR_CEO',
      'GENERAL_MANAGER',
      'REGIONAL_MANAGER',
      'HR_ADMIN',
      'FINANCE_MANAGER',
      'OPS_MANAGER',
      'PROCUREMENT',
      'QUALITY',
      'COMMERCIAL'
    ];

    if (!allowedRoles.includes(session.role)) {
      return;
    }

    this.stopScheduler();

    // Initial check on startup (delayed by 3 seconds to allow core app hydrate)
    setTimeout(() => {
      this.evaluateAll(session.companyId, false).catch(e => 
        console.warn('[EnterpriseRiskScheduler] Startup evaluation exception:', e)
      );
    }, 3000);

    // Periodic evaluation loop
    schedulerTimer = setInterval(() => {
      this.evaluateAll(session.companyId, false).catch(e => 
        console.warn('[EnterpriseRiskScheduler] Periodic evaluation exception:', e)
      );
    }, this.EVALUATION_INTERVAL_MS);
  }

  /**
   * Stops the background evaluation timer on logout or session change.
   */
  static stopScheduler() {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  }
}
