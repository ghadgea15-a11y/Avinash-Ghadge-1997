import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  LandingPageConfig, 
  LandingPageVersionRecord, 
  DEFAULT_LANDING_PAGE_CONFIG 
} from '../types/landingPageEditor';
import { UserSession } from '../types';
import { SuperAdminService } from './superAdminService';
import { PlatformAuditLog } from '../types/platform';

const CONFIG_COLLECTION = 'landing_page_config';
const VERSIONS_COLLECTION = 'landing_page_versions';
const PUBLISHED_DOC_ID = 'published';
const DRAFT_DOC_ID = 'draft';

export class LandingPageEditorService {
  /**
   * Fetch the currently published landing page configuration.
   * If none exists yet, returns DEFAULT_LANDING_PAGE_CONFIG.
   */
  static async getPublishedConfig(): Promise<LandingPageConfig> {
    try {
      const docRef = doc(db, CONFIG_COLLECTION, PUBLISHED_DOC_ID);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<LandingPageConfig>;
        return this.mergeWithDefault(data, 'published');
      }
      return DEFAULT_LANDING_PAGE_CONFIG;
    } catch (err) {
      console.warn('[LandingPageEditorService] Error fetching published config, falling back to default:', err);
      return DEFAULT_LANDING_PAGE_CONFIG;
    }
  }

  /**
   * Fetch the current working draft configuration for Super Admin.
   * If no draft exists, defaults to the published config or DEFAULT_LANDING_PAGE_CONFIG.
   */
  static async getDraftConfig(): Promise<LandingPageConfig> {
    try {
      const draftRef = doc(db, CONFIG_COLLECTION, DRAFT_DOC_ID);
      const draftSnap = await getDoc(draftRef);
      if (draftSnap.exists()) {
        const data = draftSnap.data() as Partial<LandingPageConfig>;
        return this.mergeWithDefault(data, 'draft');
      }

      // If no draft exists, check published doc
      const published = await this.getPublishedConfig();
      return {
        ...published,
        id: 'draft',
        status: 'DRAFT'
      };
    } catch (err) {
      console.warn('[LandingPageEditorService] Error fetching draft config, using published/default:', err);
      return {
        ...DEFAULT_LANDING_PAGE_CONFIG,
        id: 'draft',
        status: 'DRAFT'
      };
    }
  }

  /**
   * Real-time subscription to published landing page configuration.
   * Used by public landing page and live preview windows.
   */
  static subscribeToPublishedConfig(callback: (config: LandingPageConfig) => void): () => void {
    const docRef = doc(db, CONFIG_COLLECTION, PUBLISHED_DOC_ID);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<LandingPageConfig>;
          callback(this.mergeWithDefault(data, 'published'));
        } else {
          callback(DEFAULT_LANDING_PAGE_CONFIG);
        }
      },
      (error) => {
        console.warn('[LandingPageEditorService] Listener error on published config, serving default:', error);
        callback(DEFAULT_LANDING_PAGE_CONFIG);
      }
    );
  }

  /**
   * Save working draft configuration.
   */
  static async saveDraftConfig(
    config: LandingPageConfig, 
    session: UserSession | null, 
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const updatedConfig: LandingPageConfig = {
        ...config,
        id: 'draft',
        status: 'DRAFT',
        updatedAt: now,
        updatedBy: {
          userId: session?.userId || auth.currentUser?.uid || 'superadmin',
          userName: session?.fullName || 'Super Administrator',
          userEmail: session?.email || auth.currentUser?.email || 'admin@logsheetmuster.com'
        }
      };

      const docRef = doc(db, CONFIG_COLLECTION, DRAFT_DOC_ID);
      await setDoc(docRef, updatedConfig);

      // Log platform audit
      await SuperAdminService.logPlatformAudit(session, {
        action: 'SAVE_LANDING_DRAFT',
        target: 'LANDING_PAGE_CMS',
        targetId: 'draft',
        reason: reason || 'Saved landing page draft changes',
        after: {
          headlineMain: updatedConfig.hero.headlineMain,
          brandColors: updatedConfig.theme,
          version: updatedConfig.version
        }
      });

      return { success: true };
    } catch (err: any) {
      console.error('[LandingPageEditorService] saveDraftConfig error:', err);
      return { success: false, error: err.message || 'Failed to save draft' };
    }
  }

  /**
   * Publish the draft configuration to live.
   * Bumps version number, creates version history snapshot, updates published doc, and writes audit log.
   */
  static async publishConfig(
    draftConfig: LandingPageConfig,
    session: UserSession | null,
    publishNotes?: string
  ): Promise<{ success: boolean; versionNumber?: number; error?: string }> {
    try {
      const now = new Date().toISOString();
      const currentPublished = await this.getPublishedConfig();
      const nextVersion = (currentPublished.version || 1) + 1;

      const userActor = {
        userId: session?.userId || auth.currentUser?.uid || 'superadmin',
        userName: session?.fullName || 'Super Administrator',
        userEmail: session?.email || auth.currentUser?.email || 'admin@logsheetmuster.com'
      };

      const publishedConfig: LandingPageConfig = {
        ...draftConfig,
        id: 'published',
        status: 'PUBLISHED',
        version: nextVersion,
        updatedAt: now,
        updatedBy: userActor
      };

      // 1. Save to landing_page_config/published
      const publishedRef = doc(db, CONFIG_COLLECTION, PUBLISHED_DOC_ID);
      await setDoc(publishedRef, publishedConfig);

      // 2. Also keep draft synchronized with published version
      const draftRef = doc(db, CONFIG_COLLECTION, DRAFT_DOC_ID);
      await setDoc(draftRef, {
        ...publishedConfig,
        id: 'draft',
        status: 'DRAFT'
      });

      // 3. Create historical version record for rollback
      const versionId = `v_${nextVersion}_${Date.now()}`;
      const versionRecord: LandingPageVersionRecord = {
        versionId,
        versionNumber: nextVersion,
        publishedAt: now,
        publishedBy: userActor,
        notes: publishNotes || `Published version ${nextVersion} to production`,
        configSnapshot: publishedConfig
      };

      const versionDocRef = doc(db, VERSIONS_COLLECTION, versionId);
      await setDoc(versionDocRef, versionRecord);

      // 4. Log to immutable Platform Audit Log
      await SuperAdminService.logPlatformAudit(session, {
        action: 'PUBLISH_LANDING_PAGE',
        target: 'LANDING_PAGE_CMS',
        targetId: publishedConfig.id,
        reason: publishNotes || `Published landing page design version ${nextVersion}`,
        before: {
          version: currentPublished.version,
          headline: currentPublished.hero.headlineMain
        },
        after: {
          version: nextVersion,
          headline: publishedConfig.hero.headlineMain,
          primaryColor: publishedConfig.theme.primaryColor,
          fontFamily: publishedConfig.theme.fontFamily
        }
      });

      return { success: true, versionNumber: nextVersion };
    } catch (err: any) {
      console.error('[LandingPageEditorService] publishConfig error:', err);
      return { success: false, error: err.message || 'Failed to publish landing page' };
    }
  }

  /**
   * List all published versions for inspection and rollback.
   */
  static async getVersions(): Promise<LandingPageVersionRecord[]> {
    try {
      const q = query(
        collection(db, VERSIONS_COLLECTION),
        orderBy('publishedAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const list: LandingPageVersionRecord[] = [];
      snap.forEach(d => {
        list.push(d.data() as LandingPageVersionRecord);
      });
      return list;
    } catch (err) {
      console.warn('[LandingPageEditorService] getVersions fallback:', err);
      // Fallback without ordering if index is building
      try {
        const snap = await getDocs(collection(db, VERSIONS_COLLECTION));
        const list: LandingPageVersionRecord[] = [];
        snap.forEach(d => list.push(d.data() as LandingPageVersionRecord));
        return list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      } catch (innerErr) {
        console.error('[LandingPageEditorService] getVersions error:', innerErr);
        return [];
      }
    }
  }

  /**
   * Rollback the live published landing page to an earlier version snapshot.
   */
  static async rollbackToVersion(
    versionId: string, 
    session: UserSession | null
  ): Promise<{ success: boolean; rolledBackConfig?: LandingPageConfig; error?: string }> {
    try {
      const versionDocRef = doc(db, VERSIONS_COLLECTION, versionId);
      const snap = await getDoc(versionDocRef);
      if (!snap.exists()) {
        return { success: false, error: 'Version record not found' };
      }

      const versionRecord = snap.data() as LandingPageVersionRecord;
      const snapshotConfig = versionRecord.configSnapshot;
      const now = new Date().toISOString();

      const userActor = {
        userId: session?.userId || auth.currentUser?.uid || 'superadmin',
        userName: session?.fullName || 'Super Administrator',
        userEmail: session?.email || auth.currentUser?.email || 'admin@logsheetmuster.com'
      };

      const restoredConfig: LandingPageConfig = {
        ...snapshotConfig,
        id: 'published',
        status: 'PUBLISHED',
        updatedAt: now,
        updatedBy: userActor
      };

      // 1. Write to published
      await setDoc(doc(db, CONFIG_COLLECTION, PUBLISHED_DOC_ID), restoredConfig);

      // 2. Also overwrite draft so editor stays in sync
      await setDoc(doc(db, CONFIG_COLLECTION, DRAFT_DOC_ID), {
        ...restoredConfig,
        id: 'draft',
        status: 'DRAFT'
      });

      // 3. Platform audit log
      await SuperAdminService.logPlatformAudit(session, {
        action: 'ROLLBACK_LANDING_PAGE',
        target: 'LANDING_PAGE_CMS',
        targetId: versionId,
        reason: `Rolled back landing page to version ${versionRecord.versionNumber} (${versionRecord.notes})`,
        after: {
          restoredVersion: versionRecord.versionNumber,
          restoredAt: now
        }
      });

      return { success: true, rolledBackConfig: restoredConfig };
    } catch (err: any) {
      console.error('[LandingPageEditorService] rollbackToVersion error:', err);
      return { success: false, error: err.message || 'Rollback failed' };
    }
  }

  /**
   * Reset current draft back to the current live published configuration.
   */
  static async resetDraftToPublished(session: UserSession | null): Promise<LandingPageConfig> {
    const published = await this.getPublishedConfig();
    const draftConfig: LandingPageConfig = {
      ...published,
      id: 'draft',
      status: 'DRAFT',
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, CONFIG_COLLECTION, DRAFT_DOC_ID), draftConfig);
    return draftConfig;
  }

  /**
   * Get Landing Page CMS Audit History from platform audit logs.
   */
  static async getCmsAuditLogs(): Promise<PlatformAuditLog[]> {
    try {
      const allLogs = await SuperAdminService.getPlatformAuditLogs({ limitCount: 100 });
      return allLogs.filter(log => 
        log.target === 'LANDING_PAGE_CMS' || 
        log.action === 'SAVE_LANDING_DRAFT' || 
        log.action === 'PUBLISH_LANDING_PAGE' || 
        log.action === 'ROLLBACK_LANDING_PAGE'
      );
    } catch (err) {
      console.warn('[LandingPageEditorService] getCmsAuditLogs error:', err);
      return [];
    }
  }

  /**
   * Helper to merge partially populated database records with default values
   * so missing fields never crash rendering.
   */
  private static mergeWithDefault(data: Partial<LandingPageConfig>, id: 'published' | 'draft'): LandingPageConfig {
    return {
      ...DEFAULT_LANDING_PAGE_CONFIG,
      ...data,
      id,
      seo: {
        ...DEFAULT_LANDING_PAGE_CONFIG.seo,
        ...(data.seo || {})
      },
      sectionOrder: data.sectionOrder || DEFAULT_LANDING_PAGE_CONFIG.sectionOrder,
      theme: {
        ...DEFAULT_LANDING_PAGE_CONFIG.theme,
        ...(data.theme || {})
      },
      header: {
        ...DEFAULT_LANDING_PAGE_CONFIG.header,
        ...(data.header || {})
      },
      hero: {
        ...DEFAULT_LANDING_PAGE_CONFIG.hero,
        ...(data.hero || {})
      },
      stats: {
        ...DEFAULT_LANDING_PAGE_CONFIG.stats,
        ...(data.stats || {})
      },
      sections: {
        ...DEFAULT_LANDING_PAGE_CONFIG.sections,
        ...(data.sections || {})
      },
      showcase: {
        ...DEFAULT_LANDING_PAGE_CONFIG.showcase,
        ...(data.showcase || {})
      },
      modules: {
        ...DEFAULT_LANDING_PAGE_CONFIG.modules,
        ...(data.modules || {})
      },
      industries: {
        ...DEFAULT_LANDING_PAGE_CONFIG.industries,
        ...(data.industries || {})
      },
      demo: {
        ...DEFAULT_LANDING_PAGE_CONFIG.demo,
        ...(data.demo || {})
      },
      about: {
        ...DEFAULT_LANDING_PAGE_CONFIG.about,
        ...(data.about || {})
      },
      security: {
        ...DEFAULT_LANDING_PAGE_CONFIG.security,
        ...(data.security || {})
      },
      faq: {
        ...DEFAULT_LANDING_PAGE_CONFIG.faq,
        ...(data.faq || {})
      },
      footer: {
        ...DEFAULT_LANDING_PAGE_CONFIG.footer,
        ...(data.footer || {})
      }
    };
  }
}
