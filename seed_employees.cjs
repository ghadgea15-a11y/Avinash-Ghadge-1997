const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp({
  projectId: config.projectId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
});

const db = getFirestore(app);

const maleNames = ['Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Advik', 'Kabir', 'Riya', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Dhruv', 'Rudra', 'Aryan', 'Kian', 'Om'];
const femaleNames = ['Aadhya', 'Kiara', 'Sara', 'Saanvi', 'Myra', 'Aarohi', 'Fatima', 'Zara', 'Pari', 'Prisha', 'Nysa', 'Meera', 'Sneha', 'Pooja', 'Priya', 'Kavya'];
const lastNames = ['Patil', 'Deshmukh', 'Joshi', 'Kulkarni', 'Pawar', 'Jadhav', 'Kadam', 'Kale', 'More', 'Shirke', 'Shinde', 'Thackeray', 'Bhosale', 'Rane', 'Chavan', 'Gaikwad', 'Kamble', 'Khandekar', 'Mane', 'Nair', 'Shetty', 'Yadav', 'Rao', 'Singh'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const generateEmployee = (i) => {
  const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
  const firstName = gender === 'MALE' ? getRandomItem(maleNames) : getRandomItem(femaleNames);
  const lastName = getRandomItem(lastNames);
  const idStr = String(i).padStart(3, '0');
  
  return {
    id: `EMP-T-${idStr}`,
    employeeId: `EMP-${idStr}`,
    companyId: 'TEST-COMP',
    firstName,
    lastName,
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
    role: getRandomItem(['GUARD', 'FIELD_OFFICER']),
    documents: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

async function seed() {
  const batch1 = writeBatch(db);
  const batch2 = writeBatch(db);
  
  for (let i = 1; i <= 50; i++) {
    const emp = generateEmployee(i);
    const docRef = doc(collection(db, 'companies/TEST-COMP/employees'), emp.id);
    if (i <= 25) batch1.set(docRef, emp);
    else batch2.set(docRef, emp);
  }
  
  await batch1.commit();
  await batch2.commit();
  console.log('Seeded 50 employees successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
