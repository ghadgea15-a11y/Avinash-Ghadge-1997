const fs = require('fs');

let f1 = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

if (!f1.includes('saveHoliday')) {
    f1 = f1.replace("static async getHolidays", `  static async saveHoliday(companyId: string, holiday: any): Promise<boolean> {
    const id = holiday.id || \`HOL-\${Date.now()}\`;
    const ref = doc(db, 'companies', companyId || '', 'holidays', id);
    await setDoc(ref, {
      ...holiday,
      id,
      updatedAt: new Date().toISOString()
    });
    return true;
  }

  static async deleteHoliday(companyId: string, id: string): Promise<boolean> {
    const ref = doc(db, 'companies', companyId || '', 'holidays', id);
    await deleteDoc(ref);
    return true;
  }

  static async getHolidays`);
}

fs.writeFileSync('src/services/firestoreService.ts', f1);
