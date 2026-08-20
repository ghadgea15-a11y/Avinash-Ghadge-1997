import { 
  ServiceTicketRecord, 
  ServiceSlaPolicyRecord, 
  TicketSlaStatus, 
  TicketSlaPauseReason, 
  TicketSlaPauseRecord,
  UserSession,
  SlaBreachRecord,
  ServiceTicketPriority
} from '../types';

export interface SlaEvaluationResult {
  policyMatched?: ServiceSlaPolicyRecord;
  precedenceScore: number;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  responseDueTime: string;
  resolutionDueTime: string;
  responseSlaStatus: 'PENDING' | 'MET' | 'BREACHED';
  resolutionSlaStatus: TicketSlaStatus;
  responseRemainingMinutes: number;
  resolutionRemainingMinutes: number;
  resolutionElapsedPercentage: number;
  isNearBreach: boolean;
  isBreached: boolean;
  overdueMinutes: number;
}

export class ServiceSlaEngine {
  /**
   * Deterministic precedence calculation for matching SLA policies.
   * Specificity weights:
   * Client match: +16
   * Contract match: +8
   * Site match: +4
   * Category match: +2
   * Priority match: +1
   */
  public static matchPolicy(
    ticket: Partial<ServiceTicketRecord>,
    policies: ServiceSlaPolicyRecord[]
  ): { policy: ServiceSlaPolicyRecord | null; score: number } {
    const activePolicies = policies.filter(p => p.status === 'ACTIVE');
    if (!activePolicies.length) return { policy: null, score: 0 };

    let bestPolicy: ServiceSlaPolicyRecord | null = null;
    let highestScore = -1;

    for (const p of activePolicies) {
      let score = 0;
      let matches = true;

      // 1. Client match
      if (p.clientId && p.clientId !== '*') {
        if (p.clientId === ticket.clientId) {
          score += 16;
        } else {
          matches = false;
        }
      }

      // 2. Contract match
      if (matches && p.contractId && p.contractId !== '*') {
        if (ticket.contractId && p.contractId === ticket.contractId) {
          score += 8;
        } else {
          matches = false;
        }
      }

      // 3. Site match
      if (matches && p.siteId && p.siteId !== '*') {
        if (p.siteId === ticket.siteId) {
          score += 4;
        } else {
          matches = false;
        }
      }

      // 4. Category match
      if (matches && p.category && p.category !== '*') {
        if (p.category === ticket.category) {
          score += 2;
        } else {
          matches = false;
        }
      }

      // 5. Priority match
      if (matches && p.priority && p.priority !== '*') {
        if (p.priority === ticket.priority) {
          score += 1;
        } else {
          matches = false;
        }
      }

      if (matches && score > highestScore) {
        highestScore = score;
        bestPolicy = p;
      }
    }

    return { policy: bestPolicy, score: Math.max(0, highestScore) };
  }

  /**
   * Fallback priority-based target durations if no custom SLA policy matches.
   */
  public static getDefaultTargetsByPriority(priority?: ServiceTicketPriority | string): { responseMinutes: number; resolutionMinutes: number } {
    switch (priority) {
      case 'CRITICAL':
        return { responseMinutes: 15, resolutionMinutes: 120 }; // 15m response, 2h resolution
      case 'HIGH':
        return { responseMinutes: 60, resolutionMinutes: 360 }; // 1h response, 6h resolution
      case 'MEDIUM':
        return { responseMinutes: 120, resolutionMinutes: 1440 }; // 2h response, 24h resolution
      case 'LOW':
      default:
        return { responseMinutes: 240, resolutionMinutes: 2880 }; // 4h response, 48h resolution
    }
  }

