import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  UserSession, 
  CompanyTenant,
  SiteRecord, 
  ShiftRecord, 
  EmployeeRecord, 
  RosterRecord, 
  AttendanceRecord, 
  LeaveRequestRecord,
  OvertimeRequestRecord,
  AppNotification
} from '../types';
import { 
  SiteShiftRequirement, 
  WorkforceShortageIncident, 
  CapacityPlanningSummary, 
  SiteCapacityAssessment, 
  ReplacementCandidate, 
  ReplacementProposal,
  WorkforceAnomalyType, 
  ShortageSeverity, 
  ShortageWorkflowStage,
  ShiftWorkforceBreakdown, 
  ScheduledStaffDetail,
  SkillGapDetail,
  UnexpectedAbsenceDetail,
  CriticalSkillType
} from '../types/workforceCapacity';
import { FirestoreService } from './firestoreService';

export class WorkforceCapacityEngine {
  private static REQUIREMENTS_COLLECTION = 'site_shift_requirements';
  private static INCIDENTS_COLLECTION = 'workforce_shortage_incidents';

  /**
   * Evaluates complete workforce capacity across all sites for a target date
   */
  static async evaluateAllSitesCapacity(
    userSession: UserSession,
    companyId: string,
    targetDate: string,
    preloadedData?: {
      sites?: SiteRecord[];
      shifts?: ShiftRecord[];
      employees?: EmployeeRecord[];
      rosters?: RosterRecord[];
      attendance?: AttendanceRecord[];
      leaves?: LeaveRequestRecord[];
      requirements?: SiteShiftRequirement[];
      incidents?: WorkforceShortageIncident[];
    }
  ): Promise<{
    summary: CapacityPlanningSummary;
    siteAssessments: SiteCapacityAssessment[];
    incidents: WorkforceShortageIncident[];
  }> {
    // 1. Fetch or use provided authoritative data
    const sites = preloadedData?.sites || await this.getSites(companyId);
    const shifts = preloadedData?.shifts || await this.getShifts(companyId);
    const employees = preloadedData?.employees || await this.getEmployees(companyId);
    const rosters = preloadedData?.rosters || await this.getRostersForDate(companyId, targetDate);
    const attendance = preloadedData?.attendance || await this.getAttendanceForDate(companyId, targetDate);
    const leaves = preloadedData?.leaves || await this.getActiveLeaves(companyId);
    const requirements = preloadedData?.requirements || await this.getSiteRequirements(companyId);
    const existingIncidents = preloadedData?.incidents || await this.getIncidentsForDate(companyId, targetDate);

    const employeeMap = new Map<string, EmployeeRecord>();
    employees.forEach(e => employeeMap.set(e.id, e));

    const requirementMap = new Map<string, SiteShiftRequirement>();
    requirements.forEach(r => requirementMap.set(`${r.siteId}_${r.shiftId}`, r));

    const incidentMap = new Map<string, WorkforceShortageIncident>();
    existingIncidents.forEach(inc => incidentMap.set(`${inc.siteId}_${inc.shiftId}`, inc));

    const siteAssessments: SiteCapacityAssessment[] = [];
    const generatedIncidents: WorkforceShortageIncident[] = [];

    let totalReq = 0;
    let totalSched = 0;
    let totalAvail = 0;
    let totalLeaves = 0;
    let totalAbsences = 0;
    let totalOvertime = 0;
    let totalShortage = 0;
    let totalSurplus = 0;
    let understaffedCount = 0;
    let overstaffedCount = 0;
    let unfilledCount = 0;
    let skillShortageCount = 0;
    let unexpectedAbsenceCount = 0;
    let criticalIncidentsCount = 0;
    let openAlertsCount = 0;
    let resolvedTodayCount = 0;

    const dayOfWeek = new Date(targetDate).getDay();

    // 2. Iterate each site
    for (const site of sites) {
      if (site.status === 'INACTIVE') continue;

      const siteRequirements = requirements.filter(r => r.siteId === site.id);
      const siteRosters = rosters.filter(r => r.siteId === site.id);
      const siteAttendance = attendance.filter(a => a.siteId === site.id);

      // Active shifts applicable to this site
      const activeShifts = shifts.filter(s => {
        if (s.status === 'INACTIVE') return false;
        if (s.applicableSites && s.applicableSites.length > 0 && !s.applicableSites.includes(site.id)) {
          return false;
        }
        return true;
      });

      const shiftsAssessment: SiteCapacityAssessment['shiftsAssessment'] = [];
      let siteReqSum = 0;
      let siteSchedSum = 0;
      let siteAvailSum = 0;
      let siteShortageSum = 0;

      for (const shift of activeShifts) {
        const reqKey = `${site.id}_${shift.id}`;
        let requirement = requirementMap.get(reqKey);

        // If no explicit requirement exists, provide sensible enterprise default
        if (!requirement) {
          requirement = {
            id: `REQ-${site.id}-${shift.id}`,
            companyId,
            siteId: site.id,
            siteName: site.name || 'Site',
            shiftId: shift.id,
            shiftName: shift.shiftName || 'Shift',
            requiredHeadcount: 2,
            minHeadcount: 1,
            maxHeadcount: 4,
            requiredSkills: [{ skill: 'UNARMED_SECURITY', minCount: 1 }],
            applicableDays: [0, 1, 2, 3, 4, 5, 6],
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }

        // Check if shift is active on this day of the week
        const isShiftApplicableToday = requirement.applicableDays.includes(dayOfWeek);
        if (!isShiftApplicableToday) continue;

        // Calculate pipeline for this shift
        const shiftRosters = siteRosters.filter(r => r.shiftId === shift.id);
        const shiftAttendance = siteAttendance.filter(a => a.shiftId === shift.id);

        const breakdown = this.computeShiftBreakdown(
          site,
          shift,
          targetDate,
          requirement,
          shiftRosters,
          shiftAttendance,
          leaves,
          employeeMap
        );

        // Detect Anomalies
        const anomalies: WorkforceAnomalyType[] = [];
        if (breakdown.scheduledCount === 0 && breakdown.requiredCount > 0) {
          anomalies.push('UNFILLED_SHIFTS');
        }
        if (breakdown.availableCount < requirement.requiredHeadcount) {
          anomalies.push('UNDERSTAFFING');
        }
        if (breakdown.availableCount > requirement.maxHeadcount) {
          anomalies.push('OVERSTAFFING');
        }
        if (breakdown.missingSkills.length > 0) {
          anomalies.push('CRITICAL_SKILL_SHORTAGE');
        }
        if (breakdown.unexpectedAbsences.length > 0) {
          anomalies.push('UNEXPECTED_ABSENCE');
        }

        // Determine Severity
        let severity: ShortageSeverity = 'LOW';
        if (breakdown.availableCount < requirement.minHeadcount || breakdown.missingSkills.some(s => s.skill.includes('FIRST_AID') || s.skill.includes('ARMED') || s.skill.includes('SUPERVISOR'))) {
          severity = 'CRITICAL';
        } else if (anomalies.includes('UNDERSTAFFING') || anomalies.includes('UNEXPECTED_ABSENCE')) {
          severity = 'HIGH';
        } else if (anomalies.includes('OVERSTAFFING') || anomalies.includes('UNFILLED_SHIFTS')) {
          severity = 'MEDIUM';
        }

        // Map or generate Incident
        let incident = incidentMap.get(reqKey);
        if (anomalies.length > 0) {
          const primaryAnomaly = anomalies[0];
          const initialStage: ShortageWorkflowStage = incident?.stage || 'SHORTAGE_IDENTIFIED';

          if (!incident) {
            incident = {
              id: `SHORTAGE-${site.id}-${shift.id}-${targetDate}`,
              companyId,
              siteId: site.id,
              siteName: site.name || 'Site',
              shiftId: shift.id,
              shiftName: shift.shiftName || 'Shift',
              shiftStartTime: shift.startTime || '08:00',
              shiftEndTime: shift.endTime || '16:00',
              date: targetDate,
              stage: initialStage,
              anomalyTypes: anomalies,
              primaryAnomaly,
              severity,
              breakdown,
              supervisorId: (site as any).supervisorId || (employees.find(e => e.assignedSiteId === site.id && (e.role === 'SUPERVISOR' || e.designation?.includes('Supervisor'))))?.id,
              supervisorName: (site as any).supervisorName || (employees.find(e => e.assignedSiteId === site.id && (e.role === 'SUPERVISOR' || e.designation?.includes('Supervisor'))))?.firstName,
              supervisorPhone: (site as any).supervisorPhone || (employees.find(e => e.assignedSiteId === site.id && (e.role === 'SUPERVISOR' || e.designation?.includes('Supervisor'))))?.contactNumber,
              timeline: [
                {
                  stage: 'SHORTAGE_IDENTIFIED',
                  timestamp: new Date().toISOString(),
                  actor: 'Capacity Planning Engine',
                  actorRole: 'SYSTEM',
                  note: `Detected ${anomalies.join(', ')}. Required: ${breakdown.requiredCount}, Available: ${breakdown.availableCount}.`
                }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          } else {
            // Update incident breakdown & anomalies
            incident.breakdown = breakdown;
            incident.anomalyTypes = anomalies;
            incident.severity = severity;
            incident.updatedAt = new Date().toISOString();
          }

          generatedIncidents.push(incident);
        } else if (incident && incident.stage !== 'RESOLVED') {
          incident.stage = 'RESOLVED';
          incident.resolution = {
            resolvedAt: new Date().toISOString(),
            resolvedBy: 'SYSTEM',
            resolvedByName: 'Workforce Capacity Engine',
            actionTaken: 'Staffing levels returned to optimal parameters.',
            notes: 'All required positions and skill floors are now filled.'
          };
          incident.timeline.push({
            stage: 'RESOLVED',
            timestamp: new Date().toISOString(),
            actor: 'Capacity Planning Engine',
            actorRole: 'SYSTEM',
            note: 'Capacity requirements satisfied.'
          });
          generatedIncidents.push(incident);
        }

        // Aggregate summary metrics
        totalReq += breakdown.requiredCount;
        totalSched += breakdown.scheduledCount;
        totalAvail += breakdown.availableCount;
        totalLeaves += breakdown.leaveCount;
        totalAbsences += breakdown.absenceCount;
        totalOvertime += breakdown.overtimeCount;
        totalShortage += breakdown.shortageCount;
        totalSurplus += breakdown.surplusCount;

        if (anomalies.includes('UNDERSTAFFING')) understaffedCount++;
        if (anomalies.includes('OVERSTAFFING')) overstaffedCount++;
        if (anomalies.includes('UNFILLED_SHIFTS')) unfilledCount++;
        if (anomalies.includes('CRITICAL_SKILL_SHORTAGE')) skillShortageCount++;
        if (anomalies.includes('UNEXPECTED_ABSENCE')) unexpectedAbsenceCount++;
        if (severity === 'CRITICAL') criticalIncidentsCount++;

        if (incident) {
          if (incident.stage === 'SUPERVISOR_ALERTED' || incident.stage === 'SHORTAGE_IDENTIFIED') openAlertsCount++;
          if (incident.stage === 'RESOLVED') resolvedTodayCount++;
        }

        siteReqSum += breakdown.requiredCount;
        siteSchedSum += breakdown.scheduledCount;
        siteAvailSum += breakdown.availableCount;
        siteShortageSum += breakdown.shortageCount;

        shiftsAssessment.push({
          shift,
          requirement,
          breakdown,
          anomalies,
          severity,
          incident
        });
      }

      let overallStatus: SiteCapacityAssessment['overallStatus'] = 'OPTIMAL';
      if (shiftsAssessment.some(s => s.severity === 'CRITICAL')) {
        overallStatus = 'CRITICAL';
      } else if (shiftsAssessment.some(s => s.anomalies.includes('UNDERSTAFFING') || s.anomalies.includes('CRITICAL_SKILL_SHORTAGE'))) {
        overallStatus = 'WARNING';
      } else if (shiftsAssessment.some(s => s.anomalies.includes('OVERSTAFFING'))) {
        overallStatus = 'OVERSTAFFED';
      }

      siteAssessments.push({
        site,
        requirements: siteRequirements,
        shiftsAssessment,
        overallStatus,
        totalRequired: siteReqSum,
        totalScheduled: siteSchedSum,
        totalAvailable: siteAvailSum,
        totalShortage: siteShortageSum
      });
    }

    const coverageRate = totalReq > 0 ? Math.min(100, Math.round((totalAvail / totalReq) * 100)) : 100;

    const summary: CapacityPlanningSummary = {
      date: targetDate,
      totalSitesEvaluated: sites.length,
      totalShiftsEvaluated: siteAssessments.reduce((sum, s) => sum + s.shiftsAssessment.length, 0),
      totalRequiredWorkforce: totalReq,
      totalScheduledWorkforce: totalSched,
      totalAvailableWorkforce: totalAvail,
      totalLeavesCount: totalLeaves,
      totalAbsencesCount: totalAbsences,
      totalOvertimeCount: totalOvertime,
      netShortageCount: totalShortage,
      netSurplusCount: totalSurplus,
      understaffedShiftsCount: understaffedCount,
      overstaffedShiftsCount: overstaffedCount,
      unfilledShiftsCount: unfilledCount,
      skillShortageShiftsCount: skillShortageCount,
      unexpectedAbsencesCount: unexpectedAbsenceCount,
      criticalIncidentsCount: criticalIncidentsCount,
      openAlertsCount: openAlertsCount,
      resolvedTodayCount: resolvedTodayCount,
      siteCoverageRate: coverageRate
    };

    return {
      summary,
      siteAssessments,
      incidents: generatedIncidents
    };
  }

  /**
   * Computes the 6-stage mathematical breakdown for a single shift
   * Required -> Scheduled -> Leave -> Absence -> Overtime -> Available -> Shortage
   */
  private static computeShiftBreakdown(
    site: SiteRecord,
    shift: ShiftRecord,
    targetDate: string,
    requirement: SiteShiftRequirement,
    rosters: RosterRecord[],
    attendance: AttendanceRecord[],
    leaves: LeaveRequestRecord[],
    employeeMap: Map<string, EmployeeRecord>
  ): ShiftWorkforceBreakdown {
    const requiredCount = requirement.requiredHeadcount || 2;
    const scheduledStaff: ScheduledStaffDetail[] = [];
    const approvedLeaves: { employeeId: string; name: string; leaveType: string }[] = [];
    const unexpectedAbsences: UnexpectedAbsenceDetail[] = [];

    let leaveCount = 0;
    let absenceCount = 0;
    let overtimeCount = 0;

    // Evaluate scheduled personnel
    rosters.forEach(r => {
      const emp = employeeMap.get(r.employeeId);
      const empSkills: string[] = [];
      if ((emp as any)?.skills) empSkills.push(...(emp as any).skills);
      if (emp?.skillGrade) empSkills.push(emp.skillGrade);
      if (emp?.designation) empSkills.push(emp.designation);
      if (emp?.role) empSkills.push(emp.role);

      // Check if on leave
      const activeLeave = leaves.find(l => {
        if (l.employeeId !== r.employeeId) return false;
        if (l.status !== 'APPROVED' && l.status !== 'PENDING') return false;
        const start = l.startDate.split('T')[0];
        const end = l.endDate.split('T')[0];
        return targetDate >= start && targetDate <= end;
      });

      // Check attendance punch
      const attRecord = attendance.find(a => a.employeeId === r.employeeId && a.shiftId === shift.id);

      let status: ScheduledStaffDetail['status'] = 'SCHEDULED';
      let leaveType: string | undefined;
      let punchTime: string | undefined;

      if (activeLeave) {
        status = activeLeave.status === 'APPROVED' ? 'ON_LEAVE' : 'LEAVE_PENDING';
        leaveType = activeLeave.leaveType || (activeLeave as any).leaveCode || 'Leave';
        leaveCount++;
        approvedLeaves.push({
          employeeId: r.employeeId,
          name: r.employeeName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
          leaveType: leaveType || 'Leave'
        });
      } else if (attRecord && (attRecord.checkIn || attRecord.status === 'PRESENT' || attRecord.status === 'LATE')) {
        status = 'PRESENT';
        punchTime = attRecord.checkIn || (attRecord as any).checkInTime;
      } else {
        // Evaluate if unexpected absence:
        // If today is the target date and current time has passed shift start time + grace period (e.g. 15 mins)
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        if (targetDate === todayStr) {
          const [sHour, sMin] = (shift.startTime || '08:00').split(':').map(Number);
          const shiftStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sHour, sMin);
          const diffMinutes = Math.floor((now.getTime() - shiftStartDate.getTime()) / (60 * 1000));

          if (diffMinutes > (shift.gracePeriodMinutes || 15) && !attRecord?.checkIn) {
            status = 'ABSENT';
            absenceCount++;
            unexpectedAbsences.push({
              employeeId: r.employeeId,
              name: r.employeeName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
              phone: emp?.contactNumber,
              shiftStart: shift.startTime || '08:00',
              minutesOverdue: diffMinutes,
              supervisorNotified: false
            });
          }
        } else if (targetDate < todayStr && (!attRecord || attRecord.status === 'ABSENT')) {
          status = 'ABSENT';
          absenceCount++;
          unexpectedAbsences.push({
            employeeId: r.employeeId,
            name: r.employeeName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
            phone: emp?.contactNumber,
            shiftStart: shift.startTime || '08:00',
            minutesOverdue: 480,
            supervisorNotified: true
          });
        }
      }

      scheduledStaff.push({
        employeeId: r.employeeId,
        name: r.employeeName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
        phone: emp?.contactNumber,
        designation: emp?.designation,
        skills: empSkills,
        certifications: (emp as any)?.certifications,
        status,
        leaveType,
        punchTime,
        isOvertime: (r as any).isOvertime || (r as any).deploymentType === 'RELIEF'
      });
    });

    const scheduledCount = rosters.length;
    // Available count = (Scheduled minus Leaves minus Absences) + Overtime
    const availableCount = Math.max(0, scheduledCount - leaveCount - absenceCount + overtimeCount);
    const shortageCount = Math.max(0, requiredCount - availableCount);
    const surplusCount = Math.max(0, availableCount - requiredCount);

    // Skill Gap Evaluation
    const missingSkills: SkillGapDetail[] = [];
    if (requirement.requiredSkills && requirement.requiredSkills.length > 0) {
      const activeStaff = scheduledStaff.filter(s => s.status === 'PRESENT' || s.status === 'SCHEDULED');
      
      for (const reqSkill of requirement.requiredSkills) {
        const matchingStaffCount = activeStaff.filter(staff => {
          const allStaffTags = [...staff.skills, staff.designation || ''];
          return allStaffTags.some(tag => tag.toLowerCase().includes(reqSkill.skill.toLowerCase().replace(/_/g, ' ')));
        }).length;

        if (matchingStaffCount < reqSkill.minCount) {
          missingSkills.push({
            skill: reqSkill.skill,
            requiredCount: reqSkill.minCount,
            availableCount: matchingStaffCount,
            deficit: reqSkill.minCount - matchingStaffCount
          });
        }
      }
    }

    return {
      requiredCount,
      scheduledCount,
      leaveCount,
      absenceCount,
      overtimeCount,
      availableCount,
      shortageCount,
      surplusCount,
      scheduledStaff,
      missingSkills,
      unexpectedAbsences,
      approvedLeaves
    };
  }

  /**
   * Intelligently finds available, compliant replacement candidates matching required skills
   */
  static async findEligibleReplacements(
    userSession: UserSession,
    companyId: string,
    siteId: string,
    shiftId: string,
    targetDate: string,
    requiredSkills: string[] = []
  ): Promise<ReplacementCandidate[]> {
    const allEmployees = await this.getEmployees(companyId);
    const rosters = await this.getRostersForDate(companyId, targetDate);
    const leaves = await this.getActiveLeaves(companyId);
    const sites = await this.getSites(companyId);
    const siteMap = new Map<string, SiteRecord>();
    sites.forEach(s => siteMap.set(s.id, s));

    const targetSite = siteMap.get(siteId);

    // Set of employees already scheduled on this target date & shift
    const scheduledEmpIds = new Set(rosters.filter(r => r.date === targetDate && r.shiftId === shiftId).map(r => r.employeeId));

    // Set of employees on leave on target date
    const onLeaveEmpIds = new Set(
      leaves.filter(l => {
        if (l.status !== 'APPROVED' && l.status !== 'PENDING') return false;
        const start = l.startDate.split('T')[0];
        const end = l.endDate.split('T')[0];
        return targetDate >= start && targetDate <= end;
      }).map(l => l.employeeId)
    );

    const candidates: ReplacementCandidate[] = [];

    for (const emp of allEmployees) {
      if (emp.status !== 'ACTIVE') continue;
      if (scheduledEmpIds.has(emp.id)) continue;
      if (onLeaveEmpIds.has(emp.id)) continue;

      const empSkills: string[] = [];
      if ((emp as any)?.skills) empSkills.push(...(emp as any).skills);
      if (emp.skillGrade) empSkills.push(emp.skillGrade);
      if (emp.designation) empSkills.push(emp.designation);
      if (emp.role) empSkills.push(emp.role);

      // Skill match scoring (0 - 100)
      let skillMatchScore = 70; // Base score for trained personnel
      if (requiredSkills.length > 0) {
        let matchedCount = 0;
        for (const req of requiredSkills) {
          const reqLower = req.toLowerCase().replace(/_/g, ' ');
          if (empSkills.some(s => s.toLowerCase().includes(reqLower))) {
            matchedCount++;
          }
        }
        skillMatchScore = Math.round((matchedCount / requiredSkills.length) * 100);
      }

      // Determine Source Type: Standby Pool, Overtime, or Cross-Site Transfer
      let sourceType: ReplacementCandidate['sourceType'] = 'STANDBY_POOL';
      if (emp.assignedSiteId === siteId) {
        sourceType = 'OVERTIME_EXTENSION';
      } else if (emp.assignedBranchId === targetSite?.branchId) {
        sourceType = 'CROSS_SITE_TRANSFER';
      } else {
        sourceType = 'STANDBY_POOL';
      }

      // Extracted weekly OT hours and rest hours (WFM compliance)
      const weeklyOvertimeHours = (emp as any).weeklyOvertimeHours || 0;
      const restHours = (emp as any).restHours || 14;
      const isEligibleForOvertime = weeklyOvertimeHours <= 12; // Standard statutory overtime cap

      let complianceScore = 100;
      if (weeklyOvertimeHours > 8) complianceScore -= 20;
      if (weeklyOvertimeHours > 12) complianceScore -= 40;
      if (restHours < 11) complianceScore -= 30; // Minimum 11 hours rest period compliance

      const originSiteName = emp.assignedSiteId ? (siteMap.get(emp.assignedSiteId)?.name || 'Central Reserve') : 'Central Reserve';

      candidates.push({
        employeeId: emp.id,
        fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee',
        phone: emp.contactNumber || 'N/A',
        email: emp.email,
        designation: emp.designation || emp.role || 'Security Officer',
        skillGrade: emp.skillGrade || 'SKILLED',
        skills: empSkills,
        certifications: (emp as any).certifications || ['Standard PSARA Training'],
        assignedSiteId: emp.assignedSiteId || '',
        assignedSiteName: originSiteName,
        assignedBranchId: emp.assignedBranchId || '',
        sourceType,
        weeklyOvertimeHours,
        restHoursSinceLastShift: restHours,
        complianceScore: Math.max(0, complianceScore),
        skillMatchScore,
        isEligibleForOvertime,
        availabilityStatus: isEligibleForOvertime ? 'AVAILABLE' : 'OVERTIME_ELIGIBLE',
        estimatedCostPerShift: 650 // Estimated standard relief / OT rate
      });
    }

    // Sort by skill match score desc, then compliance score desc
    return candidates.sort((a, b) => {
      if (b.skillMatchScore !== a.skillMatchScore) return b.skillMatchScore - a.skillMatchScore;
      return b.complianceScore - a.complianceScore;
    });
  }

  /**
   * Stage 8: Trigger Supervisor Alert
   */
  static async triggerSupervisorAlert(
    userSession: UserSession,
    companyId: string,
    incident: WorkforceShortageIncident,
    customMessage?: string
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const supervisorName = incident.supervisorName || 'Site Supervisor';

      // 1. Create Notification for Supervisor & Operations
      const alertNotification: AppNotification = {
        id: `NOTIF-SHORTAGE-${Date.now()}`,
        title: `🚨 Workforce Shortage Alert: ${incident.siteName} (${incident.shiftName})`,
        message: customMessage || `Critical staffing variance on ${incident.date}. Required: ${incident.breakdown.requiredCount}, Available: ${incident.breakdown.availableCount}. Action required immediately to prevent service SLA disruption.`,
        type: incident.severity === 'CRITICAL' ? 'ALERT' : 'WARNING',
        timestamp: now,
        isRead: false,
        actionRoute: 'WORKFORCE_CAPACITY',
        siteId: incident.siteId
      };

      await FirestoreService.createNotification(companyId, alertNotification);

      // 2. Update Incident Stage
      incident.stage = 'SUPERVISOR_ALERTED';
      incident.alertDispatchedAt = now;
      incident.timeline.push({
        stage: 'SUPERVISOR_ALERTED',
        timestamp: now,
        actor: userSession.fullName || 'Operations Manager',
        actorRole: userSession.role,
        note: `Dispatched automated shortage alert to ${supervisorName} (${incident.supervisorPhone || 'System Dispatch'}). Severity: ${incident.severity}.`
      });
      incident.updatedAt = now;

      // 3. Persist Incident
      await this.saveIncident(companyId, incident);

      // 4. Log Audit Trail
      await FirestoreService.logAuditEvent(
        companyId,
        userSession.userId,
        userSession.fullName,
        'WORKFORCE_SUPERVISOR_ALERTED',
        `Dispatched workforce shortage alert for site ${incident.siteName} shift ${incident.shiftName} (Date: ${incident.date}). Severity: ${incident.severity}`
      );

      return true;
    } catch (err) {
      console.error('[WorkforceCapacityEngine] triggerSupervisorAlert error:', err);
      return false;
    }
  }

  /**
   * Stage 9: Propose Replacement
   */
  static async proposeReplacement(
    userSession: UserSession,
    companyId: string,
    incident: WorkforceShortageIncident,
    proposal: ReplacementProposal
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();

      incident.stage = 'REPLACEMENT_PROPOSED';
      incident.replacementProposal = proposal;
      incident.timeline.push({
        stage: 'REPLACEMENT_PROPOSED',
        timestamp: now,
        actor: userSession.fullName || 'Dispatcher',
        actorRole: userSession.role,
        note: `Proposed replacement: ${proposal.candidateName} (${proposal.sourceType}). Match Score: ${proposal.skillMatchScore}%. Est. Cost: ₹${proposal.estimatedCost}.`
      });
      incident.updatedAt = now;

      // Persist Incident
      await this.saveIncident(companyId, incident);

      // Log Audit Event
      await FirestoreService.logAuditEvent(
        companyId,
        userSession.userId,
        userSession.fullName,
        'WORKFORCE_REPLACEMENT_PROPOSED',
        `Proposed candidate ${proposal.candidateName} for site ${incident.siteName} shift ${incident.shiftName}`
      );

      return true;
    } catch (err) {
      console.error('[WorkforceCapacityEngine] proposeReplacement error:', err);
      return false;
    }
  }

