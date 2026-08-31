import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { StatutoryConfigRecord, PtSlab } from '../types';

export const DEFAULT_STATE_STATUTORY_CONFIGS: Record<string, StatutoryConfigRecord> = {
  MAHARASHTRA: {
    companyId: 'DEFAULT',
    state: 'MAHARASHTRA',
    stateName: 'Maharashtra',
    pfEnabled: true,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    pfWageCeiling: 15000,
    pfCapAmount: 1800,
    pfCappedAtCeiling: true,
    esiEnabled: true,
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiWageCeiling: 21000,
    ptEnabled: true,
    ptSlabs: [
      { minSalary: 0, maxSalary: 7500, amount: 0, febAmount: 0 },
      { minSalary: 7501, maxSalary: 10000, amount: 175, febAmount: 175 },
      { minSalary: 10001, maxSalary: 99999999, amount: 200, febAmount: 300 }
    ],
    tdsEnabled: true,
    tdsThreshold: 50000,
    tdsDefaultRate: 5,
    lwfEnabled: true,
    lwfEmployeeAmount: 12,
    lwfEmployerAmount: 36
  },
  KARNATAKA: {
    companyId: 'DEFAULT',
    state: 'KARNATAKA',
    stateName: 'Karnataka',
    pfEnabled: true,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    pfWageCeiling: 15000,
    pfCapAmount: 1800,
    pfCappedAtCeiling: true,
    esiEnabled: true,
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiWageCeiling: 21000,
    ptEnabled: true,
    ptSlabs: [
      { minSalary: 0, maxSalary: 14999, amount: 0 },
      { minSalary: 15000, maxSalary: 99999999, amount: 200 }
    ],
    tdsEnabled: true,
    tdsThreshold: 50000,
    tdsDefaultRate: 5
  },
  GUJARAT: {
    companyId: 'DEFAULT',
    state: 'GUJARAT',
    stateName: 'Gujarat',
    pfEnabled: true,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    pfWageCeiling: 15000,
    pfCapAmount: 1800,
    pfCappedAtCeiling: true,
    esiEnabled: true,
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiWageCeiling: 21000,
    ptEnabled: true,
    ptSlabs: [
      { minSalary: 0, maxSalary: 5999, amount: 0 },
      { minSalary: 6000, maxSalary: 8999, amount: 80 },
      { minSalary: 9000, maxSalary: 11999, amount: 150 },
      { minSalary: 12000, maxSalary: 99999999, amount: 200 }
    ],
    tdsEnabled: true,
    tdsThreshold: 50000,
    tdsDefaultRate: 5
  },
  TELANGANA: {
    companyId: 'DEFAULT',
    state: 'TELANGANA',
    stateName: 'Telangana',
    pfEnabled: true,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    pfWageCeiling: 15000,
    pfCapAmount: 1800,
    pfCappedAtCeiling: true,
    esiEnabled: true,
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiWageCeiling: 21000,
    ptEnabled: true,
    ptSlabs: [
      { minSalary: 0, maxSalary: 15000, amount: 0 },
      { minSalary: 15001, maxSalary: 20000, amount: 150 },
      { minSalary: 20001, maxSalary: 99999999, amount: 200 }
    ],
    tdsEnabled: true,
    tdsThreshold: 50000,
    tdsDefaultRate: 5
  },
  WEST_BENGAL: {
    companyId: 'DEFAULT',
    state: 'WEST_BENGAL',
    stateName: 'West Bengal',
    pfEnabled: true,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    pfWageCeiling: 15000,
    pfCapAmount: 1800,
    pfCappedAtCeiling: true,
    esiEnabled: true,
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiWageCeiling: 21000,
    ptEnabled: true,
    ptSlabs: [
      { minSalary: 0, maxSalary: 10000, amount: 0 },
      { minSalary: 10001, maxSalary: 15000, amount: 110 },
      { minSalary: 15001, maxSalary: 25000, amount: 130 },
      { minSalary: 25001, maxSalary: 40000, amount: 150 },
      { minSalary: 40001, maxSalary: 99999999, amount: 200 }
    ],
    tdsEnabled: true,
    tdsThreshold: 50000,
    tdsDefaultRate: 5
  },
  DELHI: {
    companyId: 'DEFAULT',
    state: 'DELHI',
    stateName: 'Delhi (NCR)',
    pfEnabled: true,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    pfWageCeiling: 15000,
    pfCapAmount: 1800,
    pfCappedAtCeiling: true,
    esiEnabled: true,
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiWageCeiling: 21000,
    ptEnabled: false, // No Professional Tax in Delhi
    ptSlabs: [],
    tdsEnabled: true,
    tdsThreshold: 50000,
    tdsDefaultRate: 5
  },
  DEFAULT: {
    companyId: 'DEFAULT',
    state: 'DEFAULT',
    stateName: 'National Default',
    pfEnabled: true,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    pfWageCeiling: 15000,
    pfCapAmount: 1800,
    pfCappedAtCeiling: true,
    esiEnabled: true,
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiWageCeiling: 21000,
    ptEnabled: true,
    ptSlabs: [
      { minSalary: 0, maxSalary: 14999, amount: 0 },
      { minSalary: 15000, maxSalary: 99999999, amount: 200 }
    ],
    tdsEnabled: true,
    tdsThreshold: 50000,
    tdsDefaultRate: 5
  }
};

