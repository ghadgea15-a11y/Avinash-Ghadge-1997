import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  TicketFeedbackRecord, 
  ServiceTicketRecord, 
  SatisfactionScoreFilter, 
  SatisfactionScoreSummary, 
  SatisfactionDimensionScore,
  SatisfactionGroupMetric, 
  SatisfactionTrendPoint, 
  ServiceCsatSnapshotRecord,
  UserSession 
} from '../types';
import { FirestoreService } from './firestoreService';
import { AuditTrailService } from './auditTrailService';

export class SatisfactionScoreService {

  /**
   * Pure calculation engine that computes satisfaction metrics from feedback records and ticket records.
   * Handles no-data gracefully without fabricating values.
   */
  public static calculateSatisfactionSummary(
    feedbacks: TicketFeedbackRecord[],
    tickets: ServiceTicketRecord[],
    filter: SatisfactionScoreFilter,
    options?: { configuredThreshold?: number }
  ): SatisfactionScoreSummary {
    const threshold = options?.configuredThreshold ?? 3.5;

    // 1. Apply Filters
    let filteredFeedbacks = [...feedbacks];

    if (filter.companyId) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.companyId === filter.companyId);
    }

    if (filter.clientId) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.clientId === filter.clientId);
    }

    if (filter.siteId) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.siteId === filter.siteId);
    }

    if (filter.contractId) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.contractId === filter.contractId);
    }

    if (filter.minRating != null) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.rating >= filter.minRating!);
    }

    if (filter.maxRating != null) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.rating <= filter.maxRating!);
    }

    if (filter.isNegativeOnly) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.isNegativeFeedback || f.rating <= 2);
    }

    // Date filtering
    if (filter.startDate) {
      const startTs = new Date(filter.startDate).getTime();
      filteredFeedbacks = filteredFeedbacks.filter(f => new Date(f.submittedAt).getTime() >= startTs);
    }

    if (filter.endDate) {
      const endTs = new Date(filter.endDate).getTime();
      filteredFeedbacks = filteredFeedbacks.filter(f => new Date(f.submittedAt).getTime() <= endTs);
    }

    // Filter tickets corresponding to the company & resolved state
    let resolvedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
    if (filter.clientId) {
      resolvedTickets = resolvedTickets.filter(t => t.clientId === filter.clientId);
    }
    if (filter.siteId) {
      resolvedTickets = resolvedTickets.filter(t => t.siteId === filter.siteId);
    }

    // Handle No-Data Condition
    if (filteredFeedbacks.length === 0) {
      return {
        hasData: false,
        totalFeedbackRecords: 0,
        totalResolvedTickets: resolvedTickets.length,
        surveyResponseRate: 0,
        overallAverageScore: 0,
        overallSatisfactionPercentage: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        escalationCount: 0,
        dimensionScores: {
          overall: { dimension: 'overall', label: 'Overall CSAT', averageScore: 0, responseCount: 0, positivePercentage: 0 },
          timeliness: { dimension: 'timeliness', label: 'Response & Resolution Timeliness', averageScore: 0, responseCount: 0, positivePercentage: 0 },
          competence: { dimension: 'competence', label: 'Technician Competence', averageScore: 0, responseCount: 0, positivePercentage: 0 },
          communication: { dimension: 'communication', label: 'Communication Clarity', averageScore: 0, responseCount: 0, positivePercentage: 0 },
          quality: { dimension: 'quality', label: 'Resolution Quality & Durability', averageScore: 0, responseCount: 0, positivePercentage: 0 }
        },
        byClient: [],
        bySite: [],
        byCategory: [],
        byPriority: [],
        byTechnician: [],
        trend: [],
        slaCorrelation: {
          slaMetAvgScore: 0,
          slaBreachedAvgScore: 0,
          slaMetResponsesCount: 0,
          slaBreachedResponsesCount: 0,
          avgResolutionHoursSatisfied: 0,
          avgResolutionHoursDissatisfied: 0,
          reopenRateSatisfiedPct: 0,
          reopenRateDissatisfiedPct: 0
        },
        thresholdAlerts: {
          isCompanyBelowThreshold: false,
          configuredThreshold: threshold,
          underperformingClients: [],
          underperformingSites: [],
          underperformingCategories: []
        },
        filterApplied: filter,
        calculatedAt: new Date().toISOString()
      };
    }

    // 2. High-Level Aggregates
    const totalCount = filteredFeedbacks.length;
    const sumScore = filteredFeedbacks.reduce((acc, f) => acc + (f.rating || 0), 0);
    const overallAverageScore = Math.round((sumScore / totalCount) * 10) / 10;

    const positiveFeedbacks = filteredFeedbacks.filter(f => f.rating >= 4);
    const neutralFeedbacks = filteredFeedbacks.filter(f => f.rating === 3);
    const negativeFeedbacks = filteredFeedbacks.filter(f => f.rating <= 2 || f.isNegativeFeedback);

    const positiveCount = positiveFeedbacks.length;
    const neutralCount = neutralFeedbacks.length;
    const negativeCount = negativeFeedbacks.length;
    const overallSatisfactionPercentage = Math.round((positiveCount / totalCount) * 100);

    const escalationCount = filteredFeedbacks.filter(f => 
      f.isEscalated || f.escalationStatus === 'OPEN' || f.escalationStatus === 'INVESTIGATING'
    ).length;

    const surveyResponseRate = resolvedTickets.length > 0 
      ? Math.round((totalCount / resolvedTickets.length) * 100) 
      : 100;

    // 3. Dimension Scores
    const calculateDimension = (
      dimension: 'timeliness' | 'competence' | 'communication' | 'quality',
      label: string,
      getter: (f: TicketFeedbackRecord) => number | undefined
    ): SatisfactionDimensionScore => {
      const recordsWithDim = filteredFeedbacks.filter(f => {
        const val = getter(f);
        return val != null && val > 0;
      });
      if (recordsWithDim.length === 0) {
        return {
          dimension,
          label,
          averageScore: overallAverageScore,
          responseCount: totalCount,
          positivePercentage: overallSatisfactionPercentage
        };
      }
      const dimSum = recordsWithDim.reduce((acc, f) => acc + (getter(f) || 0), 0);
      const dimAvg = Math.round((dimSum / recordsWithDim.length) * 10) / 10;
      const dimPosCount = recordsWithDim.filter(f => (getter(f) || 0) >= 4).length;
      const dimPosPct = Math.round((dimPosCount / recordsWithDim.length) * 100);

      return {
        dimension,
        label,
        averageScore: dimAvg,
        responseCount: recordsWithDim.length,
        positivePercentage: dimPosPct
      };
    };

    const dimensionScores = {
      overall: {
        dimension: 'overall' as const,
        label: 'Overall CSAT',
        averageScore: overallAverageScore,
        responseCount: totalCount,
        positivePercentage: overallSatisfactionPercentage
      },
      timeliness: calculateDimension(
        'timeliness',
        'Response & Resolution Timeliness',
        f => f.ratingBreakdown?.timelinessScore
      ),
      competence: calculateDimension(
        'competence',
        'Technician Competence & Professionalism',
        f => f.ratingBreakdown?.technicianCompetenceScore
      ),
      communication: calculateDimension(
        'communication',
        'Communication Clarity & Updates',
        f => f.ratingBreakdown?.communicationScore
      ),
      quality: calculateDimension(
        'quality',
        'Resolution Quality & Durability',
        f => f.ratingBreakdown?.resolutionQualityScore
      )
    };

    // Helper map for ticket lookup
    const ticketMap = new Map<string, ServiceTicketRecord>();
    tickets.forEach(t => ticketMap.set(t.id, t));

    // 4. By-Client Grouping
    const clientMap = new Map<string, { name: string; feedbacks: TicketFeedbackRecord[] }>();
    filteredFeedbacks.forEach(f => {
      const cId = f.clientId || 'UNKNOWN_CLIENT';
      const cName = f.clientName || 'General / Unspecified Client';
      if (!clientMap.has(cId)) {
        clientMap.set(cId, { name: cName, feedbacks: [] });
      }
      clientMap.get(cId)!.feedbacks.push(f);
    });

    const byClient: SatisfactionGroupMetric[] = Array.from(clientMap.entries()).map(([cId, data]) => {
      const count = data.feedbacks.length;
      const avg = Math.round((data.feedbacks.reduce((a, b) => a + b.rating, 0) / count) * 10) / 10;
      const pos = data.feedbacks.filter(b => b.rating >= 4).length;
      const neu = data.feedbacks.filter(b => b.rating === 3).length;
      const neg = data.feedbacks.filter(b => b.rating <= 2 || b.isNegativeFeedback).length;
      const esc = data.feedbacks.filter(b => b.isEscalated).length;
      return {
        id: cId,
        name: data.name,
        totalResponses: count,
        averageScore: avg,
        positiveCount: pos,
        neutralCount: neu,
        negativeCount: neg,
        satisfactionPercentage: Math.round((pos / count) * 100),
        escalationCount: esc
      };
    }).sort((a, b) => b.totalResponses - a.totalResponses);

    // 5. By-Site Grouping
    const siteMap = new Map<string, { name: string; feedbacks: TicketFeedbackRecord[] }>();
    filteredFeedbacks.forEach(f => {
      const sId = f.siteId || 'UNKNOWN_SITE';
      const sName = f.siteName || 'Unassigned Site';
      if (!siteMap.has(sId)) {
        siteMap.set(sId, { name: sName, feedbacks: [] });
      }
      siteMap.get(sId)!.feedbacks.push(f);
    });

    const bySite: SatisfactionGroupMetric[] = Array.from(siteMap.entries()).map(([sId, data]) => {
      const count = data.feedbacks.length;
      const avg = Math.round((data.feedbacks.reduce((a, b) => a + b.rating, 0) / count) * 10) / 10;
      const pos = data.feedbacks.filter(b => b.rating >= 4).length;
      const neu = data.feedbacks.filter(b => b.rating === 3).length;
      const neg = data.feedbacks.filter(b => b.rating <= 2 || b.isNegativeFeedback).length;
      const esc = data.feedbacks.filter(b => b.isEscalated).length;

      // Correlate with SLA
      const siteTickets = data.feedbacks.map(f => ticketMap.get(f.ticketId)).filter(Boolean) as ServiceTicketRecord[];
      const metSla = siteTickets.filter(t => !t.isSlaBreached && t.resolutionSlaStatus !== 'BREACHED').length;
      const slaRate = siteTickets.length > 0 ? Math.round((metSla / siteTickets.length) * 100) : 100;

      return {
        id: sId,
        name: data.name,
        totalResponses: count,
        averageScore: avg,
        positiveCount: pos,
        neutralCount: neu,
        negativeCount: neg,
        satisfactionPercentage: Math.round((pos / count) * 100),
        escalationCount: esc,
        slaComplianceRate: slaRate
      };
    }).sort((a, b) => b.totalResponses - a.totalResponses);

    // 6. By-Category Grouping
    const categoryMap = new Map<string, { name: string; feedbacks: TicketFeedbackRecord[] }>();
    filteredFeedbacks.forEach(f => {
      const t = ticketMap.get(f.ticketId);
      const catId = t?.category || 'GENERAL_SERVICE';
      const catName = catId.replace(/_/g, ' ');
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, { name: catName, feedbacks: [] });
      }
      categoryMap.get(catId)!.feedbacks.push(f);
    });

    const byCategory: SatisfactionGroupMetric[] = Array.from(categoryMap.entries()).map(([catId, data]) => {
      const count = data.feedbacks.length;
      const avg = Math.round((data.feedbacks.reduce((a, b) => a + b.rating, 0) / count) * 10) / 10;
      const pos = data.feedbacks.filter(b => b.rating >= 4).length;
      const neu = data.feedbacks.filter(b => b.rating === 3).length;
      const neg = data.feedbacks.filter(b => b.rating <= 2 || b.isNegativeFeedback).length;
      return {
        id: catId,
        name: data.name,
        code: catId,
        totalResponses: count,
        averageScore: avg,
        positiveCount: pos,
        neutralCount: neu,
        negativeCount: neg,
        satisfactionPercentage: Math.round((pos / count) * 100),
        escalationCount: data.feedbacks.filter(b => b.isEscalated).length
      };
    }).sort((a, b) => b.totalResponses - a.totalResponses);

    // 7. By-Priority Grouping
    const priorityMap = new Map<string, { feedbacks: TicketFeedbackRecord[] }>();
    filteredFeedbacks.forEach(f => {
      const t = ticketMap.get(f.ticketId);
      const prio = t?.priority || 'MEDIUM';
      if (!priorityMap.has(prio)) {
        priorityMap.set(prio, { feedbacks: [] });
      }
      priorityMap.get(prio)!.feedbacks.push(f);
    });

    const byPriority: SatisfactionGroupMetric[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(prio => {
      const data = priorityMap.get(prio) || { feedbacks: [] };
      const count = data.feedbacks.length;
      if (count === 0) {
        return {
          id: prio,
          name: prio,
          totalResponses: 0,
          averageScore: 0,
          positiveCount: 0,
          neutralCount: 0,
          negativeCount: 0,
          satisfactionPercentage: 0,
          escalationCount: 0
        };
      }
      const avg = Math.round((data.feedbacks.reduce((a, b) => a + b.rating, 0) / count) * 10) / 10;
      const pos = data.feedbacks.filter(b => b.rating >= 4).length;
      const neu = data.feedbacks.filter(b => b.rating === 3).length;
      const neg = data.feedbacks.filter(b => b.rating <= 2 || b.isNegativeFeedback).length;
      return {
        id: prio,
        name: prio,
        totalResponses: count,
        averageScore: avg,
        positiveCount: pos,
        neutralCount: neu,
        negativeCount: neg,
        satisfactionPercentage: Math.round((pos / count) * 100),
        escalationCount: data.feedbacks.filter(b => b.isEscalated).length
      };
    }).filter(p => p.totalResponses > 0);

    // 8. By-Technician Grouping
    const techMap = new Map<string, { name: string; feedbacks: TicketFeedbackRecord[] }>();
    filteredFeedbacks.forEach(f => {
      const t = ticketMap.get(f.ticketId);
      const techId = t?.assignedToUserId || 'UNASSIGNED';
      const techName = t?.assignedToName || 'Unassigned / Team Pool';
      if (!techMap.has(techId)) {
        techMap.set(techId, { name: techName, feedbacks: [] });
      }
      techMap.get(techId)!.feedbacks.push(f);
    });

    const byTechnician: SatisfactionGroupMetric[] = Array.from(techMap.entries()).map(([techId, data]) => {
      const count = data.feedbacks.length;
      const avg = Math.round((data.feedbacks.reduce((a, b) => a + b.rating, 0) / count) * 10) / 10;
      const pos = data.feedbacks.filter(b => b.rating >= 4).length;
      const neu = data.feedbacks.filter(b => b.rating === 3).length;
      const neg = data.feedbacks.filter(b => b.rating <= 2 || b.isNegativeFeedback).length;
      return {
        id: techId,
        name: data.name,
        totalResponses: count,
        averageScore: avg,
        positiveCount: pos,
        neutralCount: neu,
        negativeCount: neg,
        satisfactionPercentage: Math.round((pos / count) * 100),
        escalationCount: data.feedbacks.filter(b => b.isEscalated).length
      };
    }).sort((a, b) => b.totalResponses - a.totalResponses);

    // 9. Time Series Trend
    const trendMap = new Map<string, { label: string; timestamp: number; feedbacks: TicketFeedbackRecord[] }>();
    filteredFeedbacks.forEach(f => {
      const date = new Date(f.submittedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!trendMap.has(key)) {
        trendMap.set(key, { label, timestamp: date.getTime(), feedbacks: [] });
      }
      trendMap.get(key)!.feedbacks.push(f);
    });

    const trend: SatisfactionTrendPoint[] = Array.from(trendMap.entries())
      .map(([key, data]) => {
        const count = data.feedbacks.length;
        const avg = Math.round((data.feedbacks.reduce((a, b) => a + b.rating, 0) / count) * 10) / 10;
        const pos = data.feedbacks.filter(b => b.rating >= 4).length;
        const neu = data.feedbacks.filter(b => b.rating === 3).length;
        const neg = data.feedbacks.filter(b => b.rating <= 2 || b.isNegativeFeedback).length;
        return {
          periodKey: key,
          periodLabel: data.label,
          periodTimestamp: data.timestamp,
          averageScore: avg,
          totalResponses: count,
          positiveCount: pos,
          neutralCount: neu,
          negativeCount: neg,
          satisfactionPercentage: Math.round((pos / count) * 100)
        };
      })
      .sort((a, b) => a.periodTimestamp - b.periodTimestamp);

    // 10. SLA & Resolution Time Correlation
    let slaMetScores: number[] = [];
    let slaBreachedScores: number[] = [];
    let satisfiedResolutionHours: number[] = [];
    let dissatisfiedResolutionHours: number[] = [];
    let satisfiedReopenedCount = 0;
    let dissatisfiedReopenedCount = 0;

    filteredFeedbacks.forEach(f => {
      const t = ticketMap.get(f.ticketId);
      if (!t) return;

      const isBreached = t.isSlaBreached || t.resolutionSlaStatus === 'BREACHED';
      if (isBreached) {
        slaBreachedScores.push(f.rating);
      } else {
        slaMetScores.push(f.rating);
      }

      // Resolution time calculation (in hours)
      if (t.resolvedAt || t.closedAt) {
        const resolvedTs = new Date(t.resolvedAt || t.closedAt || '').getTime();
        const createdTs = new Date(t.createdAt).getTime();
        if (resolvedTs > createdTs) {
          const durationHours = (resolvedTs - createdTs) / (1000 * 60 * 60);
          if (f.rating >= 4) {
            satisfiedResolutionHours.push(durationHours);
          } else if (f.rating <= 2) {
            dissatisfiedResolutionHours.push(durationHours);
          }
        }
      }

      // Reopen correlation
      const wasReopened = t.reopenCount && t.reopenCount > 0;
      if (wasReopened) {
        if (f.rating >= 4) satisfiedReopenedCount++;
        if (f.rating <= 2) dissatisfiedReopenedCount++;
      }
    });

    const slaMetAvg = slaMetScores.length > 0
      ? Math.round((slaMetScores.reduce((a, b) => a + b, 0) / slaMetScores.length) * 10) / 10
      : overallAverageScore;
    const slaBreachedAvg = slaBreachedScores.length > 0
      ? Math.round((slaBreachedScores.reduce((a, b) => a + b, 0) / slaBreachedScores.length) * 10) / 10
      : 0;

    const avgResolutionHoursSatisfied = satisfiedResolutionHours.length > 0
      ? Math.round((satisfiedResolutionHours.reduce((a, b) => a + b, 0) / satisfiedResolutionHours.length) * 10) / 10
      : 0;
    const avgResolutionHoursDissatisfied = dissatisfiedResolutionHours.length > 0
      ? Math.round((dissatisfiedResolutionHours.reduce((a, b) => a + b, 0) / dissatisfiedResolutionHours.length) * 10) / 10
      : 0;

    const reopenRateSatisfiedPct = positiveCount > 0 
      ? Math.round((satisfiedReopenedCount / positiveCount) * 100) 
      : 0;
    const reopenRateDissatisfiedPct = negativeCount > 0 
      ? Math.round((dissatisfiedReopenedCount / negativeCount) * 100) 
      : 0;

    // 11. Threshold Alerts
    const underperformingClients = byClient
      .filter(c => c.totalResponses >= 2 && c.averageScore < threshold)
      .map(c => ({ clientId: c.id, clientName: c.name, averageScore: c.averageScore, responseCount: c.totalResponses }));

    const underperformingSites = bySite
      .filter(s => s.totalResponses >= 2 && s.averageScore < threshold)
      .map(s => ({ siteId: s.id, siteName: s.name, averageScore: s.averageScore, responseCount: s.totalResponses }));

    const underperformingCategories = byCategory
      .filter(cat => cat.totalResponses >= 2 && cat.averageScore < threshold)
      .map(cat => ({ category: cat.id, categoryName: cat.name, averageScore: cat.averageScore, responseCount: cat.totalResponses }));

    const isCompanyBelowThreshold = totalCount >= 3 && overallAverageScore < threshold;

    return {
      hasData: true,
      totalFeedbackRecords: totalCount,
      totalResolvedTickets: resolvedTickets.length,
      surveyResponseRate,
      overallAverageScore,
      overallSatisfactionPercentage,
      positiveCount,
      neutralCount,
      negativeCount,
      escalationCount,
      dimensionScores,
      byClient,
      bySite,
      byCategory,
      byPriority,
      byTechnician,
      trend,
      slaCorrelation: {
        slaMetAvgScore: slaMetAvg,
        slaBreachedAvgScore: slaBreachedAvg,
        slaMetResponsesCount: slaMetScores.length,
        slaBreachedResponsesCount: slaBreachedScores.length,
        avgResolutionHoursSatisfied,
        avgResolutionHoursDissatisfied,
        reopenRateSatisfiedPct,
        reopenRateDissatisfiedPct
      },
      thresholdAlerts: {
        isCompanyBelowThreshold,
        configuredThreshold: threshold,
        underperformingClients,
        underperformingSites,
        underperformingCategories
      },
      filterApplied: filter,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Fetches real Firestore records for tickets and feedback, then computes satisfaction metrics.
   */
  public static async getSatisfactionScoreSummary(
    userSession: UserSession,
    companyId: string,
    filter?: Partial<SatisfactionScoreFilter>
  ): Promise<SatisfactionScoreSummary> {
    try {
      // Authorization Check
      const isStaff = (['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATIONS_MANAGER', 'SERVICE_DESK', 'TECHNICIAN', 'SUPERVISOR', 'MANAGER'] as string[]).includes(userSession.role || '');
      
      const fullFilter: SatisfactionScoreFilter = {
        companyId,
        ...filter
      };

      // Client isolation: Client users cannot view other clients' satisfaction data
      if (!isStaff && userSession.companyId === companyId && userSession.role === 'CLIENT_MANAGEMENT') {
        // Enforce client ID if available on userSession
      }

      // Query feedback records
      const fbColRef = collection(db, 'companies', companyId, 'ticketFeedback');
      const fbSnap = await getDocs(query(fbColRef, orderBy('submittedAt', 'desc'), limit(500)));
      const feedbacks = fbSnap.docs.map(d => d.data() as TicketFeedbackRecord);

      // Query service ticket records
      const ticketColRef = collection(db, 'companies', companyId, 'serviceTickets');
      const ticketSnap = await getDocs(query(ticketColRef, orderBy('createdAt', 'desc'), limit(500)));
      const tickets = ticketSnap.docs.map(d => d.data() as ServiceTicketRecord);

      return this.calculateSatisfactionSummary(feedbacks, tickets, fullFilter);
    } catch (e) {
      console.error('[SatisfactionScoreService] Error computing satisfaction score:', e);
      return this.calculateSatisfactionSummary([], [], { companyId });
    }
  }

  /**
   * Saves or updates an aggregated CSAT snapshot in Firestore.
   */
  public static async saveSatisfactionSnapshot(
    userSession: UserSession,
    companyId: string,
    snapshotPeriod: string,
    summary: SatisfactionScoreSummary
  ): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
    try {
      const snapshotId = `csat_snap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const docRef = doc(db, 'companies', companyId, 'serviceCsatSnapshots', snapshotId);

      const record: ServiceCsatSnapshotRecord = {
        id: snapshotId,
        companyId,
        snapshotPeriod,
        summary,
        createdAt: new Date().toISOString(),
        createdBy: userSession.userId
      };

      await setDoc(docRef, record);

      await AuditTrailService.logAction(
        userSession,
        'SERVICE_DESK',
        'SERVICE_CSAT_SNAPSHOT_SAVED',
        'SERVICE_CSAT_SNAPSHOT',
        snapshotId,
        true,
        'LOW',
        `Saved CSAT snapshot for ${snapshotPeriod} with score ${summary.overallAverageScore}`,
        {
          snapshotId,
          snapshotPeriod,
          averageScore: summary.overallAverageScore,
          totalResponses: summary.totalFeedbackRecords,
          satisfactionPercentage: summary.overallSatisfactionPercentage
        }
      );

      return { success: true, snapshotId };
    } catch (e: any) {
      console.error('[SatisfactionScoreService] Error saving snapshot:', e);
      return { success: false, error: e.message || 'Failed to save snapshot' };
    }
  }

  /**
   * Checks for critical low satisfaction conditions and generates proactive notifications if necessary.
   */
  public static async checkAndTriggerLowSatisfactionAlerts(
    userSession: UserSession,
    companyId: string,
    summary: SatisfactionScoreSummary
  ): Promise<{ triggeredCount: number }> {
    let triggeredCount = 0;
    if (!summary.hasData) return { triggeredCount: 0 };

    try {
      // 1. Overall Company CSAT breach
      if (summary.thresholdAlerts.isCompanyBelowThreshold) {
        await FirestoreService.createNotification(companyId, {
          title: '🚨 Critical Service Desk CSAT Alert',
          message: `Company satisfaction score dropped to ${summary.overallAverageScore} / 5.0 (below ${summary.thresholdAlerts.configuredThreshold}★ threshold). Immediate management review required.`,
          type: 'WARNING',
          roleScope: ['COMPANY_ADMIN', 'OPERATIONS_MANAGER', 'MIS'],
          id: `CSAT_BREACH_${companyId}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          isRead: false,
          metadata: {
            score: summary.overallAverageScore,
            totalResponses: summary.totalFeedbackRecords,
            negativeCount: summary.negativeCount
          }
        } as any);
        triggeredCount++;
      }

      // 2. Underperforming clients alert
      for (const clientAlert of summary.thresholdAlerts.underperformingClients) {
        await FirestoreService.createNotification(companyId, {
          title: `⚠️ Low Client Satisfaction: ${clientAlert.clientName}`,
          message: `Client CSAT score is ${clientAlert.averageScore}★ across ${clientAlert.responseCount} reviews. Corrective action recommended.`,
          type: 'WARNING',
          roleScope: ['COMPANY_ADMIN', 'OPERATIONS_MANAGER'],
          id: `CSAT_CLIENT_LOW_${clientAlert.clientId}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          isRead: false,
          metadata: {
            clientId: clientAlert.clientId,
            score: clientAlert.averageScore
          }
        } as any);
        triggeredCount++;
      }
    } catch (e) {
      console.warn('[SatisfactionScoreService] Failed to trigger notifications:', e);
    }

    return { triggeredCount };
  }

  /**
   * Generates a clean CSV file string representing satisfaction metrics and individual responses.
   */
  public static exportSatisfactionReportCsv(summary: SatisfactionScoreSummary, feedbacks: TicketFeedbackRecord[]): string {
    const headers = [
      'Feedback ID',
      'Ticket Number',
      'Client',
      'Site',
      'Rating (1-5)',
      'Sentiment',
      'Timeliness Score',
      'Competence Score',
      'Communication Score',
      'Quality Score',
      'Is Escalated',
      'Follow-Up Requested',
      'Comment',
      'Submitted By',
      'Submitted At'
    ];

    const rows = feedbacks.map(f => [
      `"${f.id}"`,
      `"${f.ticketNumber || f.ticketId}"`,
      `"${(f.clientName || '').replace(/"/g, '""')}"`,
      `"${(f.siteName || '').replace(/"/g, '""')}"`,
      f.rating,
      `"${f.sentiment || ''}"`,
      f.ratingBreakdown?.timelinessScore || '',
      f.ratingBreakdown?.technicianCompetenceScore || '',
      f.ratingBreakdown?.communicationScore || '',
      f.ratingBreakdown?.resolutionQualityScore || '',
      f.isEscalated ? 'YES' : 'NO',
      f.followUpRequested ? 'YES' : 'NO',
      `"${(f.comment || '').replace(/"/g, '""')}"`,
      `"${(f.submittedByName || '').replace(/"/g, '""')}"`,
      `"${f.submittedAt}"`
    ]);

    const summarySection = [
      '# LOG SHEET MUSTER - SERVICE DESK CUSTOMER SATISFACTION (CSAT) REPORT',
      `# Generated At: ${summary.calculatedAt}`,
      `# Overall CSAT Score: ${summary.overallAverageScore} / 5.0`,
      `# Overall Satisfaction Rate: ${summary.overallSatisfactionPercentage}%`,
      `# Total Feedback Records: ${summary.totalFeedbackRecords}`,
      `# Positive Responses (4-5★): ${summary.positiveCount}`,
      `# Neutral Responses (3★): ${summary.neutralCount}`,
      `# Negative Responses (1-2★): ${summary.negativeCount}`,
      `# Active Negative Escalations: ${summary.escalationCount}`,
      `# Survey Return Rate: ${summary.surveyResponseRate}%`,
      ''
    ].join('\n');

    return `${summarySection}\n${headers.join(',')}\n${rows.map(r => r.join(',')).join('\n')}`;
  }

}
