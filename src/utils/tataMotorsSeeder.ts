import { EmployeeRecord, UserRole } from '../types';
import { FirestoreService } from '../services/firestoreService';

const maleNames = ['Ramesh', 'Suresh', 'Prakash', 'Sunil', 'Anil', 'Nilesh', 'Pramod', 'Vijay', 'Sanjay', 'Rahul', 'Amit', 'Sachin', 'Deepak', 'Rajesh', 'Ravi', 'Ganesh', 'Kishore', 'Santosh'];
const femaleNames = ['Sunita', 'Anita', 'Kavita', 'Pooja', 'Sneha', 'Priya', 'Komal', 'Rutuja', 'Pranali', 'Swati', 'Neha', 'Rani', 'Gauri', 'Megha', 'Priyanka'];
const lastNames = ['Patil', 'Deshmukh', 'Joshi', 'Kulkarni', 'Pawar', 'Jadhav', 'Kadam', 'Kale', 'More', 'Shirke', 'Shinde', 'Thackeray', 'Bhosale', 'Rane', 'Chavan', 'Gaikwad', 'Kamble', 'Khandekar', 'Mane'];

const designations = [
  { title: 'Sweeper', role: 'GUARD' },
  { title: 'Helper', role: 'GUARD' },
  { title: 'Driver', role: 'GUARD' },
  { title: 'Fitter', role: 'GUARD' },
  { title: 'Technical', role: 'GUARD' },
  { title: 'Architecture Helper', role: 'GUARD' },
  { title: 'Safety Officer', role: 'FIELD_OFFICER' },
  { title: 'Junior Supervisor', role: 'FIELD_OFFICER' },
  { title: 'Supervisor', role: 'FIELD_OFFICER' },
  { title: 'Incharge', role: 'OPS_MANAGER' },
  { title: 'Site Incharge', role: 'OPS_MANAGER' },
  { title: 'Manager', role: 'OPS_MANAGER' },
  { title: 'HR', role: 'HR_ADMIN' },
  { title: 'Admin', role: 'COMPANY_ADMIN' },
  { title: 'Accountant', role: 'HR_ADMIN' },
  { title: 'Finance', role: 'HR_ADMIN' },
  { title: 'Purchase', role: 'HR_ADMIN' }
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function seedTataMotorsData(companyId: string, currentUserEmployeeId: string) {
  console.log('Starting seed for Tata Motors...');
  
  for (let i = 1; i <= 100; i++) {
    const isMale = Math.random() > 0.3; // 70% male, 30% female
    const firstName = isMale ? getRandom(maleNames) : getRandom(femaleNames);
    const lastName = getRandom(lastNames);
    const desigObj = getRandom(designations);
    
    const idStr = String(i).padStart(3, '0');
    const employeeId = `TATA${idStr}`;
    
    const emp = {
      id: `EMP-TATA-${idStr}`,
      employeeId: employeeId,
      companyId: companyId,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@tatamotors.com`,
      contactNumber: `98${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      dateOfBirth: `19${Math.floor(Math.random() * 20 + 70)}-0${Math.floor(Math.random() * 8 + 1)}-1${Math.floor(Math.random() * 8 + 1)}`,
      bloodGroup: getRandom(['A+', 'B+', 'O+', 'AB+', 'A-', 'O-']),
      gender: isMale ? 'MALE' : 'FEMALE',
      emergencyContact: {
        name: `Relative of ${firstName}`,
        relation: getRandom(['Father', 'Mother', 'Spouse', 'Brother']),
        phone: `99${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
      },
      assignedRegionId: 'REG-PUNE',
      assignedBranchId: 'BR-PCMC',
      assignedSiteId: 'SITE-MAIN',
      departmentId: desigObj.title.toUpperCase().replace(' ', '_'),
      designation: desigObj.title,
      status: 'ACTIVE',
      joinedDate: `202${Math.floor(Math.random() * 4)}-0${Math.floor(Math.random() * 8 + 1)}-1${Math.floor(Math.random() * 8 + 1)}`,
      employmentType: getRandom(['PERMANENT', 'CONTRACT', 'TEMPORARY']),
      role: desigObj.role as UserRole,
      pin: '1234', // For PIN mode login!
      documents: [],
      createdBy: currentUserEmployeeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any; // Cast as any because pin is an extra property

    // Save to Firestore
    const actor = { id: currentUserEmployeeId || 'SYSTEM', name: 'Seed Utility' };
    await FirestoreService.saveEmployee(companyId, emp, actor);
    console.log(`Saved ${i}/100: ${firstName} ${lastName} (${desigObj.title}) - ID: ${employeeId} PIN: 1234`);
  }
  
  console.log('Successfully seeded 100 employees for Tata Motors.');
}