  /**
   * Stage 10 & 11: Approve Replacement & Auto-Deploy to Roster
   */
  static async approveReplacement(
    userSession: UserSession,
    companyId: string,
    incident: WorkforceShortageIncident,
    approvalNotes?: string
  ): Promise<boolean> {
    try {
      if (!incident.replacementProposal) {
        throw new Error('No replacement proposal found on this incident.');
      }

      const proposal = incident.replacementProposal;
      const now = new Date().toISOString();

      // 1. Create or Update RosterRecord in authoritative Firestore collection
      const newRosterId = `ROSTER-${incident.date}-${proposal.candidateId}-${incident.shiftId}`;
      const rosterRecord: RosterRecord = {
        id: newRosterId,
        companyId,
        siteId: incident.siteId,
        siteName: incident.siteName,
        employeeId: proposal.candidateId,
        employeeName: proposal.candidateName,
        shiftId: incident.shiftId,
        shiftName: incident.shiftName,
        date: incident.date,
        status: 'SCHEDULED',
        createdBy: userSession.userId,
        updatedBy: userSession.userId,
        createdAt: now,
        updatedAt: now
      };

      // Save RosterRecord
      await FirestoreService.saveRoster(companyId, rosterRecord);

      // 2. Update Incident Status
      incident.stage = 'APPROVED';
      incident.approval = {
        approvedBy: userSession.userId,
        approvedByName: userSession.fullName,
        approvedAt: now,
        notes: approvalNotes || 'Authorized emergency staffing replacement.'
      };
      incident.timeline.push({
        stage: 'APPROVED',
        timestamp: now,
        actor: userSession.fullName,
        actorRole: userSession.role,
        note: `Approved replacement deployment for ${proposal.candidateName}. Synchronized to authoritative Roster (ID: ${newRosterId}).`
      });

      // Advance immediately to RESOLVED
      incident.stage = 'RESOLVED';
      incident.resolution = {
        resolvedAt: now,
        resolvedBy: userSession.userId,
        resolvedByName: userSession.fullName,
        actionTaken: `Emergency relief guard ${proposal.candidateName} scheduled and deployed to site ${incident.siteName}.`,
        notes: approvalNotes
      };
      incident.timeline.push({
        stage: 'RESOLVED',
        timestamp: now,
        actor: userSession.fullName,
        actorRole: userSession.role,
        note: 'Shortage incident closed. Site capacity restored to full compliance.'
      });
      incident.updatedAt = now;

      // 3. Persist Incident
      await this.saveIncident(companyId, incident);

      // 4. Send Confirmation Notification to Replacement Guard & Supervisor
      await FirestoreService.createNotification(companyId, {
        id: `NOTIF-RELIEF-${Date.now()}`,
        title: `✅ Relief Deployment Confirmed: ${incident.siteName}`,
        message: `Employee ${proposal.candidateName} has been authorized and dispatched to ${incident.siteName} for ${incident.shiftName} on ${incident.date}.`,
        type: 'SUCCESS',
        timestamp: now,
        isRead: false,
        actionRoute: 'SHIFT_ROSTER',
        siteId: incident.siteId
      });

      // 5. Audit Trail
      await FirestoreService.logAuditEvent(
        companyId,
        userSession.userId,
        userSession.fullName,
        'WORKFORCE_REPLACEMENT_APPROVED',
        `Approved relief deployment of ${proposal.candidateName} for site ${incident.siteName} on ${incident.date} (Roster ID: ${newRosterId})`
      );

      return true;
    } catch (err) {
      console.error('[WorkforceCapacityEngine] approveReplacement error:', err);
      return false;
    }
  }

