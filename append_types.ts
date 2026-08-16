import * as fs from 'fs';

const filePath = 'src/types/index.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Update IncidentReportRecord
content = content.replace(
  "export interface IncidentReportRecord {",
  "export interface IncidentReportRecord {\n  type?: 'INCIDENT' | 'COMPLAINT' | 'BBS_OBSERVATION';\n  slaDeadline?: string;\n  resolutionNotes?: string;\n  actionTaken?: string;\n  behaviorCategory?: string;"
);

// Update DailySiteLogRecord
content = content.replace(
  "export interface DailySiteLogRecord {",
  "export interface DailySiteLogRecord {\n  logType?: 'STANDARD' | 'INSPECTION' | 'HANDOVER';\n  inspectorId?: string;\n  checklistData?: any[];\n  score?: number;\n  status?: string;\n  outgoingSupervisorId?: string;\n  incomingSupervisorId?: string;\n  inventoryStatus?: any;\n  notes?: string;"
);

const newTypes = `
export interface TaskRecord {
  id: string;
  companyId: string;
  siteId?: string;
  departmentTag?: string;
  assignedTo: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  title: string;
  description: string;
  dueDate?: string;
  slaDeadline?: string;
  completionNotes?: string;
  photoUrl?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  createdAt: number;
  updatedAt: number;
}

export interface AnnouncementRecord {
  id: string;
  companyId: string;
  targetAudience: string;
  message: string;
  priority: 'NORMAL' | 'URGENT';
  createdBy: string;
  createdByName?: string;
  createdAt: number;
  expiresAt: number;
}

export interface DocumentRecord {
  id: string;
  companyId: string;
  departmentTag: string;
  title: string;
  documentUrl?: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  createdBy: string;
  createdByName?: string;
  createdAt: number;
  updatedAt: number;
  payload?: any;
}
`;

fs.writeFileSync(filePath, content + newTypes);
console.log('Types updated.');
