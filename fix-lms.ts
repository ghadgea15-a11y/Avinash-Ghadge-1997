import * as fs from 'fs';

const file = 'src/services/learningManagementService.ts';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
  static async getEnrollments(companyId: string): Promise<TrainingEnrollmentRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'trainingEnrollments'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TrainingEnrollmentRecord);
    } catch (err) {
      console.error('[LMS] getEnrollments error:', err);
      return [];
    }
  }

}
`;

content = content.replace(/}\n\s*static async getEnrollments[\s\S]*?}\n\s*}/, replacement);
fs.writeFileSync(file, content);
