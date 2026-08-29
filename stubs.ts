  static async getDocumentTypes(companyId: string): Promise<any[]> { return []; }
  static async saveDocumentType(companyId: string, data: any): Promise<boolean> { return true; }
  static async getEmployeeDocuments(companyId: string, employeeId: string): Promise<any[]> { return []; }
  static async saveEmployeeDocument(companyId: string, employeeId: string, data: any): Promise<boolean> { return true; }
  static async verifyDocument(companyId: string, docId: string, status: string, reviewer: any): Promise<boolean> { return true; }
  static subscribeToActiveSos(companyId: string, cb: (data: any[]) => void): () => void { cb([]); return () => {}; }
  static async triggerSos(companyId: string, data: any): Promise<boolean> { return true; }
  static async updateSosStatus(companyId: string, sosId: string, status: string, notes: string): Promise<boolean> { return true; }
  static async startTrackingSession(companyId: string, employeeId: string): Promise<string> { return 'session-id'; }
  static async endTrackingSession(companyId: string, sessionId: string): Promise<boolean> { return true; }
  static async recordGpsEvent(companyId: string, sessionId: string, data: any): Promise<boolean> { return true; }
  static async getSafetyChecksheets(companyId: string): Promise<any[]> { return []; }
