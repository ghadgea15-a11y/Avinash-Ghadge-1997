import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BpmEscalationService } from '../services/bpmEscalationService';

// Mock dependencies
vi.mock('../firebase', () => ({
  db: {}
}));

const mockTransaction = {
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn()
};

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn().mockImplementation((db, ...pathSegments) => ({ path: pathSegments.join('/') })),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(true),
  deleteDoc: vi.fn().mockResolvedValue(true),
  serverTimestamp: vi.fn().mockReturnValue('mock-timestamp'),
  addDoc: vi.fn().mockResolvedValue({ id: 'mock-id' }),
  runTransaction: vi.fn().mockImplementation((db, callback) => callback(mockTransaction))
}));

describe('BpmEscalationService SLA & Escalation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Should trigger a reminder when approaching SLA deadline', async () => {
    const mockInstance = {
      id: 'inst-1',
      sourceModule: 'LEAVE',
      workflowId: 'wf-1',
      currentStepId: 'step-1',
      status: 'PENDING_APPROVAL',
      assignedAt: '2026-08-01T10:00:00.000Z',
      currentApprovers: ['EMP-1'],
      escalationPolicyId: 'pol-1'
    };

    const mockPolicy = {
      policyId: 'pol-1',
      reminderAfterMinutes: 60, // Reminder after 60 mins
      dueAfterMinutes: 120, // Deadline at 120 mins
      levels: [
        { level: 1, escalationAfterMinutes: 120, escalationTargetType: 'USER', targetUserId: 'MGR-1', reassignmentAllowed: true, notifyTarget: true }
      ],
      maximumEscalations: 1, active: true
    };

    // T = 65 minutes after assignment -> Should trigger reminder
    const authoritativeTime = new Date('2026-08-01T11:05:00.000Z');

    mockTransaction.get.mockImplementation(async (ref) => {
      console.log(ref.path); if (ref.path.includes('bpm_instances')) return { exists: () => true, data: () => mockInstance, ref };
      console.log(ref.path); if (ref.path.includes('bpm_escalation_policies')) return { exists: () => true, data: () => mockPolicy, ref };
      console.log(ref.path); if (ref.path.includes('bpm_escalation_events')) return { exists: () => false }; // Event not triggered yet
      return { exists: () => false };
    });

    const result = await BpmEscalationService.processInstanceTimers('COMP-A', 'inst-1', authoritativeTime);
    
    console.log(result.details); expect(result.evaluated).toBe(true);
    expect(result.actionsTaken.reminderSent).toBe(true);
    expect(result.actionsTaken.escalatedLevel).toBeUndefined();
    
    // Ensure the transaction saved the reminder event
    const eventSetCall = mockTransaction.set.mock.calls.find(call => call[0].path.includes('bpm_escalation_events') && call[0].path.includes('REMINDER'));
    expect(eventSetCall).toBeDefined();
    expect((eventSetCall as any[])[1].eventType).toBe('REMINDER');
  });

  it('2. Should escalate & reassign when SLA deadline is breached', async () => {
    const mockInstance = {
      id: 'inst-1',
      sourceModule: 'LEAVE',
      workflowId: 'wf-1',
      currentStepId: 'step-1',
      status: 'PENDING_APPROVAL',
      assignedAt: '2026-08-01T10:00:00.000Z',
      currentApprovers: ['EMP-1'],
      escalationPolicyId: 'pol-1',
      lastReminderAt: new Date('2026-08-01T11:05:00.000Z')
    };

    const mockPolicy = {
      policyId: 'pol-1',
      reminderAfterMinutes: 60,
      dueAfterMinutes: 120, 
      levels: [
        { level: 1, escalationAfterMinutes: 120, escalationTargetType: 'USER', targetUserId: 'MGR-1', reassignmentAllowed: true, notifyTarget: true }
      ],
      maximumEscalations: 1, active: true
    };

    // T = 125 minutes after assignment -> Should trigger escalation level 1 (which is also FINAL)
    const authoritativeTime = new Date('2026-08-01T12:05:00.000Z');

    mockTransaction.get.mockImplementation(async (ref) => {
      console.log(ref.path); if (ref.path.includes('bpm_instances')) return { exists: () => true, data: () => mockInstance, ref };
      console.log(ref.path); if (ref.path.includes('bpm_escalation_policies')) return { exists: () => true, data: () => mockPolicy, ref };
      console.log(ref.path); if (ref.path.includes('bpm_escalation_events')) return { exists: () => false }; 
      console.log(ref.path); if (ref.path.includes('employees')) return { exists: () => true, data: () => ({ id: 'MGR-1' }) }; // For target resolution
      return { exists: () => false };
    });

    const result = await BpmEscalationService.processInstanceTimers('COMP-A', 'inst-1', authoritativeTime);
    
    expect(result.actionsTaken.escalatedLevel).toBe(1);
    expect(result.actionsTaken.finalEscalation).toBe(true);
    expect(result.actionsTaken.reassigned).toBe(true); // Reassignment configured

    // Verify reassignment to MGR-1
    const instanceUpdateCall = mockTransaction.set.mock.calls.find(call => call[0].path.includes('bpm_instances/inst-1'));
    expect((instanceUpdateCall as any[])[1].currentApprovers).toContain('MGR-1');
    expect((instanceUpdateCall as any[])[1].currentApprovers).not.toContain('EMP-1');

    // Verify notification sent to MGR-1
    const notifCall = mockTransaction.set.mock.calls.find(call => call[0].path.includes('notifications') && call[0].path.includes('FINAL_ESCALATION'));
    expect(notifCall).toBeDefined();
    expect((notifCall as any[])[1].type).toBe('ALERT'); // Final escalation is CRITICAL/ALERT
  });
});
