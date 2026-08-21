import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

const newTypes = `
export interface TrainingSessionRecord {
  id: string;
  companyId: string;
  programId: string;
  trainerId?: string;
  trainerName: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}
`;

content = content.replace('export interface TrainingEnrollmentRecord {', newTypes + '\nexport interface TrainingEnrollmentRecord {\n  sessionId?: string;');

fs.writeFileSync(file, content);
