export class OfflineSyncService {
  private static online: boolean = navigator.onLine;
  private static subscribers: ((online: boolean) => void)[] = [];
  private static queue: any[] = [];

  static {
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));
  }

  static isOnline(): boolean {
    return this.online;
  }

  static getQueue(): any[] {
    return this.queue;
  }

  static subscribe(callback: (online: boolean) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  static async syncPendingQueue(): Promise<void> {
    if (!this.online || this.queue.length === 0) return;
    // Process queue here if needed
    this.queue = [];
  }

  static enqueue(operation: any): void {
    this.queue.push(operation);
    if (this.online) {
      this.syncPendingQueue();
    }
  }

  private static setOnline(status: boolean) {
    this.online = status;
    this.subscribers.forEach((cb) => cb(status));
    if (status) {
      this.syncPendingQueue();
    }
  }
}
