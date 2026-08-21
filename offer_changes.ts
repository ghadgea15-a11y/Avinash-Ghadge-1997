export type OfferStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXTENDED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface OfferRecord {
  id: string;
  companyId: string;
  candidateId: string;
  requisitionId: string;
  offerCode: string;
  offeredDesignation: string;
  offeredSalaryMonthly: number;
  currency: string;
  benefits?: string[];
  joiningDate: string;
  status: OfferStatus;
  preparedBy: string;
  preparedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  candidateResponseAt?: string;
  rejectionReason?: string;
}
