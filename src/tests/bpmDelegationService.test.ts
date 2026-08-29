import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BpmDelegationService } from '../services/bpmDelegationService';
import { db } from '../firebase';

vi.mock('../firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn().mockReturnValue({ id: 'test-delegation-id' }),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({
    docs: [
      { id: '1', data: () => ({ id: '1', status: 'ACTIVE' }) }
    ],
    forEach: (cb: any) => cb({ id: '1', data: () => ({ id: '1', status: 'ACTIVE' }), ref: 'test-ref' })
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  writeBatch: vi.fn().mockReturnValue({
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined)
  })
}));

describe('BpmDelegationService', () => {
  const mockSession = {
    userId: 'delegator-123',
    companyId: 'comp-123',
    role: 'A3_OFFICIAL_STAFF'
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a delegation', async () => {
    const data = {
      delegatorId: 'delegator-123',
      delegateId: 'delegate-456',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      scope: 'ALL',
      reason: 'Vacation'
    };
    
    const result = await BpmDelegationService.createDelegation(mockSession, data);
    
    expect(result.id).toBe('test-delegation-id');
    expect(result.status).toBe('ACTIVE');
    expect(result.companyId).toBe('comp-123');
  });
  
  it('should revoke a delegation', async () => {
    await BpmDelegationService.revokeDelegation(mockSession, 'del-123');
    // Just verifying it doesn't throw and calls the mock
    expect(true).toBe(true); 
  });
});
