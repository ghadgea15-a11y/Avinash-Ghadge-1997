export type EamAssetCategory = 
  | 'SECURITY_EQUIPMENT'
  | 'CCTV'
  | 'COMPUTER'
  | 'MOBILE_DEVICE'
  | 'FURNITURE'
  | 'ELECTRICAL_EQUIPMENT'
  | 'FIRE_SAFETY_EQUIPMENT'
  | 'VEHICLE'
  | 'TOOLS'
  | 'MACHINORY'
  | 'COMMUNICATION_EQUIPMENT'
  | 'UNIFORM_EQUIPMENT'
  | 'OTHER';

export type EamAssetStatus = 
  | 'AVAILABLE'
  | 'RESERVED'
  | 'DEPLOYED'
  | 'IN_CUSTODY'
  | 'UNDER_MAINTENANCE'
  | 'LOST'
  | 'DAMAGED'
  | 'RETURNED'
  | 'RETIRED';

export type EamAssetCondition = 
  | 'NEW'
  | 'GOOD'
  | 'FAIR'
  | 'DAMAGED'
  | 'CRITICAL'
  | 'UNUSABLE';

export type EamAssetCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EamAssetOwnershipType = 'OWNED' | 'LEASED' | 'CLIENT_PROVIDED';

export interface EamAssetRecord {
  id: string; // assetId
  assetCode: string;
  companyId: string;
  regionId?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  categoryId: EamAssetCategory;
  subCategoryId?: string;
  assetName: string;
  description?: string;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentStatus: EamAssetStatus;
  currentCustodianId?: string; // e.g. Employee ID, Department ID, Site ID
  currentLocationId?: string;
  ownershipType?: EamAssetOwnershipType;
  condition: EamAssetCondition;
  criticality?: EamAssetCriticality;
  warrantyReference?: string;
  
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type EamTransferStatus = 'TRANSFER_REQUESTED' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'COMPLETED' | 'REJECTED';

export interface EamAssetTransferRecord {
  id: string;
  assetId: string;
  companyId: string;
  fromLocationId?: string;
  toLocationId?: string;
  fromCustodianId?: string;
  toCustodianId?: string;
  
  requestedBy: string;
  requestedAt: string;
  reason?: string;
  
  approvedBy?: string;
  approvedAt?: string;
  
  dispatchedBy?: string;
  dispatchedAt?: string;
  
  receivedBy?: string;
  receivedAt?: string;
  conditionAtReceipt?: EamAssetCondition;
  receiptRemarks?: string;
  
  status: EamTransferStatus;
  
  createdAt: string;
  updatedAt: string;
}

export interface EamAssetCustodyRecord {
  id: string;
  assetId: string;
  companyId: string;
  
  fromCustodianId?: string;
  toCustodianId: string; // the assigned custodian
  
  fromLocationId?: string;
  toLocationId?: string;
  
  action: 'DEPLOYMENT' | 'ASSIGNMENT' | 'TRANSFER' | 'RETURN' | 'MAINTENANCE' | 'LOSS_REPORT' | 'DAMAGE_REPORT' | 'RETIREMENT';
  
  assignedBy: string;
  assignedAt: string;
  
  expectedReturnDate?: string;
  
  // Acknowledgement
  acknowledgementStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  acknowledgementTimestamp?: string;
  acknowledgementNote?: string;
  conditionAtAcknowledgement?: EamAssetCondition;
  
  reason?: string;
  evidenceUrls?: string[]; // array of storage URLs
  
  createdAt: string;
  updatedAt: string;
}