  /**
   * Calculate due time taking into account 24x7 vs Business Hours.
   */
  public static calculateTargetDueTime(
    startTime: Date,
    targetMinutes: number,
    policy?: ServiceSlaPolicyRecord | null
  ): Date {
    if (!policy || policy.coverageType === '24X7' || !policy.businessHoursStart || !policy.businessHoursEnd) {
      return new Date(startTime.getTime() + targetMinutes * 60 * 1000);
    }

    // Business hours calculation
    const [startH, startM] = policy.businessHoursStart.split(':').map(Number);
    const [endH, endM] = policy.businessHoursEnd.split(':').map(Number);
    const businessDays = policy.businessDays && policy.businessDays.length > 0 
      ? policy.businessDays 
      : [1, 2, 3, 4, 5]; // Mon to Fri

    let remainingMinutes = targetMinutes;
    const current = new Date(startTime.getTime());

    // Advance minute by minute through business hours
    let safetyCounter = 0;
    while (remainingMinutes > 0 && safetyCounter < 43200) { // Safety bound max 30 days
      safetyCounter++;
      const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
      const isBusinessDay = businessDays.includes(dayOfWeek);

      const currentH = current.getHours();
      const currentM = current.getMinutes();
      const currentMinutesOfDay = currentH * 60 + currentM;
      const startOfDayMinutes = startH * 60 + startM;
      const endOfDayMinutes = endH * 60 + endM;

      if (isBusinessDay && currentMinutesOfDay >= startOfDayMinutes && currentMinutesOfDay < endOfDayMinutes) {
        // We are currently in business hours!
        const availableTodayMinutes = endOfDayMinutes - currentMinutesOfDay;
        if (remainingMinutes <= availableTodayMinutes) {
          current.setMinutes(current.getMinutes() + remainingMinutes);
          remainingMinutes = 0;
          break;
        } else {
          current.setMinutes(current.getMinutes() + availableTodayMinutes);
          remainingMinutes -= availableTodayMinutes;
        }
      } else {
        // Outside business hours: advance to next start of business window
        if (!isBusinessDay || currentMinutesOfDay >= endOfDayMinutes) {
          // Advance to next day at startH:startM
          current.setDate(current.getDate() + 1);
          current.setHours(startH, startM, 0, 0);
        } else if (currentMinutesOfDay < startOfDayMinutes) {
          current.setHours(startH, startM, 0, 0);
        }
      }
    }

    return current;
  }

  /**
   * Evaluates the full SLA state for a ticket at a given point in time (defaults to now).
   */
  public static evaluateTicketSla(
    ticket: ServiceTicketRecord,
    policy?: ServiceSlaPolicyRecord | null,
    referenceDate: Date = new Date()
  ): SlaEvaluationResult {
    const createdAt = new Date(ticket.createdAt || Date.now());
    const targets = policy 
      ? { responseMinutes: policy.responseTargetMinutes, resolutionMinutes: policy.resolutionTargetMinutes }
      : this.getDefaultTargetsByPriority(ticket.priority);

    const responseTargetMinutes = ticket.responseTargetMinutes || targets.responseMinutes;
    const resolutionTargetMinutes = ticket.resolutionTargetMinutes || targets.resolutionMinutes;

    const responseDueTime = ticket.responseDueTime || this.calculateTargetDueTime(createdAt, responseTargetMinutes, policy).toISOString();
    const resolutionDueTime = ticket.resolutionDueTime || ticket.slaDueTime || this.calculateTargetDueTime(createdAt, resolutionTargetMinutes, policy).toISOString();

    const responseDueDate = new Date(responseDueTime);
    const resolutionDueDate = new Date(resolutionDueTime);

    // 1. Response SLA evaluation
    let responseSlaStatus: 'PENDING' | 'MET' | 'BREACHED' = 'PENDING';
    if (ticket.respondedAt) {
      const respondedDate = new Date(ticket.respondedAt);
      responseSlaStatus = respondedDate.getTime() <= responseDueDate.getTime() ? 'MET' : 'BREACHED';
    } else {
      responseSlaStatus = referenceDate.getTime() > responseDueDate.getTime() ? 'BREACHED' : 'PENDING';
    }

    const responseRemainingMinutes = Math.round((responseDueDate.getTime() - referenceDate.getTime()) / (60 * 1000));

    // 2. Resolution SLA evaluation
    const isPaused = ticket.resolutionSlaStatus === 'PAUSED' || (ticket.status === 'PENDING_CLIENT' && !!ticket.lastPausedAt);
    const isResolvedOrClosed = ['RESOLVED', 'CLOSED'].includes(ticket.status);
    const isCancelled = ticket.status === 'CANCELLED';

    let resolutionSlaStatus: TicketSlaStatus = 'ACTIVE';
    let resolutionRemainingMinutes = Math.round((resolutionDueDate.getTime() - referenceDate.getTime()) / (60 * 1000));
    let overdueMinutes = 0;

    const totalDurationMs = resolutionDueDate.getTime() - createdAt.getTime();
    const elapsedMs = Math.max(0, referenceDate.getTime() - createdAt.getTime());
    const warningThresholdPct = policy?.warningThresholdPercentage || 75;

    let resolutionElapsedPercentage = totalDurationMs > 0 ? Math.min(200, Math.round((elapsedMs / totalDurationMs) * 100)) : 0;

    if (isCancelled) {
      resolutionSlaStatus = 'CANCELLED';
    } else if (isResolvedOrClosed) {
      const resolvedDate = new Date(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt || Date.now());
      if (resolvedDate.getTime() <= resolutionDueDate.getTime() && !ticket.isSlaBreached) {
        resolutionSlaStatus = 'MET';
      } else {
        resolutionSlaStatus = 'FAILED';
      }
      resolutionElapsedPercentage = totalDurationMs > 0 ? Math.round(((resolvedDate.getTime() - createdAt.getTime()) / totalDurationMs) * 100) : 100;
    } else if (isPaused) {
      resolutionSlaStatus = 'PAUSED';
    } else {
      if (referenceDate.getTime() > resolutionDueDate.getTime()) {
        resolutionSlaStatus = 'BREACHED';
        overdueMinutes = Math.round((referenceDate.getTime() - resolutionDueDate.getTime()) / (60 * 1000));
      } else if (resolutionElapsedPercentage >= warningThresholdPct) {
        resolutionSlaStatus = 'WARNING';
      } else {
        resolutionSlaStatus = 'ACTIVE';
      }
    }

    const isNearBreach = resolutionSlaStatus === 'WARNING';
    const isBreached = resolutionSlaStatus === 'BREACHED' || resolutionSlaStatus === 'FAILED' || !!ticket.isSlaBreached;

    return {
      policyMatched: policy || undefined,
      precedenceScore: 0,
      responseTargetMinutes,
      resolutionTargetMinutes,
      responseDueTime,
      resolutionDueTime,
      responseSlaStatus,
      resolutionSlaStatus,
      responseRemainingMinutes,
      resolutionRemainingMinutes,
      resolutionElapsedPercentage,
      isNearBreach,
      isBreached,
      overdueMinutes
    };
  }

