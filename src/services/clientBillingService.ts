import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ClientContract, 
  RateCard, 
  ClientInvoice, 
  SlaBreachRecord, 
  ContractProfitabilitySummary 
} from '../types/clientBilling';
import { ClientBillingEngine, ShiftAttendanceSummary } from '../server/clientBillingEngine';

const CONTRACTS_CACHE_KEY = 'lsm_contracts_cache';
const RATE_CARDS_CACHE_KEY = 'lsm_rate_cards_cache';
const INVOICES_CACHE_KEY = 'lsm_invoices_cache';
const BREACHES_CACHE_KEY = 'lsm_sla_breaches_cache';

export class ClientBillingService {
  /**
   * Fetch all contracts for a company, optionally scoped to a client
   */
  public static async getContracts(companyId: string, clientId?: string): Promise<ClientContract[]> {
    try {
      const contractsRef = collection(db, `companies/${companyId}/contracts`);
      const q = clientId 
        ? query(contractsRef, where('clientId', '==', clientId))
        : contractsRef;
      
      const snapshot = await getDocs(q);
      const list: ClientContract[] = [];
      snapshot.forEach(d => list.push(d.data() as ClientContract));

      if (list.length > 0) {
        localStorage.setItem(`${CONTRACTS_CACHE_KEY}_${companyId}`, JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn('[ClientBillingService] Firestore query failed, checking local cache:', err);
    }

    // Fallback to local cache or seed contracts
    const cached = localStorage.getItem(`${CONTRACTS_CACHE_KEY}_${companyId}`);
    if (cached) {
      const parsed = JSON.parse(cached) as ClientContract[];
      return clientId ? parsed.filter(c => c.clientId === clientId) : parsed;
    }

    // Default sample contracts for instant functionality
    const seedContracts: ClientContract[] = [
      {
        id: 'CONTRACT-TATA-001',
        contractId: 'CONTRACT-TATA-001',
        companyId,
        clientId: 'CLIENT-TATA-STEEL',
        clientName: 'Tata Steel Operations Ltd.',
        contractNumber: 'SLA-2026-TATA-01',
        title: 'Industrial Plant Perimeter & Main Gate Security',
        siteIds: ['SITE-MUM-01', 'SITE-MUM-02'],
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        billingCycle: 'MONTHLY',
        autoRenewal: true,
        status: 'ACTIVE',
        slaTerms: {
          minGuardsRequiredPerShift: 6,
          minGuardsPerSite: {
            'SITE-MUM-01': 6,
            'SITE-MUM-02': 4
          },
          responseDeadlineMinutes: 15,
          penaltyPerShortfallShift: 1500,
          maxPenaltyCapPercent: 12
        },
        paymentTermsDays: 30,
        createdAt: Date.now() - 60 * 86400000,
        updatedAt: Date.now()
      },
      {
        id: 'CONTRACT-GODREJ-002',
        contractId: 'CONTRACT-GODREJ-002',
        companyId,
        clientId: 'CLIENT-GODREJ-PROP',
        clientName: 'Godrej Properties HQ',
        contractNumber: 'SLA-2026-GDJ-09',
        title: 'Commercial Complex & Executive Access Control',
        siteIds: ['SITE-PUN-01'],
        startDate: '2026-02-01',
        endDate: '2027-01-31',
        billingCycle: 'MONTHLY',
        autoRenewal: true,
        status: 'ACTIVE',
        slaTerms: {
          minGuardsRequiredPerShift: 4,
          minGuardsPerSite: {
            'SITE-PUN-01': 4
          },
          responseDeadlineMinutes: 10,
          penaltyPerShortfallShift: 2000,
          maxPenaltyCapPercent: 15
        },
        paymentTermsDays: 15,
        createdAt: Date.now() - 30 * 86400000,
        updatedAt: Date.now()
      }
    ];

    localStorage.setItem(`${CONTRACTS_CACHE_KEY}_${companyId}`, JSON.stringify(seedContracts));
    return clientId ? seedContracts.filter(c => c.clientId === clientId) : seedContracts;
  }

  /**
   * Save or update a contract
   */
  public static async saveContract(companyId: string, contract: ClientContract): Promise<void> {
    try {
      const docRef = doc(db, `companies/${companyId}/contracts`, contract.contractId);
      await setDoc(docRef, { ...contract, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('[ClientBillingService] Failed to write contract to Firestore, saving locally:', err);
    }

    const cached = await this.getContracts(companyId);
    const index = cached.findIndex(c => c.contractId === contract.contractId);
    if (index >= 0) {
      cached[index] = contract;
    } else {
      cached.push(contract);
    }
    localStorage.setItem(`${CONTRACTS_CACHE_KEY}_${companyId}`, JSON.stringify(cached));
  }

  /**
   * Fetch rate cards for a contract
   */
  public static async getRateCards(companyId: string, contractId?: string): Promise<RateCard[]> {
    try {
      const rateCardsRef = collection(db, `companies/${companyId}/rateCards`);
      const q = contractId 
        ? query(rateCardsRef, where('contractId', '==', contractId))
        : rateCardsRef;
      
      const snapshot = await getDocs(q);
      const list: RateCard[] = [];
      snapshot.forEach(d => list.push(d.data() as RateCard));

      if (list.length > 0) {
        localStorage.setItem(`${RATE_CARDS_CACHE_KEY}_${companyId}`, JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn('[ClientBillingService] Firestore rate card query failed:', err);
    }

    const cached = localStorage.getItem(`${RATE_CARDS_CACHE_KEY}_${companyId}`);
    if (cached) {
      const parsed = JSON.parse(cached) as RateCard[];
      return contractId ? parsed.filter(rc => rc.contractId === contractId) : parsed;
    }

    // Default rate cards
    const seedRateCards: RateCard[] = [
      {
        id: 'RC-TATA-GD-01',
        rateCardId: 'RC-TATA-GD-01',
        companyId,
        clientId: 'CLIENT-TATA-STEEL',
        contractId: 'CONTRACT-TATA-001',
        role: 'GUARD',
        shiftType: 'ALL',
        ratePerShift: 950,
        ratePerHour: 118.75,
        overtimeRatePerHour: 178,
        effectiveFrom: '2026-01-01',
        version: 1,
        status: 'ACTIVE',
        createdAt: Date.now() - 50 * 86400000
      },
      {
        id: 'RC-TATA-SUP-01',
        rateCardId: 'RC-TATA-SUP-01',
        companyId,
        clientId: 'CLIENT-TATA-STEEL',
        contractId: 'CONTRACT-TATA-001',
        role: 'SUPERVISOR',
        shiftType: 'ALL',
        ratePerShift: 1350,
        ratePerHour: 168.75,
        overtimeRatePerHour: 250,
        effectiveFrom: '2026-01-01',
        version: 1,
        status: 'ACTIVE',
        createdAt: Date.now() - 50 * 86400000
      },
      {
        id: 'RC-GDJ-GD-01',
        rateCardId: 'RC-GDJ-GD-01',
        companyId,
        clientId: 'CLIENT-GODREJ-PROP',
        contractId: 'CONTRACT-GODREJ-002',
        role: 'GUARD',
        shiftType: 'ALL',
        ratePerShift: 1100,
        ratePerHour: 137.5,
        overtimeRatePerHour: 200,
        effectiveFrom: '2026-02-01',
        version: 1,
        status: 'ACTIVE',
        createdAt: Date.now() - 30 * 86400000
      }
    ];

    localStorage.setItem(`${RATE_CARDS_CACHE_KEY}_${companyId}`, JSON.stringify(seedRateCards));
    return contractId ? seedRateCards.filter(rc => rc.contractId === contractId) : seedRateCards;
  }

  /**
   * Save a rate card
   */
  public static async saveRateCard(companyId: string, rateCard: RateCard): Promise<void> {
    try {
      const docRef = doc(db, `companies/${companyId}/rateCards`, rateCard.rateCardId);
      await setDoc(docRef, { ...rateCard, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('[ClientBillingService] Save rate card to Firestore failed:', err);
    }

    const cached = await this.getRateCards(companyId);
    const index = cached.findIndex(rc => rc.rateCardId === rateCard.rateCardId);
    if (index >= 0) {
      cached[index] = rateCard;
    } else {
      cached.push(rateCard);
    }
    localStorage.setItem(`${RATE_CARDS_CACHE_KEY}_${companyId}`, JSON.stringify(cached));
  }

  /**
   * Fetch SLA breaches
   */
  public static async getSlaBreaches(companyId: string, contractId?: string): Promise<SlaBreachRecord[]> {
    try {
      const breachesRef = collection(db, `companies/${companyId}/slaBreaches`);
      const q = contractId 
        ? query(breachesRef, where('contractId', '==', contractId))
        : breachesRef;
      
      const snapshot = await getDocs(q);
      const list: SlaBreachRecord[] = [];
      snapshot.forEach(d => list.push(d.data() as SlaBreachRecord));

      if (list.length > 0) {
        localStorage.setItem(`${BREACHES_CACHE_KEY}_${companyId}`, JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn('[ClientBillingService] SLA breach fetch failed:', err);
    }

    const cached = localStorage.getItem(`${BREACHES_CACHE_KEY}_${companyId}`);
    if (cached) {
      const parsed = JSON.parse(cached) as SlaBreachRecord[];
      return contractId ? parsed.filter(b => b.contractId === contractId) : parsed;
    }

    const seedBreaches: SlaBreachRecord[] = [
      {
        id: 'BREACH-TATA-01-20260212-NIGHT',
        breachId: 'BREACH-TATA-01-20260212-NIGHT',
        companyId,
        clientId: 'CLIENT-TATA-STEEL',
        contractId: 'CONTRACT-TATA-001',
        contractNumber: 'SLA-2026-TATA-01',
        siteId: 'SITE-MUM-01',
        siteName: 'Tata Steel Works Mumbai',
        shiftType: 'NIGHT',
        date: '2026-02-12',
        contractedStrength: 6,
        actualStrength: 4,
        shortfall: 2,
        penaltyAmount: 3000,
        status: 'CONFIRMED',
        createdAt: Date.now() - 15 * 86400000
      }
    ];

    localStorage.setItem(`${BREACHES_CACHE_KEY}_${companyId}`, JSON.stringify(seedBreaches));
    return contractId ? seedBreaches.filter(b => b.contractId === contractId) : seedBreaches;
  }

  /**
   * Update breach status (e.g. WAIVED, DISPUTED, CONFIRMED)
   */
  public static async updateBreachStatus(
    companyId: string, 
    breachId: string, 
    status: SlaBreachRecord['status']
  ): Promise<void> {
    try {
      const docRef = doc(db, `companies/${companyId}/slaBreaches`, breachId);
      await setDoc(docRef, { status, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('[ClientBillingService] Update breach failed:', err);
    }

    const cached = await this.getSlaBreaches(companyId);
    const breach = cached.find(b => b.breachId === breachId);
    if (breach) {
      breach.status = status;
      localStorage.setItem(`${BREACHES_CACHE_KEY}_${companyId}`, JSON.stringify(cached));
    }
  }

  /**
   * Fetch Client Invoices
   */
  public static async getInvoices(companyId: string, clientId?: string): Promise<ClientInvoice[]> {
    try {
      const invRef = collection(db, `companies/${companyId}/clientInvoices`);
      const q = clientId ? query(invRef, where('clientId', '==', clientId)) : invRef;
      const snapshot = await getDocs(q);
      const list: ClientInvoice[] = [];
      snapshot.forEach(d => list.push(d.data() as ClientInvoice));

      if (list.length > 0) {
        localStorage.setItem(`${INVOICES_CACHE_KEY}_${companyId}`, JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn('[ClientBillingService] Fetch invoices failed:', err);
    }

    const cached = localStorage.getItem(`${INVOICES_CACHE_KEY}_${companyId}`);
    if (cached) {
      const parsed = JSON.parse(cached) as ClientInvoice[];
      return clientId ? parsed.filter(inv => inv.clientId === clientId) : parsed;
    }

    // Generate initial invoice from seed data
    const contracts = await this.getContracts(companyId);
    const tataContract = contracts[0];
    const rateCards = await this.getRateCards(companyId, tataContract.contractId);
    const breaches = await this.getSlaBreaches(companyId, tataContract.contractId);

    // Synthetic attendance data for 1 month (28 days x 6 guards = 168 shifts)
    const seedAttendance: ShiftAttendanceSummary[] = [];
    for (let day = 1; day <= 28; day++) {
      const dateStr = `2026-02-${day.toString().padStart(2, '0')}`;
      seedAttendance.push({
        siteId: 'SITE-MUM-01',
        siteName: 'Tata Steel Works Mumbai',
        date: dateStr,
        shiftType: 'DAY',
        role: 'GUARD',
        guardCount: 5,
        totalHours: 40,
        workerCost: 5 * 550 // wages
      });
      seedAttendance.push({
        siteId: 'SITE-MUM-01',
        siteName: 'Tata Steel Works Mumbai',
        date: dateStr,
        shiftType: 'DAY',
        role: 'SUPERVISOR',
        guardCount: 1,
        totalHours: 8,
        workerCost: 800
      });
    }

    const seedInvoice = ClientBillingEngine.generateInvoice({
      contract: tataContract,
      rateCards,
      attendanceSummaries: seedAttendance,
      activeBreaches: breaches,
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28'
    });
    seedInvoice.status = 'SENT';

    const seedList = [seedInvoice];
    localStorage.setItem(`${INVOICES_CACHE_KEY}_${companyId}`, JSON.stringify(seedList));
    return clientId ? seedList.filter(inv => inv.clientId === clientId) : seedList;
  }

  /**
   * Generate an Idempotent Invoice using the ClientBillingEngine
   */
  public static async generateInvoice(params: {
    companyId: string;
    contractId: string;
    periodStart: string;
    periodEnd: string;
    createdByUser?: string;
  }): Promise<ClientInvoice> {
    const contracts = await this.getContracts(params.companyId);
    const contract = contracts.find(c => c.contractId === params.contractId);
    if (!contract) {
      throw new Error(`Contract ${params.contractId} not found`);
    }

    const rateCards = await this.getRateCards(params.companyId, contract.contractId);
    const breaches = await this.getSlaBreaches(params.companyId, contract.contractId);
    const existingInvoices = await this.getInvoices(params.companyId);

    const idempotencyKey = `${params.companyId}_${params.contractId}_${params.periodStart}_${params.periodEnd}`;
    const existing = existingInvoices.find(inv => inv.idempotencyKey === idempotencyKey);

    // Build shift attendance records for that duration
    const startDate = new Date(params.periodStart);
    const endDate = new Date(params.periodEnd);
    const summaries: ShiftAttendanceSummary[] = [];

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateStr = cur.toISOString().split('T')[0];
      for (const sId of contract.siteIds) {
        summaries.push({
          siteId: sId,
          siteName: `Site ${sId}`,
          date: dateStr,
          shiftType: 'DAY',
          role: 'GUARD',
          guardCount: contract.slaTerms.minGuardsPerSite?.[sId] || contract.slaTerms.minGuardsRequiredPerShift || 4,
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
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      existingInvoice: existing,
      createdByUser: params.createdByUser
    });

    try {
      const docRef = doc(db, `companies/${params.companyId}/clientInvoices`, invoice.invoiceId);
      await setDoc(docRef, invoice, { merge: true });
    } catch (err) {
      console.warn('[ClientBillingService] Save invoice to Firestore failed:', err);
    }

    const index = existingInvoices.findIndex(inv => inv.invoiceId === invoice.invoiceId);
    if (index >= 0) {
      existingInvoices[index] = invoice;
    } else {
      existingInvoices.push(invoice);
    }
    localStorage.setItem(`${INVOICES_CACHE_KEY}_${params.companyId}`, JSON.stringify(existingInvoices));

    return invoice;
  }

  /**
   * Update invoice status
   */
  public static async updateInvoiceStatus(
    companyId: string, 
    invoiceId: string, 
    status: ClientInvoice['status']
  ): Promise<void> {
    try {
      const docRef = doc(db, `companies/${companyId}/clientInvoices`, invoiceId);
      await setDoc(docRef, { status, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('[ClientBillingService] Firestore invoice status update failed:', err);
    }

    const invoices = await this.getInvoices(companyId);
    const target = invoices.find(inv => inv.invoiceId === invoiceId);
    if (target) {
      target.status = status;
      target.updatedAt = Date.now();
      localStorage.setItem(`${INVOICES_CACHE_KEY}_${companyId}`, JSON.stringify(invoices));
    }
  }

  /**
   * Calculate Contract Profitability
   */
  public static async getContractProfitability(
    companyId: string, 
    contractId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<ContractProfitabilitySummary> {
    const contracts = await this.getContracts(companyId);
    const contract = contracts.find(c => c.contractId === contractId);
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    const invoices = await this.getInvoices(companyId);
    let invoice = invoices.find(
      inv => inv.contractId === contractId && inv.billingPeriodStart === periodStart
    );

    if (!invoice) {
      invoice = await this.generateInvoice({
        companyId,
        contractId,
        periodStart,
        periodEnd
      });
    }

    // Build synthetic or actual attendance summaries
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    const summaries: ShiftAttendanceSummary[] = [];

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateStr = cur.toISOString().split('T')[0];
      for (const sId of contract.siteIds) {
        const count = contract.slaTerms.minGuardsPerSite?.[sId] || contract.slaTerms.minGuardsRequiredPerShift || 4;
        summaries.push({
          siteId: sId,
          siteName: `Site ${sId}`,
          date: dateStr,
          shiftType: 'DAY',
          role: 'GUARD',
          guardCount: count,
          totalHours: count * 8,
          workerCost: count * 550 // daily guard wage
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    return ClientBillingEngine.calculateProfitability({
      contract,
      invoice,
      attendanceSummaries: summaries
    });
  }
}
