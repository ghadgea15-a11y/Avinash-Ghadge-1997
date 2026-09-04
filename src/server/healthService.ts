import os from 'os';
import { performance } from 'perf_hooks';
import { getAdminDb, hasAdminCredentials } from './firebaseAdmin';
import { ServerHealthTelemetry } from '../types/platform';

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = performance.now();

export class HealthService {
  /**
   * Helper to format uptime in seconds to human readable string
   */
  static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Perform live database ping to measure real round-trip Firestore latency
   */
  static async pingDatabase(): Promise<{
    connected: boolean;
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    latencyMs: number;
    error?: string;
  }> {
    const start = performance.now();
    try {
      if (!hasAdminCredentials()) {
        return {
          connected: false,
          status: 'DOWN',
          latencyMs: 0,
          error: 'Firebase Admin credentials not initialized'
        };
      }

      const db = getAdminDb();
      // Read a single document from system_config or companies collection
      await db.collection('companies').limit(1).get();
      const latencyMs = Math.round(performance.now() - start);

      return {
        connected: true,
        status: latencyMs > 350 ? 'DEGRADED' : 'HEALTHY',
        latencyMs: Math.max(1, latencyMs)
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        connected: false,
        status: 'DOWN',
        latencyMs,
        error: err?.message || 'Database connection error'
      };
    }
  }

  /**
   * Calculate real live process & OS telemetry (CPU, Memory, Uptime)
   */
  static async getLiveTelemetry(): Promise<ServerHealthTelemetry> {
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeFormatted = this.formatUptime(uptimeSeconds);

    // 1. Live Memory Analysis
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedSysMem = totalMem - freeMem;

    const memoryMetrics = {
      heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      externalMB: Math.round((mem.external / 1024 / 1024) * 100) / 100,
      systemTotalMB: Math.round(totalMem / 1024 / 1024),
      systemFreeMB: Math.round(freeMem / 1024 / 1024),
      heapUsagePercentage: Math.round((mem.heapUsed / mem.heapTotal) * 1000) / 10,
      systemUsagePercentage: Math.round((usedSysMem / totalMem) * 1000) / 10
    };

    // 2. Live CPU Analysis
    const now = performance.now();
    const timeDiffMs = now - lastCpuTime;
    const currentCpuUsage = process.cpuUsage(lastCpuUsage);
    
    // Total CPU time spent by user + system in ms
    const totalCpuTimeMs = (currentCpuUsage.user + currentCpuUsage.system) / 1000;
    const cpuCores = os.cpus().length || 1;
    
    // Percentage relative to elapsed real time across cores
    let estimatedCpuPercent = 0;
    if (timeDiffMs > 100) {
      estimatedCpuPercent = Math.min(100, Math.round((totalCpuTimeMs / (timeDiffMs * cpuCores)) * 1000) / 10);
      lastCpuUsage = process.cpuUsage();
      lastCpuTime = now;
    }

    const load = os.loadavg();
    const cpuMetrics = {
      cores: cpuCores,
      model: os.cpus()[0]?.model || 'Generic x86_64 / ARM',
      loadAverage1m: Math.round(load[0] * 100) / 100,
      loadAverage5m: Math.round(load[1] * 100) / 100,
      loadAverage15m: Math.round(load[2] * 100) / 100,
      processCpuUsage: {
        userMs: Math.round(currentCpuUsage.user / 1000),
        systemMs: Math.round(currentCpuUsage.system / 1000)
      },
      estimatedCpuUsagePercent: Math.max(0.1, estimatedCpuPercent)
    };

    // 3. Database Connectivity Ping
    const dbTelemetry = await this.pingDatabase();

    // 4. Overall Service Status
    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
    if (!dbTelemetry.connected) {
      overallStatus = 'error';
    } else if (dbTelemetry.status === 'DEGRADED' || memoryMetrics.heapUsagePercentage > 90) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      service: 'Log Sheet Muster Backend Service',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      uptimeFormatted,
      database: dbTelemetry,
      memory: memoryMetrics,
      cpu: cpuMetrics,
      processInfo: {
        nodeVersion: process.version,
        pid: process.pid,
        platform: process.platform
      }
    };
  }
}
