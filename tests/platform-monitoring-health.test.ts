import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../src/server/healthService';
import { SuperAdminService } from '../src/services/superAdminService';

describe('Point 1.6: Platform Monitoring & Health Check', () => {

  describe('1. Server-Side HealthService Telemetry', () => {
    it('formats uptime seconds into structured human-readable duration', () => {
      expect(HealthService.formatUptime(45)).toBe('45s');
      expect(HealthService.formatUptime(125)).toBe('2m 5s');
      expect(HealthService.formatUptime(3665)).toBe('1h 1m 5s');
      expect(HealthService.formatUptime(90061)).toBe('1d 1h 1m 1s');
    });

    it('collects live Node.js memory and system metrics with non-zero real values', async () => {
      const telemetry = await HealthService.getLiveTelemetry();

      expect(telemetry.status).toMatch(/ok|degraded|error/);
      expect(telemetry.service).toBe('Log Sheet Muster Backend Service');
      expect(telemetry.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(typeof telemetry.uptimeFormatted).toBe('string');

      // Real memory metrics
      expect(telemetry.memory.heapUsedMB).toBeGreaterThan(0);
      expect(telemetry.memory.heapTotalMB).toBeGreaterThan(0);
      expect(telemetry.memory.rssMB).toBeGreaterThan(0);
      expect(telemetry.memory.systemTotalMB).toBeGreaterThan(0);
      expect(telemetry.memory.heapUsagePercentage).toBeGreaterThan(0);

      // Real CPU metrics
      expect(telemetry.cpu.cores).toBeGreaterThanOrEqual(1);
      expect(typeof telemetry.cpu.model).toBe('string');
      expect(typeof telemetry.cpu.loadAverage1m).toBe('number');
      expect(typeof telemetry.cpu.loadAverage5m).toBe('number');
      expect(typeof telemetry.cpu.loadAverage15m).toBe('number');
      expect(telemetry.cpu.estimatedCpuUsagePercent).toBeGreaterThanOrEqual(0);

      // Process Info
      expect(telemetry.processInfo.pid).toBeGreaterThan(0);
      expect(telemetry.processInfo.nodeVersion).toMatch(/^v\d+/);
    });

    it('measures database round-trip ping time rather than static mock', async () => {
      const ping = await HealthService.pingDatabase();

      expect(typeof ping.connected).toBe('boolean');
      expect(['HEALTHY', 'DEGRADED', 'DOWN']).toContain(ping.status);
      expect(typeof ping.latencyMs).toBe('number');
      expect(ping.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('2. Client-Side Telemetry & Network Latency Probing', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('measures real client-to-server network roundtrip latency with performance.now()', async () => {
      // Mock global fetch to simulate a 35ms network round-trip delay
      const mockServerTelemetry = {
        status: 'ok',
        service: 'Log Sheet Muster Backend Service',
        uptimeSeconds: 1200,
        uptimeFormatted: '20m 0s',
        database: {
          connected: true,
          status: 'HEALTHY',
          latencyMs: 18
        },
        memory: {
          heapUsedMB: 45.2,
          heapTotalMB: 78.4,
          rssMB: 110.5,
          systemTotalMB: 16384,
          systemFreeMB: 8192,
          heapUsagePercentage: 57.6,
          systemUsagePercentage: 50.0
        },
        cpu: {
          cores: 4,
          model: 'AMD EPYC',
          loadAverage1m: 0.12,
          loadAverage5m: 0.20,
          loadAverage15m: 0.18,
          estimatedCpuUsagePercent: 2.1
        },
        processInfo: {
          nodeVersion: 'v20.18.0',
          pid: 1234,
          platform: 'linux'
        }
      };

      global.fetch = vi.fn().mockImplementation(async () => {
        // simulate small delay
        await new Promise(resolve => setTimeout(resolve, 25));
        return {
          ok: true,
          json: async () => mockServerTelemetry
        };
      });

      const metrics = await SuperAdminService.runPlatformHealthCheck();

      // Check that server telemetry is incorporated
      expect(metrics.serverTelemetry).toBeDefined();
      expect(metrics.serverTelemetry?.uptimeFormatted).toBe('20m 0s');
      expect(metrics.serverTelemetry?.database.latencyMs).toBe(18);

      // Check that network latency is measured (>= 20ms due to simulated delay)
      expect(metrics.serverTelemetry?.networkLatencyMs).toBeGreaterThanOrEqual(20);
      expect(metrics.avgLatencyMs).toBeGreaterThan(0);
    });

    it('fails gracefully if /api/health is temporarily unreachable without crashing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

      const metrics = await SuperAdminService.runPlatformHealthCheck();

      expect(metrics).toBeDefined();
      expect(metrics.firestoreLatencyMs).toBeGreaterThanOrEqual(0);
      expect(metrics.serverTelemetry).toBeUndefined();
    });
  });

});
