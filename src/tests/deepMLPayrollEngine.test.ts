import { describe, it, expect } from 'vitest';
import { DeepMLPayrollAnomalyEngine, MLPayrollFeatureVector } from '../server/deepMLPayrollEngine';

describe('DeepMLPayrollAnomalyEngine Tests', () => {
  it('1. Normal employee payroll should produce LOW/NORMAL anomaly score', () => {
    const normalVector: MLPayrollFeatureVector = {
      employeeId: 'EMP_NORMAL',
      employeeName: 'Ramesh Sharma',
      normalizedGrossPay: 1.0,
      overtimeHoursRatio: 0.05,
      varianceToHistoricalAvg: 0.02,
      attendanceRatio: 0.95,
      lopRatio: 0.05,
      statutoryDeductionRatio: 0.14,
      isMultiSiteAssigned: 0,
      recentSalaryRevisionCount: 0
    };

    const result = DeepMLPayrollAnomalyEngine.evaluateVector(normalVector);
    expect(result.anomalyScore).toBeLessThan(35);
    expect(['NORMAL', 'LOW']).toContain(result.riskCategory);
    expect(result.detectedAnomalies.length).toBe(0);
    expect(result.neuralLayerActivations.inputDimension).toBe(8);
  });

  it('2. Ghost Worker / Excessive OT Spike should trigger CRITICAL/HIGH risk', () => {
    const fraudVector: MLPayrollFeatureVector = {
      employeeId: 'EMP_SUSPECT',
      employeeName: 'Fake Deploy Worker',
      normalizedGrossPay: 2.8,
      overtimeHoursRatio: 0.65,          // 65% of work is OT
      varianceToHistoricalAvg: 0.85,     // 85% spike
      attendanceRatio: 0.50,
      lopRatio: 0.50,
      statutoryDeductionRatio: 0.02,     // suspiciously low deduction
      isMultiSiteAssigned: 1,            // deployed at 2 sites simultaneously
      recentSalaryRevisionCount: 1
    };

    const result = DeepMLPayrollAnomalyEngine.evaluateVector(fraudVector);
    expect(result.anomalyScore).toBeGreaterThan(50);
    expect(['HIGH', 'CRITICAL']).toContain(result.riskCategory);
    expect(result.detectedAnomalies.some(a => a.includes('Excessive Overtime'))).toBe(true);
    expect(result.detectedAnomalies.some(a => a.includes('Dual Site'))).toBe(true);
    expect(result.recommendedMitigations.length).toBeGreaterThan(0);
  });
});
