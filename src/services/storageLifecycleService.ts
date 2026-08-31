/**
 * GCP / Firebase Storage Lifecycle Service
 * 
 * Manages automated lifecycle management rules, retention policies, 
 * and orphan file cleanup routines for Enterprise SaaS Facility Management.
 */

export interface StorageLifecycleRule {
  id: string;
  name: string;
  targetPrefix: string[];
  retentionDays: number;
  action: 'Delete' | 'SetStorageClass';
  targetClass?: 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
  description: string;
  status: 'ACTIVE' | 'SCHEDULED';
}

export class StorageLifecycleService {
  /**
   * Returns enterprise storage lifecycle rules configured for the platform.
   */
  public static getLifecycleRules(): StorageLifecycleRule[] {
    return [
      {
        id: 'RULE-LFC-001',
        name: 'Temporary & Bulk Export Auto-Purge',
        targetPrefix: ['temp/', 'exports/', 'staging/', 'bulk-exports/', 'tmp/'],
        retentionDays: 30,
        action: 'Delete',
        description: 'Automatically purges temporary bulk export spreadsheets, zip archives, and upload staging files older than 30 days.',
        status: 'ACTIVE'
      },
      {
        id: 'RULE-LFC-002',
        name: 'Noncurrent / Orphaned Version Cleanup',
        targetPrefix: ['companies/*/employees/*/profile/', 'companies/*/candidates/*/photos/'],
        retentionDays: 30,
        action: 'Delete',
        description: 'Automatically deletes older, overwritten profile images and resume versions 30 days after replacement.',
        status: 'ACTIVE'
      },
      {
        id: 'RULE-LFC-003',
        name: 'Soft-Deleted Trash Purge',
        targetPrefix: ['deleted_archives/', 'trash/'],
        retentionDays: 60,
        action: 'Delete',
        description: 'Permanently destroys soft-deleted documents, retired badges, and archived incident records after 60-day recovery window.',
        status: 'ACTIVE'
      },
      {
        id: 'RULE-LFC-004',
        name: 'Cold Tier Archival Optimization',
        targetPrefix: ['companies/'],
        retentionDays: 90,
        action: 'SetStorageClass',
        targetClass: 'NEARLINE',
        description: 'Transitions historical operational records, invoices, and old incident evidence to Nearline storage after 90 days to reduce storage costs by up to 50%.',
        status: 'ACTIVE'
      }
    ];
  }

  /**
   * Generates standard GCP Cloud Storage JSON policy object.
   */
  public static getGcpLifecyclePolicyJson(): Record<string, any> {
    return {
      lifecycle: {
        rule: [
          {
            action: { type: 'Delete' },
            condition: {
              age: 30,
              matchesPrefix: ['temp/', 'exports/', 'staging/', 'bulk-exports/', 'tmp/']
            }
          },
          {
            action: { type: 'Delete' },
            condition: {
              daysSinceNoncurrentTime: 30,
              numNewerVersions: 1,
              isLive: false
            }
          },
          {
            action: { type: 'Delete' },
            condition: {
              age: 60,
              matchesPrefix: ['deleted_archives/', 'trash/']
            }
          },
          {
            action: { type: 'SetStorageClass', storageClass: 'NEARLINE' },
            condition: {
              age: 90,
              matchesPrefix: ['companies/']
            }
          }
        ]
      }
    };
  }
}
