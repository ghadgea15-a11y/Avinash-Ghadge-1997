import { 
  ClientContract, 
  RateCard, 
  ClientInvoice, 
  InvoiceLineItem, 
  InvoiceSlaPenaltyItem, 
  SlaBreachRecord, 
  ContractProfitabilitySummary 
} from '../types/clientBilling';

export interface ShiftAttendanceSummary {
  siteId: string;
  siteName?: string;
  date: string; // YYYY-MM-DD
  shiftType: 'DAY' | 'NIGHT' | 'ALL';
  role: string; // e.g. 'GUARD'
  guardCount: number;
  totalHours: number;
  workerCost: number; // Wages paid to guards for this shift
}

export class ClientBillingEngine {
  /**
   * Versioned Rate Card Resolution:
   * Finds the latest active rate card whose effectiveFrom <= targetDate.
   */
  public static resolveEffectiveRateCard(
    rateCards: RateCard[],
    role: string,
    shiftType: 'DAY' | 'NIGHT' | 'ALL',
    targetDate: string,
    siteId?: string
  ): RateCard | null {
    const candidates = rateCards.filter(rc => {
      if (rc.status !== 'ACTIVE') return false;
      if (rc.role !== role && rc.role !== 'ALL') return false;
      if (rc.shiftType !== 'ALL' && rc.shiftType !== shiftType) return false;
      if (rc.siteId && siteId && rc.siteId !== siteId) return false;
      return rc.effectiveFrom <= targetDate;
    });

    if (candidates.length === 0) return null;

    // Sort descending by effectiveFrom, then site-specificity, then version
    candidates.sort((a, b) => {
      if (a.effectiveFrom !== b.effectiveFrom) {
        return b.effectiveFrom.localeCompare(a.effectiveFrom);
      }
      const aSiteWeight = a.siteId ? 1 : 0;
      const bSiteWeight = b.siteId ? 1 : 0;
      if (aSiteWeight !== bSiteWeight) {
        return bSiteWeight - aSiteWeight;
      }
      return b.version - a.version;
    });

    return candidates[0];
  }

  /**
   * Nightly / Shift SLA Compliance Check:
   * Compares actual attendance against contracted minimum strength.
   */
  public static evaluateSlaShiftCompliance(
    contract: ClientContract,
    siteId: string,
    date: string,
    shiftType: 'DAY' | 'NIGHT' | 'GENERAL',
    actualGuardCount: number,
    siteName?: string
  ): SlaBreachRecord | null {
    const minGuards = contract.slaTerms.minGuardsPerSite?.[siteId] ?? 
                      contract.slaTerms.minGuardsRequiredPerShift ?? 0;

    if (actualGuardCount < minGuards) {
      const shortfall = minGuards - actualGuardCount;
      const penaltyAmount = shortfall * (contract.slaTerms.penaltyPerShortfallShift || 0);

      const breachId = `BREACH-${contract.contractId}-${siteId}-${date}-${shiftType}`;
      return {
        id: breachId,
        breachId,
        companyId: contract.companyId,
        clientId: contract.clientId,
        contractId: contract.contractId,
        contractNumber: contract.contractNumber,
        siteId,
        siteName: siteName || `Site ${siteId}`,
        shiftType,
        date,
        contractedStrength: minGuards,
        actualStrength: actualGuardCount,
        shortfall,
        penaltyAmount,
        status: 'AUTO_DETECTED',
        createdAt: Date.now()
      };
    }

    return null;
  }

