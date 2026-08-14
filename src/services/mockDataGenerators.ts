import { EmployeeRecord, UserRole } from '../types';

export function generateMockEmployees(): EmployeeRecord[] {
  const maleNames = ['Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Advik', 'Kabir', 'Riya', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Dhruv', 'Rudra', 'Aryan', 'Kian', 'Om'];
  const femaleNames = ['Aadhya', 'Kiara', 'Sara', 'Saanvi', 'Myra', 'Aarohi', 'Fatima', 'Zara', 'Pari', 'Prisha', 'Nysa', 'Meera', 'Sneha', 'Pooja', 'Priya', 'Kavya'];
  const lastNames = ['Patil', 'Deshmukh', 'Joshi', 'Kulkarni', 'Pawar', 'Jadhav', 'Kadam', 'Kale', 'More', 'Shirke', 'Shinde', 'Thackeray', 'Bhosale', 'Rane', 'Chavan', 'Gaikwad', 'Kamble', 'Khandekar', 'Mane', 'Nair', 'Shetty', 'Yadav', 'Rao', 'Singh'];

  function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const employees: EmployeeRecord[] = [];
  
  for (let i = 1; i <= 50; i++) {
    const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
    const firstName = gender === 'MALE' ? getRandomItem(maleNames) : getRandomItem(femaleNames);
    const lastName = getRandomItem(lastNames);
    const idStr = String(i).padStart(3, '0');
    const role: UserRole = getRandomItem(['GUARD', 'FIELD_OFFICER']);

    employees.push({
      id: `EMP-T-${idStr}`,
      employeeId: `EMP-${idStr}`,
      companyId: 'TEST-COMP',
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
      contactNumber: `98${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      dateOfBirth: `19${Math.floor(Math.random() * 20 + 70)}-0${Math.floor(Math.random() * 8 + 1)}-1${Math.floor(Math.random() * 8 + 1)}`,
      bloodGroup: getRandomItem(['A+', 'B+', 'O+', 'AB+', 'A-', 'O-']),
      gender,
      emergencyContact: {
        name: `Relative of ${firstName}`,
        relation: getRandomItem(['Father', 'Mother', 'Spouse', 'Brother']),
        phone: `99${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
      },
      assignedRegionId: 'REG-WEST',
      assignedBranchId: 'B-TEST',
      assignedSiteId: 'SITE-01',
      departmentId: getRandomItem(['DEPT-SEC', 'DEPT-HR', 'DEPT-OPS']),
      designation: getRandomItem(['Security Guard', 'Field Officer', 'Supervisor', 'Head Guard']),
      status: 'ACTIVE',
      joinedDate: `202${Math.floor(Math.random() * 5)}-0${Math.floor(Math.random() * 8 + 1)}-1${Math.floor(Math.random() * 8 + 1)}`,
      employmentType: getRandomItem(['PERMANENT', 'CONTRACT']),
      role,
      documents: [],
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return employees;
}