  /**
   * Pause ticket SLA timer.
   */
  public static pauseTicketSla(
    ticket: ServiceTicketRecord,
    reason: TicketSlaPauseReason,
    user: UserSession,
    notes?: string
  ): { updatedTicket: ServiceTicketRecord; pauseRecord: TicketSlaPauseRecord } {
    const now = new Date().toISOString();
    const pauseId = `PAUSE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    const pauseRecord: TicketSlaPauseRecord = {
      id: pauseId,
      ticketId: ticket.id,
      companyId: ticket.companyId,
      pausedAt: now,
      reason,
      notes: notes || '',
      pausedByUserId: user.userId,
      pausedByName: user.fullName || user.email || 'Authorized User'
    };

    const updatedHistory = [...(ticket.pauseHistory || []), pauseRecord];

    const updatedTicket: ServiceTicketRecord = {
      ...ticket,
      status: 'PENDING_CLIENT',
      resolutionSlaStatus: 'PAUSED',
      lastPausedAt: now,
      pauseHistory: updatedHistory,
      updatedAt: now
    };

    return { updatedTicket, pauseRecord };
  }

  /**
   * Resume ticket SLA timer and push out target due time by total paused duration.
   */
  public static resumeTicketSla(
    ticket: ServiceTicketRecord,
    user: UserSession,
    notes?: string
  ): { updatedTicket: ServiceTicketRecord; resumeNotes: string } {
    const now = new Date();
    const nowIso = now.toISOString();

    let pausedMinutes = 0;
    const history = [...(ticket.pauseHistory || [])];

    if (ticket.lastPausedAt) {
      const pausedStart = new Date(ticket.lastPausedAt);
      pausedMinutes = Math.max(1, Math.round((now.getTime() - pausedStart.getTime()) / (60 * 1000)));
    }

    if (history.length > 0) {
      const lastIndex = history.length - 1;
      history[lastIndex] = {
        ...history[lastIndex],
        resumedAt: nowIso,
        pausedDurationMinutes: pausedMinutes,
        resumedByUserId: user.userId,
        resumedByName: user.fullName || user.email || 'Authorized User',
        notes: notes ? `${history[lastIndex].notes ? history[lastIndex].notes + ' | ' : ''}Resumed: ${notes}` : history[lastIndex].notes
      };
    }

    // Extend resolution due time by the paused minutes
    const currentDueDate = new Date(ticket.resolutionDueTime || ticket.slaDueTime);
    const newDueDate = new Date(currentDueDate.getTime() + pausedMinutes * 60 * 1000);
    const newDueTimeIso = newDueDate.toISOString();

    const totalPaused = (ticket.totalPausedDurationMinutes || 0) + pausedMinutes;

    const updatedTicket: ServiceTicketRecord = {
      ...ticket,
      status: 'IN_PROGRESS',
      resolutionSlaStatus: 'ACTIVE',
      slaDueTime: newDueTimeIso,
      resolutionDueTime: newDueTimeIso,
      totalPausedDurationMinutes: totalPaused,
      lastPausedAt: undefined,
      pauseHistory: history,
      updatedAt: nowIso
    };

    const resumeNotes = `SLA resumed after ${pausedMinutes} minutes on hold. Due time extended to ${newDueDate.toLocaleString()}.`;
    return { updatedTicket, resumeNotes };
  }
}
