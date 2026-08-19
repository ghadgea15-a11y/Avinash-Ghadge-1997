import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeFirebaseAdmin, hasAdminCredentials } from './src/server/firebaseAdmin';
import { BpmEscalationAdminService } from './src/server/bpmEscalationAdminService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Firebase Admin SDK for privileged background operations
  initializeFirebaseAdmin();

  // ============================================================
  // HEALTH & STATUS ENDPOINTS
  // ============================================================
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Log Sheet Muster Backend Service',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================
  // BPM ESCALATION SERVER-AUTHORITATIVE ENDPOINTS
  // ============================================================
  
  // This endpoint is intended to be triggered by Google Cloud Scheduler
  app.post('/api/cron/bpm-escalation', async (req: Request, res: Response) => {
    try {
      // In production, add authorization check here (e.g. verify Cloud Scheduler OIDC token)
      const authHeader = req.headers.authorization;
      if (process.env.NODE_ENV === 'production' && !authHeader?.includes('Bearer')) {
        // Warning: Secure this route in actual production
      }

      const authoritativeTime = new Date();
      const result = await BpmEscalationAdminService.processAllPendingApprovalsGlobally(authoritativeTime);
      
      return res.json({
        success: true,
        mode: 'GLOBAL_BATCH',
        result,
        serverTimestamp: authoritativeTime.toISOString()
      });
    } catch (err: any) {
      console.error('[BPM Admin API] Processing error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to process escalation timers'
      });
    }
  });

  // Dedicated endpoint for authorized manual evaluation from the client (e.g. testing)
  app.post('/api/bpm/escalation/process', async (req: Request, res: Response) => {
    try {
      const { companyId } = req.body;
      const authoritativeTime = new Date();

      if (companyId) {
        const result = await BpmEscalationAdminService.processAllCompanyPendingApprovals(companyId, authoritativeTime);
        return res.json({
          success: true,
          mode: 'COMPANY_BATCH',
          result,
          serverTimestamp: authoritativeTime.toISOString()
        });
      } else {
        return res.status(400).json({ success: false, error: 'companyId is required for manual trigger' });
      }
    } catch (err: any) {
      console.error('[BPM Admin API] Processing error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to process escalation timers'
      });
    }
  });

  // ============================================================
  // VITE & FRONTEND STATIC SERVING
  // ============================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LSM Server] Enterprise Server running on http://0.0.0.0:${PORT}`);

    // Server-Authoritative Background Escalation Runner (Runs every 60s when Admin Service Account is configured)
    if (hasAdminCredentials()) {
      setInterval(async () => {
        try {
          await BpmEscalationAdminService.processAllPendingApprovalsGlobally();
        } catch (cronErr) {
          console.warn('[LSM Server Background Cron] Escalation check warning:', cronErr);
        }
      }, 60000);
      console.log('[LSM Server] Background BPM escalation runner active.');
    } else {
      console.log('[LSM Server] Background BPM escalation runner idle (no service account credential in env; client-side triggers active).');
    }
  });
}

startServer().catch(err => {
  console.error('[LSM Server] Fatal startup error:', err);
});
