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
  siteId: string;
  employeeId: string;
  triggeredByUserId: string;
  
  source: 'WEB' | 'ANDROID' | 'KIOSK';
  emergencyType: SosEmergencyType;
  severity: SosSeverity;
  status: SosStatus;
  
  // Location
  latitude: number;
  longitude: number;
  locationAccuracy?: number;
  locationTimestamp: string;
  
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
  escalationLevel: number;
  lastEscalatedAt?: string;
  
  // Closure
  cancellationReason?: string;
  resolutionNotes?: string;
  
  createdAt: string;
  updatedAt: string;
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
