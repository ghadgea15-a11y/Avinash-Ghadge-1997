import { DeviceManufacturer, DeviceProtocol } from '../../types/biometric';
import { EsslConnector } from './connectors/EsslConnector';
import { FaceRecognitionConnector } from './connectors/FaceRecognitionConnector';
import { FingerprintConnector } from './connectors/FingerprintConnector';
import { GenericHttpConnector } from './connectors/GenericHttpConnector';
import { GenericRestConnector } from './connectors/GenericRestConnector';
import { GenericSdkConnector } from './connectors/GenericSdkConnector';
import { GenericTcpConnector } from './connectors/GenericTcpConnector';
import { HikvisionConnector } from './connectors/HikvisionConnector';
import { RfidCardConnector } from './connectors/RfidCardConnector';
import { UniversalDeviceConnector } from './connectors/UniversalDeviceConnector';
import { ZKTecoConnector } from './connectors/ZKTecoConnector';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, UniversalDeviceConnector> = new Map();

  private constructor() {
    this.registerDefaultConnectors();
  }

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  private registerDefaultConnectors(): void {
    const defaultList: UniversalDeviceConnector[] = [
      new ZKTecoConnector(),
      new EsslConnector(),
      new HikvisionConnector(),
      new GenericRestConnector(),
      new GenericHttpConnector(),
      new GenericTcpConnector(),
      new GenericSdkConnector(),
      new RfidCardConnector(),
      new FingerprintConnector(),
      new FaceRecognitionConnector()
    ];

    for (const connector of defaultList) {
      this.registerConnector(connector);
    }
  }

  /**
   * Register a custom connector plugin at runtime
   */
  public registerConnector(connector: UniversalDeviceConnector): void {
    this.connectors.set(connector.connectorId, connector);
  }

  /**
   * Get connector by its unique identifier
   */
  public getConnector(connectorId: string): UniversalDeviceConnector | undefined {
    return this.connectors.get(connectorId);
  }

  /**
   * Resolve best matching connector for a detected protocol or manufacturer
   */
  public resolveConnector(protocol: DeviceProtocol, manufacturer?: DeviceManufacturer): UniversalDeviceConnector | undefined {
    // 1. Exact protocol match
    for (const connector of this.connectors.values()) {
      if (connector.supportedProtocols.includes(protocol)) {
        if (manufacturer && connector.supportedManufacturer === manufacturer) {
          return connector;
        }
      }
    }

    // 2. Protocol fallback
    for (const connector of this.connectors.values()) {
      if (connector.supportedProtocols.includes(protocol)) {
        return connector;
      }
    }

    // 3. Manufacturer fallback
    if (manufacturer) {
      for (const connector of this.connectors.values()) {
        if (connector.supportedManufacturer === manufacturer) {
          return connector;
        }
      }
    }

    return undefined;
  }

  /**
   * List all currently registered device connectors with capabilities
   */
  public listAllConnectors(): Array<{
    connectorId: string;
    supportedManufacturer: DeviceManufacturer;
    supportedProtocols: DeviceProtocol[];
    defaultPort: number;
  }> {
    return Array.from(this.connectors.values()).map(c => ({
      connectorId: c.connectorId,
      supportedManufacturer: c.supportedManufacturer,
      supportedProtocols: c.supportedProtocols,
      defaultPort: c.defaultPort
    }));
  }
}
