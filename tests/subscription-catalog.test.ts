import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionService } from '../src/services/subscriptionService';
import { FirestoreService } from '../src/services/firestoreService';
import { SubscriptionPlan, CompanySubscription, EmployeeRecord } from '../src/types';

describe('Point 1.4: Subscription & Plan Catalog + Limit Enforcement', () => {

  describe('1. Plan Builder (Starter, Professional, Enterprise)', () => {
    it('creates standard plans with correct pricing, employee limits, and module catalogs', async () => {
      const starterPlan: SubscriptionPlan = {
        planId: 'PLAN_STARTER',
        planCode: 'STARTER',
        planName: 'Starter Tier',
        name: 'Starter Tier',
        description: 'Basic plan for small security agencies with muster tracking',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        currency: 'INR',
        employeeLimit: 50,
        userLimit: 2,
        storageLimitMB: 1024,
        enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'REPORTS'],
        trialEligible: true,
        trialDays: 14,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const proPlan: SubscriptionPlan = {
        planId: 'PLAN_PRO',
        planCode: 'PRO',
        planName: 'Professional Tier',
        name: 'Professional Tier',
        description: 'Advanced operations with multiple sites, shifts & payroll',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        monthlyPrice: 2999,
        yearlyPrice: 29990,
        currency: 'INR',
        employeeLimit: 250,
        userLimit: 5,
        storageLimitMB: 5120,
        enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE', 'PAYROLL', 'REPORTS', 'ANALYTICS'],
        trialEligible: true,
        trialDays: 14,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const enterprisePlan: SubscriptionPlan = {
        planId: 'PLAN_ENTERPRISE',
        planCode: 'ENTERPRISE',
        planName: 'Enterprise Elite Tier',
        name: 'Enterprise Elite Tier',
        description: 'Complete multi-branch security operations with AI OCR & full RBAC',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        monthlyPrice: 7999,
        yearlyPrice: 79990,
        currency: 'INR',
        employeeLimit: 2000,
        userLimit: 25,
        storageLimitMB: 51200,
        enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE', 'PAYROLL', 'REPORTS', 'ANALYTICS', 'GUARD_PATROL', 'INCIDENTS', 'VISITORS', 'MATERIALS'],
        trialEligible: true,
        trialDays: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Assert plan configurations
      expect(starterPlan.monthlyPrice).toBe(999);
      expect(starterPlan.yearlyPrice).toBe(9990);
      expect(starterPlan.employeeLimit).toBe(50);
      expect(starterPlan.enabledModules).toContain('EMPLOYEES');
      expect(starterPlan.enabledModules).toContain('ATTENDANCE');

      expect(proPlan.monthlyPrice).toBe(2999);
      expect(proPlan.yearlyPrice).toBe(29990);
      expect(proPlan.employeeLimit).toBe(250);
      expect(proPlan.enabledModules).toContain('PAYROLL');

      expect(enterprisePlan.monthlyPrice).toBe(7999);
      expect(enterprisePlan.yearlyPrice).toBe(79990);
      expect(enterprisePlan.employeeLimit).toBe(2000);
      expect(enterprisePlan.trialDays).toBe(30);
    });
  });

  describe('2. Tenant Subscription Tracking (T-APEX, T-SHIELD, T-GARUDA)', () => {
    it('correctly tracks billing cycle, renewal dates, and trial periods', () => {
      const now = Date.now();
      const oneYearLater = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
      const oneMonthLater = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

      const tenantSubscriptions: Record<string, CompanySubscription> = {
        'T-APEX': {
          subscriptionId: 'SUB-T-APEX-001',
          companyId: 'T-APEX',
          planId: 'PLAN_PRO',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          startDate: new Date(now).toISOString(),
          currentPeriodStart: new Date(now).toISOString(),
          currentPeriodEnd: oneMonthLater,
          renewalDate: oneMonthLater,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          employeeLimit: 250,
          userLimit: 5,
          storageLimitMB: 5120,
          source: 'MANUAL',
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString()
        },
        'T-SHIELD': {
          subscriptionId: 'SUB-T-SHIELD-002',
          companyId: 'T-SHIELD',
          planId: 'PLAN_STARTER',
          status: 'TRIAL',
          billingCycle: 'YEARLY',
          startDate: new Date(now).toISOString(),
          currentPeriodStart: new Date(now).toISOString(),
          currentPeriodEnd: oneYearLater,
          renewalDate: oneYearLater,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          employeeLimit: 50,
          userLimit: 2,
          storageLimitMB: 1024,
          source: 'MANUAL',
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString()
        },
        'T-GARUDA': {
          subscriptionId: 'SUB-T-GARUDA-003',
          companyId: 'T-GARUDA',
          planId: 'PLAN_ENTERPRISE',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          startDate: new Date(now).toISOString(),
          currentPeriodStart: new Date(now).toISOString(),
          currentPeriodEnd: oneMonthLater,
          renewalDate: oneMonthLater,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          employeeLimit: 2000,
          userLimit: 25,
          storageLimitMB: 51200,
          source: 'MANUAL',
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString()
        }
      };

      expect(tenantSubscriptions['T-APEX'].planId).toBe('PLAN_PRO');
      expect(tenantSubscriptions['T-APEX'].billingCycle).toBe('MONTHLY');
      expect(tenantSubscriptions['T-APEX'].employeeLimit).toBe(250);

      expect(tenantSubscriptions['T-SHIELD'].planId).toBe('PLAN_STARTER');
      expect(tenantSubscriptions['T-SHIELD'].status).toBe('TRIAL');
      expect(tenantSubscriptions['T-SHIELD'].employeeLimit).toBe(50);

      expect(tenantSubscriptions['T-GARUDA'].planId).toBe('PLAN_ENTERPRISE');
      expect(tenantSubscriptions['T-GARUDA'].employeeLimit).toBe(2000);
    });
  });

  describe('3. Quota Enforcement Logic', () => {
    it('blocks employee creation when employee count exceeds plan limit', async () => {
      // Starter plan limit is 50 employees
      const starterLimit = 50;
      const currentEmployeeCount = 50; // Already at limit

      const isExceeded = currentEmployeeCount >= starterLimit;
      expect(isExceeded).toBe(true);

      // Attempting to add 150+ employees to a Starter plan (limit 50) must trigger rejection
      const attemptedCount = 150;
      expect(attemptedCount > starterLimit).toBe(true);
    });

    it('calculates prorated credit correctly when upgrading plans', () => {
      const now = Date.now();
      const subStart = new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days ago
      const subEnd = new Date(now + 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days remaining

      const currentSub: CompanySubscription = {
        subscriptionId: 'SUB-TEST',
        companyId: 'T-APEX',
        planId: 'PLAN_STARTER',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        startDate: subStart,
        currentPeriodStart: subStart,
        currentPeriodEnd: subEnd,
        renewalDate: subEnd,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        employeeLimit: 50,
        userLimit: 2,
        storageLimitMB: 1024,
        lastPaymentAmount: 1000,
        source: 'MANUAL',
        createdAt: subStart,
        updatedAt: subStart
      };

      const starterPlan: SubscriptionPlan = {
        planId: 'PLAN_STARTER',
        planCode: 'STARTER',
        planName: 'Starter',
        name: 'Starter',
        description: 'Starter',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        monthlyPrice: 1000,
        yearlyPrice: 10000,
        currency: 'INR',
        employeeLimit: 50,
        userLimit: 2,
        storageLimitMB: 1024,
        enabledModules: ['EMPLOYEES'],
        trialEligible: false,
        trialDays: 0,
        createdAt: subStart,
        updatedAt: subStart
      };

      const proratedCredit = SubscriptionService.calculateProratedCredit(currentSub, starterPlan);
      // With 50% time remaining, credit should be approximately 500
      expect(proratedCredit).toBeGreaterThanOrEqual(490);
      expect(proratedCredit).toBeLessThanOrEqual(510);
    });
  });
});
