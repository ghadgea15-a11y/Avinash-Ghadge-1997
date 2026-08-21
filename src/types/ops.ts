import { GeoVerificationData } from './index';

export type SosEmergencyType = 
  | 'PERSONAL_EMERGENCY'
  | 'MEDICAL_EMERGENCY'
  | 'SECURITY_THREAT'
  | 'FIRE_EMERGENCY'
  | 'ACCIDENT'
  | 'VIOLENCE_ASSAULT'
  | 'MISSING_UNSAFE_EMPLOYEE'
  | 'EQUIPMENT_ELECTRICAL'
  | 'OTHER';

export type SosSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export type SosStatus = 
  | 'TRIGGERED'
  | 'ACKNOWLEDGED'
  | 'RESPONSE_STARTED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'FALSE_ALARM'
  | 'CANCELLED';

export interface SosEventRecord {
  id: string;
  companyId: string;
  regionId?: string;
  branchId?: string;
  siteId?: string;
  employeeId?: string;
  userId?: string;
  userName?: string;
  triggeredByUserId?: string;
  
  source?: 'WEB' | 'ANDROID' | 'KIOSK' | string;
  emergencyType?: SosEmergencyType | string;
  severity?: SosSeverity | string;
  status: SosStatus | string;
  
  // Location
  latitude: number;
  longitude: number;
  locationAccuracy?: number;
  locationTimestamp?: string;
  
  // Timestamps & Actors
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string; // employee ID
  responseStartedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string; // employee ID
  closedAt?: string;
  
  // Links
  incidentId?: string;
  patrolTourId?: string;
  workOrderId?: string;
  trackingSessionId?: string;
  
  // Escalation
  escalationLevel?: number;
  lastEscalatedAt?: string;
  
  // Closure
  cancellationReason?: string;
  resolutionNotes?: string;
  
  createdAt?: string;
  updatedAt?: string;
}

export type TrackingPurposeType = 
  | 'PATROL'
  | 'WORK_ORDER'
  | 'EMERGENCY_RESPONSE'
  | 'SOS_TRIGGERED'
  | 'OPERATIONAL_SESSION'
  | 'LONE_WORKER';

export type TrackingSessionStatus = 'ACTIVE' | 'PAUSED' | 'ENDED' | 'AUTO_ENDED';

export interface TrackingSessionRecord {
  id: string;
  companyId: string;
  siteId: string;
  employeeId: string;
  
  purposeType: TrackingPurposeType;
  purposeId?: string; // e.g., patrolTourId, workOrderId, sosId
  
  startedAt: string;
  endedAt?: string;
  status: TrackingSessionStatus;
  
  startedBy: string; // employee ID
  endedBy?: string;
  
  locationPolicy: 'CONTINUOUS' | 'INTERVAL' | 'SIGNIFICANT_CHANGE';
  
  createdAt: string;
  updatedAt: string;
}

export interface GpsLocationEvent {
  id: string; // Document ID
  trackingSessionId: string;
  companyId: string;
  siteId: string;
  employeeId: string;
  
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  
  speed?: number;
  bearing?: number;
  source: 'FUSED' | 'GPS' | 'NETWORK';
  sequenceNumber: number;
  isStale?: boolean; // If generated from last-known but too old
}

export type SafetyChecksheetTemplate = 
  | 'FIRE_SAFETY_INSPECTION'
  | 'PPE_COMPLIANCE_AUDIT'
  | 'ELECTRICAL_SAFETY_CHECK'
  | 'SITE_HAZARD_INSPECTION'
  | 'GENERAL_SAFETY_WALK';

export interface SafetyChecksheetItem {
  id: string;
  category: string;
  question: string;
  response: 'YES' | 'NO' | 'NA';
  remarks?: string;
  photoUrl?: string;
}

export interface SafetyChecksheetRecord {
  id: string;
  companyId: string;
  siteId: string;
  siteName: string;
  templateType: SafetyChecksheetTemplate;
  title: string;
  
  performedByUserId: string;
  performedByUserName: string;
  
  items: SafetyChecksheetItem[];
  
  overallStatus: 'PASS' | 'FAIL' | 'CONDITIONAL';
  summaryRemarks?: string;
  
  // Branding data for persistent reports
  branding: {
    companyName: string;
    logoUrl?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}
