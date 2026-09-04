import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { SubscriptionService } from './subscriptionService';
import { FirestoreService } from './firestoreService';
import { PlatformAuditLog } from '../types';

export interface SaaSBiMetrics {
  platformRevenue: number;
  tenantGrowth: { label: string; count: number }[];
  musterVolumeByPlan: { plan: string; volume: number }[];
  totalMusterVolume: number;
}

export class SaaSBiAnalyticsService {
  /**
   * Retrieves real aggregated BI metrics by querying the live Firestore data.
   */
  static async getExecutiveAnalytics(): Promise<SaaSBiMetrics> {
    // 1. Fetch all companies and plans
    const [allCompanies, allPlans] = await Promise.all([
      FirestoreService.getAllCompanies(),
      SubscriptionService.getAllPlans()
    ]);
    
    // 2. Fetch all subscriptions to calculate real revenue
    const subsData = await SubscriptionService.getAllCompanySubscriptions(allCompanies);
    
    let platformRevenue = 0;
    const planMap = new Map<string, any>();
    allPlans.forEach(p => planMap.set(p.planId, p));

    subsData.forEach(subItem => {
      const sub = subItem.subscription;
      if (sub && sub.status === 'ACTIVE') {
        const plan = planMap.get(sub.planId);
        if (plan) {
          // Add to monthly recurring revenue (MRR)
          platformRevenue += sub.billingCycle === 'YEARLY' ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
        }
      }
    });

    // 3. Tenant Growth (Trend over last 6 months)
    const tenantGrowthMap = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      tenantGrowthMap.set(label, 0);
    }

    allCompanies.forEach(company => {
      if (company.createdAt) {
        const d = new Date(company.createdAt);
        const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (tenantGrowthMap.has(label)) {
          tenantGrowthMap.set(label, tenantGrowthMap.get(label)! + 1);
        }
      }
    });

    const tenantGrowth = Array.from(tenantGrowthMap.entries()).map(([label, count]) => ({ label, count }));

    // 4. Muster Volume (Daily attendance logs) by Plan
    // We use getCountFromServer for today's date for highly efficient real aggregation.
    const todayStr = new Date().toISOString().split('T')[0];
    const musterPromises: Promise<{ planCode: string; count: number }>[] = [];

    for (const subItem of subsData) {
      if (!subItem.company.id) continue;
      const planCode = subItem.subscription?.planId?.replace('PLAN_', '') || 'NO_PLAN';
      
      const attQuery = query(
        collection(db, 'companies', subItem.company.id, 'attendance'),
        where('date', '==', todayStr)
      );

      const p = getCountFromServer(attQuery).then(snapshot => ({
        planCode,
        count: snapshot.data().count
      })).catch((err) => {
        console.warn('Failed to get attendance count for company', subItem.company.id, err);
        return { planCode, count: 0 };
      });
      
      musterPromises.push(p);
    }

    const musterResults = await Promise.all(musterPromises);
    
    // Group volume by plan. Mapping standard plans to T-Series for BI report per executive requirement.
    const volumeMap = new Map<string, number>();
    volumeMap.set('T-APEX', 0);
    volumeMap.set('T-SHIELD', 0);
    volumeMap.set('T-GARUDA', 0);

    let totalMusterVolume = 0;
    musterResults.forEach(res => {
      let displayPlan = res.planCode;
      if (displayPlan === 'ENTERPRISE') displayPlan = 'T-APEX';
      else if (displayPlan === 'PRO') displayPlan = 'T-SHIELD';
      else if (displayPlan === 'STARTER') displayPlan = 'T-GARUDA';
      else if (displayPlan === 'NO_PLAN') displayPlan = 'UNASSIGNED';
      
      const current = volumeMap.get(displayPlan) || 0;
      volumeMap.set(displayPlan, current + res.count);
      totalMusterVolume += res.count;
    });

    // Remove any 0s for non-T-series to keep it clean, but keep T-series.
    const musterVolumeByPlan = Array.from(volumeMap.entries()).map(([plan, volume]) => ({ plan, volume }));

    return {
      platformRevenue,
      tenantGrowth,
      musterVolumeByPlan,
      totalMusterVolume
    };
  }
}