  /**
   * Stage 11: Manual Resolution / Dismissal
   */
  static async resolveIncident(
    userSession: UserSession,
    companyId: string,
    incident: WorkforceShortageIncident,
    actionTaken: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();

      incident.stage = 'RESOLVED';
      incident.resolution = {
        resolvedAt: now,
        resolvedBy: userSession.userId,
        resolvedByName: userSession.fullName,
        actionTaken,
        notes
      };
      incident.timeline.push({
        stage: 'RESOLVED',
        timestamp: now,
        actor: userSession.fullName,
        actorRole: userSession.role,
        note: `Incident resolved: ${actionTaken}. ${notes || ''}`
      });
      incident.updatedAt = now;

      await this.saveIncident(companyId, incident);

      await FirestoreService.logAuditEvent(
        companyId,
        userSession.userId,
        userSession.fullName,
        'WORKFORCE_SHORTAGE_RESOLVED',
        `Resolved shortage incident on site ${incident.siteName} shift ${incident.shiftName} (${incident.date})`
      );

      return true;
    } catch (err) {
      console.error('[WorkforceCapacityEngine] resolveIncident error:', err);
      return false;
    }
  }

  /**
   * Configures Site Shift Staffing Requirements
   */
  static async saveSiteRequirement(
    userSession: UserSession,
    companyId: string,
    requirement: SiteShiftRequirement
  ): Promise<boolean> {
    try {
      requirement.updatedAt = new Date().toISOString();
      const docRef = doc(db, this.REQUIREMENTS_COLLECTION, requirement.id);
      await setDoc(docRef, requirement, { merge: true });

      await FirestoreService.logAuditEvent(
        companyId,
        userSession.userId,
        userSession.fullName,
        'WORKFORCE_REQUIREMENT_CONFIGURED',
        `Updated workforce staffing requirement for site ${requirement.siteName}, shift ${requirement.shiftName} (Headcount: ${requirement.requiredHeadcount})`
      );

      return true;
    } catch (err) {
      console.error('[WorkforceCapacityEngine] saveSiteRequirement error:', err);
      return false;
    }
  }

  // --- Real-time Firestore Subscriptions & Queries ---

  static subscribeToIncidents(
    companyId: string,
    targetDate: string,
    onData: (incidents: WorkforceShortageIncident[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'companies', companyId, this.INCIDENTS_COLLECTION),
        where('companyId', '==', companyId),
        where('date', '==', targetDate)
      );

      return onSnapshot(q, (snap) => {
        const list: WorkforceShortageIncident[] = [];
        snap.forEach(doc => list.push(doc.data() as WorkforceShortageIncident));
        onData(list);
      }, (err) => {
        console.warn('[WorkforceCapacityEngine] subscribeToIncidents error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[WorkforceCapacityEngine] subscribeToIncidents exception:', e);
      return () => {};
    }
  }

  static subscribeToSiteRequirements(
    companyId: string,
    onData: (requirements: SiteShiftRequirement[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'companies', companyId, this.REQUIREMENTS_COLLECTION),
        where('companyId', '==', companyId)
      );

      return onSnapshot(q, (snap) => {
        const list: SiteShiftRequirement[] = [];
        snap.forEach(doc => list.push(doc.data() as SiteShiftRequirement));
        onData(list);
      }, (err) => {
        console.warn('[WorkforceCapacityEngine] subscribeToSiteRequirements error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[WorkforceCapacityEngine] subscribeToSiteRequirements exception:', e);
      return () => {};
    }
  }

  private static async saveIncident(companyId: string, incident: WorkforceShortageIncident): Promise<void> {
    const docRef = doc(db, 'companies', incident.companyId, this.INCIDENTS_COLLECTION, incident.id);
    await setDoc(docRef, incident, { merge: true });
  }

  private static async getSites(companyId: string): Promise<SiteRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'sites'), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      const list: SiteRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SiteRecord));
      return list;
    } catch (err) {
      return [];
    }
  }

  private static async getShifts(companyId: string): Promise<ShiftRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'shifts'), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      const list: ShiftRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ShiftRecord));
      return list;
    } catch (err) {
      return [];
    }
  }

  private static async getEmployees(companyId: string): Promise<EmployeeRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'employees'), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      const list: EmployeeRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as EmployeeRecord));
      return list;
    } catch (err) {
      return [];
    }
  }

  private static async getRostersForDate(companyId: string, targetDate: string): Promise<RosterRecord[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'rosters'),
        where('companyId', '==', companyId),
        where('date', '==', targetDate)
      );
      const snap = await getDocs(q);
      const list: RosterRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as RosterRecord));
      return list;
    } catch (err) {
      return [];
    }
  }

  private static async getAttendanceForDate(companyId: string, targetDate: string): Promise<AttendanceRecord[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'attendance'),
        where('companyId', '==', companyId),
        where('attendanceDate', '==', targetDate)
      );
      const snap = await getDocs(q);
      const list: AttendanceRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as AttendanceRecord));
      return list;
    } catch (err) {
      return [];
    }
  }

  private static async getActiveLeaves(companyId: string): Promise<LeaveRequestRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'leaves'), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      const list: LeaveRequestRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as LeaveRequestRecord));
      return list;
    } catch (err) {
      return [];
    }
  }

  private static async getSiteRequirements(companyId: string): Promise<SiteShiftRequirement[]> {
    try {
      const q = query(collection(db, 'companies', companyId, this.REQUIREMENTS_COLLECTION), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      const list: SiteShiftRequirement[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SiteShiftRequirement));
      return list;
    } catch (err) {
      return [];
    }
  }

  private static async getIncidentsForDate(companyId: string, targetDate: string): Promise<WorkforceShortageIncident[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, this.INCIDENTS_COLLECTION),
        where('companyId', '==', companyId),
        where('date', '==', targetDate)
      );
      const snap = await getDocs(q);
      const list: WorkforceShortageIncident[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as WorkforceShortageIncident));
      return list;
    } catch (err) {
      return [];
    }
  }
}
