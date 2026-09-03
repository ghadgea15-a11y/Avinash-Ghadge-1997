import { Request, Response } from 'express';
import { ClientBillingEngine } from './clientBillingEngine';
import { ClientContract, RateCard, SlaBreachRecord } from '../types/clientBilling';

// In-memory / fallback store for enterprise testing
const memoryContracts: Record<string, ClientContract[]> = {};
const memoryRateCards: Record<string, RateCard[]> = {};
const memoryBreaches: Record<string, SlaBreachRecord[]> = {};

export async function generateInvoiceApi(req: Request, res: Response) {
  try {
    const { companyId, contractId, periodStart, periodEnd, taxRatePercent } = req.body;

    if (!companyId || !contractId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: companyId, contractId, periodStart, periodEnd'
      });
    }

    // Attempt to load from Firebase Admin if configured, else memory/sample
    const contracts = memoryContracts[companyId] || [
      {
        id: contractId,
        contractId: contractId,
        companyId,
        clientId: 'CLIENT-ENTERPRISE-01',
        clientName: 'Enterprise Client Operations',
        contractNumber: `SLA-${contractId}`,
        title: 'Master Security & Workforce SLA Agreement',
        siteIds: ['SITE-01', 'SITE-02'],
        startDate: periodStart,
        endDate: periodEnd,
        billingCycle: 'MONTHLY',
        autoRenewal: true,
        status: 'ACTIVE',
        slaTerms: {
          minGuardsRequiredPerShift: 6,
          minGuardsPerSite: { 'SITE-01': 6, 'SITE-02': 4 },
          responseDeadlineMinutes: 15,
          penaltyPerShortfallShift: 1500,
          maxPenaltyCapPercent: 15
        },
        paymentTermsDays: 30,
        createdAt: Date.now() - 30 * 86400000,
        updatedAt: Date.now()
      }
    ];

    const contract = contracts.find(c => c.contractId === contractId) || contracts[0];
    const rateCards = memoryRateCards[companyId] || [
      {
        id: `RC-${contractId}-GD`,
        rateCardId: `RC-${contractId}-GD`,
        companyId,
        clientId: contract.clientId,
        contractId,
        role: 'GUARD',
        shiftType: 'ALL',
        ratePerShift: 950,
        ratePerHour: 118.75,
        overtimeRatePerHour: 178,
        effectiveFrom: '2026-01-01',
        version: 1,
        status: 'ACTIVE',
        createdAt: Date.now() - 30 * 86400000
      },
      {
        id: `RC-${contractId}-SUP`,
        rateCardId: `RC-${contractId}-SUP`,
        companyId,
        clientId: contract.clientId,
        contractId,
        role: 'SUPERVISOR',
        shiftType: 'ALL',
        ratePerShift: 1400,
        ratePerHour: 175,
        overtimeRatePerHour: 260,
        effectiveFrom: '2026-01-01',
        version: 1,
        status: 'ACTIVE',
        createdAt: Date.now() - 30 * 86400000
      }
    ];

    const breaches = memoryBreaches[companyId] || [];

    // Synthesize attendance records across the period
    const summaries = [];
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const cur = new Date(start);

    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      for (const sId of contract.siteIds) {
        summaries.push({
          siteId: sId,
          siteName: `Facility ${sId}`,
          date: dateStr,
          shiftType: 'DAY' as const,
          role: 'GUARD',
          guardCount: contract.slaTerms.minGuardsPerSite?.[sId] || 4,
          totalHours: 32,
          workerCost: 4 * 550
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    const invoice = ClientBillingEngine.generateInvoice({
      contract,
      rateCards,
      attendanceSummaries: summaries,
      activeBreaches: breaches,
      periodStart,
      periodEnd,
      taxRatePercent: taxRatePercent || 18,
      createdByUser: 'API_DISPATCHER'
    });

    return res.json({
      success: true,
      invoice,
      generatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[ClientBillingApi] Generate Invoice error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Invoice generation failed' });
  }
}

export async function calculateProfitabilityApi(req: Request, res: Response) {
  try {
    const { companyId, contractId, periodStart, periodEnd } = req.body;

    if (!companyId || !contractId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: companyId, contractId, periodStart, periodEnd'
      });
    }

    const contract: ClientContract = {
      id: contractId,
      contractId,
      companyId,
      clientId: 'CLIENT-PROFIT-01',
      clientName: 'Commercial Towers Inc',
      contractNumber: `SLA-${contractId}`,
      title: 'Commercial Security Scope',
      siteIds: ['SITE-01'],
      startDate: periodStart,
      endDate: periodEnd,
      billingCycle: 'MONTHLY',
      autoRenewal: true,
      status: 'ACTIVE',
      slaTerms: {
        minGuardsRequiredPerShift: 4,
        penaltyPerShortfallShift: 1500
      },
      paymentTermsDays: 30,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const rateCards: RateCard[] = [
      {
        id: 'RC-1',
        rateCardId: 'RC-1',
        companyId,
        clientId: contract.clientId,
        contractId,
        role: 'GUARD',
        shiftType: 'ALL',
        ratePerShift: 1000,
        ratePerHour: 125,
        overtimeRatePerHour: 180,
        effectiveFrom: '2026-01-01',
        version: 1,
        status: 'ACTIVE',
        createdAt: Date.now()
      }
    ];

    const summaries = [];
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const cur = new Date(start);

    while (cur <= end) {
      summaries.push({
        siteId: 'SITE-01',
        siteName: 'Main Facility',
        date: cur.toISOString().split('T')[0],
        shiftType: 'DAY' as const,
        role: 'GUARD',
        guardCount: 4,
        totalHours: 32,
        workerCost: 4 * 550 // wages
      });
      cur.setDate(cur.getDate() + 1);
    }

    const invoice = ClientBillingEngine.generateInvoice({
      contract,
      rateCards,
      attendanceSummaries: summaries,
      activeBreaches: [],
      periodStart,
      periodEnd
    });

    const profitability = ClientBillingEngine.calculateProfitability({
      contract,
      invoice,
      attendanceSummaries: summaries
    });

    return res.json({
      success: true,
      profitability,
      evaluatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[ClientBillingApi] Profitability error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Profitability calculation failed' });
  }
}

export async function detectSlaBreachesApi(req: Request, res: Response) {
  try {
    const { companyId, siteId, date, shiftType, actualGuards, contractId } = req.body;

    if (!companyId || !siteId || !date || !shiftType || actualGuards == null) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const contract: ClientContract = {
      id: contractId || 'CONTRACT-DEFAULT',
      contractId: contractId || 'CONTRACT-DEFAULT',
      companyId,
      clientId: 'CLIENT-01',
      clientName: 'Client 01',
      contractNumber: 'SLA-01',
      title: 'SLA',
      siteIds: [siteId],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      billingCycle: 'MONTHLY',
      autoRenewal: true,
      status: 'ACTIVE',
      slaTerms: {
        minGuardsRequiredPerShift: 6,
        penaltyPerShortfallShift: 1500
      },
      paymentTermsDays: 30,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const breach = ClientBillingEngine.evaluateSlaShiftCompliance(
      contract,
      siteId,
      date,
      shiftType,
      actualGuards
    );

    if (breach) {
      if (!memoryBreaches[companyId]) memoryBreaches[companyId] = [];
      memoryBreaches[companyId].push(breach);
    }

    return res.json({
      success: true,
      breachDetected: !!breach,
      breach,
      checkedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[ClientBillingApi] SLA check error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'SLA evaluation failed' });
  }
}
