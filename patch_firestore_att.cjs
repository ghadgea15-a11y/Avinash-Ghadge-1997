const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const stubs = `  static async punchIn(...args: any[]): Promise<{success: boolean, message: string, record?: any}> { return { success: true, message: "" }; }
  static async punchOut(...args: any[]): Promise<{success: boolean, message: string, record?: any}> { return { success: true, message: "" }; }
  static async saveRoster(...args: any[]): Promise<boolean> { return true; }
  static async deleteRoster(...args: any[]): Promise<boolean> { return true; }
  static async bulkSaveRosters(...args: any[]): Promise<boolean> { return true; }
  static async saveShift(...args: any[]): Promise<boolean> { return true; }
  static async deleteShift(...args: any[]): Promise<boolean> { return true; }
  static async saveAttendance(...args: any[]): Promise<boolean> { return true; }
  static async getRostersByDate(...args: any[]): Promise<any> { return []; }
  static async getAttendanceById(...args: any[]): Promise<any> { return []; }
  static async updateShiftStatus(...args: any[]): Promise<boolean> { return true; }
  static async checkDuplicateShiftCode(...args: any[]): Promise<boolean> { return true; }
  static async getAttendanceLogs(...args: any[]): Promise<any> { return []; }
  static async createApprovalRequest(...args: any[]): Promise<boolean> { return true; }`;

const newCode = `  static async punchIn(companyId: string, employeeId: string, employeeName: string, rosterId: string, shiftId: string, siteId: string, siteName: string, gpsPayload: any, verifyMethod: string, selfieUrl?: string, temperature?: string, isOverride?: boolean, overrideReason?: string): Promise<{success: boolean, message: string, record?: any}> {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      
      // Duplicate punch prevention
      const attQuery = query(collection(db, 'companies', companyId, 'attendance'), where('employeeId', '==', employeeId), where('date', '==', todayDate));
      const existSnap = await getDocs(attQuery);
      if (!existSnap.empty && existSnap.docs[0].data().checkInTime) {
        return { success: false, message: 'You have already punched in today.' };
      }
      
      const recordId = existSnap.empty ? \`ATT-\${employeeId}-\${todayDate}\` : existSnap.docs[0].id;
      
      const attRecord = {
        id: recordId,
        companyId,
        employeeId,
        employeeName,
        date: todayDate,
        attendanceDate: todayDate,
        checkInTime: new Date().toISOString(),
        checkInGps: gpsPayload,
        checkInSelfie: selfieUrl || null,
        status: 'PRESENT', // Baseline, rules will adjust
        siteId,
        siteName,
        shiftId,
        verifyMethod,
        isOverride: !!isOverride,
        overrideReason: overrideReason || null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        workedMinutes: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        overtimeMinutes: 0
      };
      
      await setDoc(doc(db, 'companies', companyId, 'attendance', recordId), attRecord, { merge: true });
      return { success: true, message: 'Punch-In Successful', record: attRecord };
    } catch(err) {
      console.error(err);
      return { success: false, message: 'Punch-In Failed' };
    }
  }

  static async punchOut(companyId: string, rosterId: string, employeeId: string, gpsPayload: any, isOverride?: boolean, overrideReason?: string): Promise<{success: boolean, message: string, record?: any}> {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const attQuery = query(collection(db, 'companies', companyId, 'attendance'), where('employeeId', '==', employeeId), where('date', '==', todayDate));
      const existSnap = await getDocs(attQuery);
      
      if (existSnap.empty) {
        return { success: false, message: 'No Punch-In record found for today.' };
      }
      
      const record = existSnap.docs[0];
      const data = record.data();
      if (data.checkOutTime) {
        return { success: false, message: 'You have already punched out today.' };
      }
      
      const checkInTime = new Date(data.checkInTime);
      const checkOutTime = new Date();
      const workedMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
      
      await updateDoc(doc(db, 'companies', companyId, 'attendance', record.id), {
        checkOutTime: checkOutTime.toISOString(),
        checkOutGps: gpsPayload,
        workedMinutes,
        updatedAt: checkOutTime.toISOString()
      });
      return { success: true, message: 'Punch-Out Successful' };
    } catch(err) {
      console.error(err);
      return { success: false, message: 'Punch-Out Failed' };
    }
  }

  static async saveAttendance(companyId: string, data: any): Promise<boolean> {
    try {
      if (!data.id) data.id = \`ATT-\${data.employeeId}-\${Date.now()}\`;
      if (!data.date) data.date = new Date().toISOString().split('T')[0];
      
      const attRef = doc(db, 'companies', companyId, 'attendance', data.id);
      await setDoc(attRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  static async getAttendanceLogs(userSession: any, companyId: string, dateStr: string): Promise<any[]> {
    try {
      let q = query(collection(db, 'companies', companyId, 'attendance'), where('date', '==', dateStr));
      
      // Scope based on roles
      if (userSession.roles && !userSession.roles.includes('COMPANY_ADMIN') && !userSession.roles.includes('SUPER_ADMIN')) {
         if (userSession.roles.includes('SUPERVISOR')) {
            // Supervisors see their site
            // This is basic mapping. Ideally filter by siteId matching assigned site.
         } else {
            // Employees see only themselves
            q = query(collection(db, 'companies', companyId, 'attendance'), where('date', '==', dateStr), where('employeeId', '==', userSession.employeeId || userSession.userId));
         }
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(err) {
      console.error(err);
      return [];
    }
  }

  static async createApprovalRequest(companyId: string, request: any): Promise<boolean> {
    try {
      const reqRef = doc(collection(db, 'companies', companyId, 'approval_requests'));
      await setDoc(reqRef, { ...request, id: reqRef.id, createdAt: new Date().toISOString(), status: 'PENDING' });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  static async saveRoster(...args: any[]): Promise<boolean> { return true; }
  static async deleteRoster(...args: any[]): Promise<boolean> { return true; }
  static async bulkSaveRosters(...args: any[]): Promise<boolean> { return true; }
  static async saveShift(...args: any[]): Promise<boolean> { return true; }
  static async deleteShift(...args: any[]): Promise<boolean> { return true; }
  static async getRostersByDate(...args: any[]): Promise<any> { return []; }
  static async getAttendanceById(...args: any[]): Promise<any> { return []; }
  static async updateShiftStatus(...args: any[]): Promise<boolean> { return true; }
  static async checkDuplicateShiftCode(...args: any[]): Promise<boolean> { return true; }`;

code = code.replace(stubs, newCode);
fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('patched firestoreService for attendance');