  /**
   * Idempotent Client Invoice Generator:
   * Aggregates attendance × rate cards, subtracts SLA penalties, produces line items and net invoice.
   */
  public static generateInvoice(params: {
    contract: ClientContract;
    rateCards: RateCard[];
    attendanceSummaries: ShiftAttendanceSummary[];
    activeBreaches: SlaBreachRecord[];
    periodStart: string; // YYYY-MM-DD
    periodEnd: string; // YYYY-MM-DD
    taxRatePercent?: number; // default 18%
    existingInvoice?: ClientInvoice | null;
    createdByUser?: string;
  }): ClientInvoice {
    const { 
      contract, 
      rateCards, 
      attendanceSummaries, 
      activeBreaches, 
      periodStart, 
      periodEnd, 
      taxRatePercent = 18,
      existingInvoice,
      createdByUser 
    } = params;

    const idempotencyKey = `${contract.companyId}_${contract.contractId}_${periodStart}_${periodEnd}`;
    const invoiceId = existingInvoice?.invoiceId || `INV-${contract.contractNumber}-${periodStart.replace(/-/g, '')}`;

    // 1. Compute Line Items
    const lineItemMap = new Map<string, InvoiceLineItem>();

    for (const shift of attendanceSummaries) {
      if (shift.date < periodStart || shift.date > periodEnd) continue;

      const rateCard = this.resolveEffectiveRateCard(
        rateCards,
        shift.role,
        shift.shiftType,
        shift.date,
        shift.siteId
      );

      const unitPrice = rateCard ? rateCard.ratePerShift : 0;
      const key = `${shift.siteId}_${shift.role}_${shift.shiftType}_${unitPrice}`;

      const existing = lineItemMap.get(key);
      if (existing) {
        existing.units += shift.guardCount;
        existing.amount = existing.units * existing.unitPrice;
      } else {
        lineItemMap.set(key, {
          lineItemId: `LI-${key}`,
          description: `${shift.role} (${shift.shiftType} Shift) - ${shift.siteName || shift.siteId}`,
          siteId: shift.siteId,
          siteName: shift.siteName,
          role: shift.role,
          shiftType: shift.shiftType,
          units: shift.guardCount,
          unitPrice,
          amount: shift.guardCount * unitPrice
        });
      }
    }

    const lineItems = Array.from(lineItemMap.values());
    const grossAmount = lineItems.reduce((acc, item) => acc + item.amount, 0);

    // 2. Compute SLA Penalties
    const periodBreaches = activeBreaches.filter(
      b => b.date >= periodStart && b.date <= periodEnd && b.status !== 'WAIVED'
    );

    let rawPenaltySum = 0;
    const slaPenaltyItems: InvoiceSlaPenaltyItem[] = periodBreaches.map(b => {
      rawPenaltySum += b.penaltyAmount;
      return {
        breachId: b.breachId,
        siteId: b.siteId,
        siteName: b.siteName,
        date: b.date,
        shift: b.shiftType,
        contractedStrength: b.contractedStrength,
        actualStrength: b.actualStrength,
        shortfall: b.shortfall,
        penaltyAmount: b.penaltyAmount,
        reason: `Muster strength shortfall: ${b.actualStrength}/${b.contractedStrength} guards present.`
      };
    });

    // Apply penalty cap if configured in contract SLA
    let totalPenaltyDeduction = rawPenaltySum;
    if (contract.slaTerms.maxPenaltyCapPercent != null) {
      const maxAllowed = (grossAmount * contract.slaTerms.maxPenaltyCapPercent) / 100;
      if (totalPenaltyDeduction > maxAllowed) {
        totalPenaltyDeduction = maxAllowed;
      }
    }

    // 3. Tax & Net Calculation
    const taxableBase = Math.max(0, grossAmount - totalPenaltyDeduction);
    const taxAmount = Math.round((taxableBase * taxRatePercent) / 100);
    const netAmount = taxableBase + taxAmount;

    // Due date calculated from payment terms
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + (contract.paymentTermsDays || 30));
    const dueDate = dueDateObj.toISOString().split('T')[0];

    return {
      id: invoiceId,
      invoiceId,
      companyId: contract.companyId,
      clientId: contract.clientId,
      clientName: contract.clientName,
      contractId: contract.contractId,
      contractNumber: contract.contractNumber,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate,
      lineItems,
      grossAmount,
      slaPenalties: slaPenaltyItems,
      totalPenaltyDeduction,
      taxRatePercent,
      taxAmount,
      netAmount,
      status: existingInvoice?.status === 'PAID' ? 'PAID' : (existingInvoice?.status === 'SENT' ? 'SENT' : 'DRAFT'),
      idempotencyKey,
      createdAt: existingInvoice?.createdAt || Date.now(),
      updatedAt: Date.now(),
      createdByUser: createdByUser || 'SYSTEM_BILLING_DAEMON'
    };
  }

  /**
   * Contract Profitability Engine:
   * Compares Client Billed Revenue against direct Guard Wages & Overtime costs.
   */
  public static calculateProfitability(params: {
    contract: ClientContract;
    invoice: ClientInvoice;
    attendanceSummaries: ShiftAttendanceSummary[];
  }): ContractProfitabilitySummary {
    const { contract, invoice, attendanceSummaries } = params;

    const directWorkerCost = attendanceSummaries
      .filter(s => s.date >= invoice.billingPeriodStart && s.date <= invoice.billingPeriodEnd)
      .reduce((acc, s) => acc + (s.workerCost || 0), 0);

    const totalDeployedShifts = attendanceSummaries
      .filter(s => s.date >= invoice.billingPeriodStart && s.date <= invoice.billingPeriodEnd)
      .reduce((acc, s) => acc + (s.guardCount || 0), 0);

    const grossProfit = invoice.netAmount - directWorkerCost;
    const profitMarginPercent = invoice.netAmount > 0 
      ? Number(((grossProfit / invoice.netAmount) * 100).toFixed(2)) 
      : 0;

    let healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL' = 'HEALTHY';
    if (profitMarginPercent < 5) {
      healthStatus = 'CRITICAL';
    } else if (profitMarginPercent < 18) {
      healthStatus = 'AT_RISK';
    }

    return {
      contractId: contract.contractId,
      contractNumber: contract.contractNumber,
      clientId: contract.clientId,
      clientName: contract.clientName,
      siteIds: contract.siteIds,
      periodStart: invoice.billingPeriodStart,
      periodEnd: invoice.billingPeriodEnd,
      totalBilledRevenue: invoice.netAmount,
      directWorkerCost,
      grossProfit,
      profitMarginPercent,
      slaPenaltyImpact: invoice.totalPenaltyDeduction,
      totalDeployedShifts,
      healthStatus
    };
  }
}