export class StatutoryRulesService {
  /**
   * Fetch all statutory configs for a specific company from Firestore.
   * If not found, returns standard default rules.
   */
  static async getCompanyStatutoryConfigs(companyId: string): Promise<StatutoryConfigRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'statutory_configs');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as StatutoryConfigRecord));
      }
    } catch (err) {
      console.warn('[StatutoryRulesService] getCompanyStatutoryConfigs warning:', err);
    }

    // Return default base configs if Firestore has none yet
    return Object.values(DEFAULT_STATE_STATUTORY_CONFIGS).map(cfg => ({
      ...cfg,
      companyId
    }));
  }

  /**
   * Fetch a single statutory config for a specific state.
   */
  static async getStateStatutoryConfig(companyId: string, stateNameOrCode?: string): Promise<StatutoryConfigRecord> {
    const normalizedState = this.normalizeStateKey(stateNameOrCode);
    
    try {
      const docRef = doc(db, 'companies', companyId, 'statutory_configs', normalizedState);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as StatutoryConfigRecord;
      }

      // Check for generic company default
      const defaultDocRef = doc(db, 'companies', companyId, 'statutory_configs', 'DEFAULT');
      const defaultSnap = await getDoc(defaultDocRef);
      if (defaultSnap.exists()) {
        return { id: defaultSnap.id, ...defaultSnap.data() } as StatutoryConfigRecord;
      }
    } catch (err) {
      console.warn('[StatutoryRulesService] getStateStatutoryConfig warning:', err);
    }

    // Return standard built-in state rules
    return DEFAULT_STATE_STATUTORY_CONFIGS[normalizedState] || DEFAULT_STATE_STATUTORY_CONFIGS.DEFAULT;
  }

  /**
   * Save / Update a dynamic state-wise statutory config in Firestore
   */
  static async saveStatutoryConfig(companyId: string, config: StatutoryConfigRecord, actor?: { id: string; name: string }): Promise<boolean> {
    try {
      const stateKey = this.normalizeStateKey(config.state);
      const docRef = doc(db, 'companies', companyId, 'statutory_configs', stateKey);
      
      const payload: StatutoryConfigRecord = {
        ...config,
        companyId,
        state: stateKey,
        updatedAt: new Date().toISOString(),
        updatedBy: actor ? actor.name : 'ADMIN'
      };

      await setDoc(docRef, payload, { merge: true });
      return true;
    } catch (err) {
      console.error('[StatutoryRulesService] saveStatutoryConfig error:', err);
      return false;
    }
  }

  /**
   * Calculate Professional Tax (PT) dynamically based on state slabs and month.
   */
  static calculatePt(grossSalary: number, config: StatutoryConfigRecord, month: number, gender: 'MALE' | 'FEMALE' | 'ALL' = 'ALL'): number {
    if (!config.ptEnabled || !config.ptSlabs || config.ptSlabs.length === 0) {
      return 0;
    }

    const isFebruary = month === 2;
    
    // Find matching slab
    const slab = config.ptSlabs.find(s => {
      const matchMin = grossSalary >= s.minSalary;
      const matchMax = grossSalary <= s.maxSalary;
      const matchGender = !s.gender || s.gender === 'ALL' || s.gender === gender;
      return matchMin && matchMax && matchGender;
    });

    if (!slab) {
      return 0;
    }

    if (isFebruary && slab.febAmount !== undefined) {
      return slab.febAmount;
    }

    return slab.amount;
  }

  /**
   * Calculate Provident Fund (PF) dynamically based on config.
   */
  static calculatePf(basicSalary: number, config: StatutoryConfigRecord): number {
    if (!config.pfEnabled) return 0;
    
    const rate = (config.pfEmployeeRate || 12) / 100;
    const rawPf = basicSalary * rate;

    if (config.pfCappedAtCeiling) {
      const cap = config.pfCapAmount || 1800;
      return Math.min(cap, rawPf);
    }

    return rawPf;
  }

  /**
   * Calculate ESIC dynamically based on gross salary ceiling.
   */
  static calculateEsi(grossSalary: number, config: StatutoryConfigRecord): number {
    if (!config.esiEnabled) return 0;
    
    const ceiling = config.esiWageCeiling || 21000;
    if (grossSalary > ceiling) return 0;

    const rate = (config.esiEmployeeRate || 0.75) / 100;
    return grossSalary * rate;
  }

  /**
   * Calculate TDS dynamically based on config.
   */
  static calculateTds(grossSalary: number, config: StatutoryConfigRecord): number {
    if (!config.tdsEnabled) return 0;

    const threshold = config.tdsThreshold || 50000;
    if (grossSalary <= threshold) return 0;

    const rate = (config.tdsDefaultRate || 5) / 100;
    return grossSalary * rate;
  }

  /**
   * Rule STAT-AGE-58: EPS (Employees Pension Scheme) Senior Exemption
   * Employees aged 58 years or above are exempt from EPS contribution per statutory EPF guidelines.
   */
  static checkEpsSeniorExemption(dateOfBirth?: string, asOfDate: Date = new Date()): { isExempt: boolean; age: number; note?: string } {
    if (!dateOfBirth) return { isExempt: false, age: 0 };
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return { isExempt: false, age: 0 };

    let age = asOfDate.getFullYear() - dob.getFullYear();
    const m = asOfDate.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && asOfDate.getDate() < dob.getDate())) {
      age--;
    }

    if (age >= 58) {
      return {
        isExempt: true,
        age,
        note: `STAT-AGE-58: EPS Exemption Applied (Employee Age: ${age} yrs >= 58)`
      };
    }

    return { isExempt: false, age };
  }

  /**
   * Normalize state names to standard enum key
   */
  static normalizeStateKey(stateStr?: string): string {
    if (!stateStr) return 'DEFAULT';
    const clean = stateStr.trim().toUpperCase().replace(/[^A-Z]/g, '_');
    
    if (clean.includes('MAHA') || clean === 'MH') return 'MAHARASHTRA';
    if (clean.includes('KARNAT') || clean === 'KA') return 'KARNATAKA';
    if (clean.includes('GUJ') || clean === 'GJ') return 'GUJARAT';
    if (clean.includes('TELANG') || clean === 'TS' || clean === 'TG') return 'TELANGANA';
    if (clean.includes('BENGAL') || clean === 'WB') return 'WEST_BENGAL';
    if (clean.includes('DELHI') || clean === 'DL') return 'DELHI';
    
    return clean || 'DEFAULT';
  }
}
