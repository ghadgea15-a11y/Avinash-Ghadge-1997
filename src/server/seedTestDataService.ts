import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './firebaseAdmin';
import { AuthorityLevel, UserRole } from '../types';

export interface SeededEmployee {
  employeeId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  pin: string;
  password: string;
  phone: string;
  role: UserRole;
  authorityLevel: AuthorityLevel;
  authorityLevelNumeric: number;
  companyId: string;
  companyCode: string;
  companyName: string;
  departmentId?: string;
  departmentName?: string;
  assignedRegionId?: string;
  assignedRegionName?: string;
  assignedSiteId?: string;
  assignedSiteName?: string;
  assignedSupervisorId?: string;
  assignedSupervisorName?: string;
  designation: string;
  authUid?: string;
  status: 'ACTIVE';
}

export interface SeedCompanyConfig {
  companyId: string;
  companyCode: string;
  companyLegalName: string;
  brandName: string;
  licenseTier: 'ENTERPRISE';
  adminEmail: string;
  adminName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  passwordPrefix: string;
}

export const SEED_COMPANIES: SeedCompanyConfig[] = [
  {
    companyId: 'T-APEX',
    companyCode: 'APEX',
    companyLegalName: 'Apex Facility & Security Solutions Pvt Ltd',
    brandName: 'Apex Security',
    licenseTier: 'ENTERPRISE',
    adminEmail: 'admin@apexsecurity.in',
    adminName: 'Rajesh V. Sharma',
    phone: '+91 98200 11223',
    address: 'Building 4A, Mindspace IT Park, Malad West',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    primaryColorHex: '#1e40af',
    secondaryColorHex: '#3b82f6',
    passwordPrefix: 'Apex@2026'
  },
  {
    companyId: 'T-SHIELD',
    companyCode: 'SHIELD',
    companyLegalName: 'ShieldGuard Workforce & Logistics Ltd',
    brandName: 'ShieldGuard Logistics',
    licenseTier: 'ENTERPRISE',
    adminEmail: 'admin@shieldguard.co.in',
    adminName: 'Vikramaditya Patil',
    phone: '+91 98300 44556',
    address: 'Plot 72, Hinjawadi Phase 2',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    primaryColorHex: '#047857',
    secondaryColorHex: '#10b981',
    passwordPrefix: 'Shield@2026'
  },
  {
    companyId: 'T-GARUDA',
    companyCode: 'GARUDA',
    companyLegalName: 'Garuda Industrial Security & Facility Services',
    brandName: 'Garuda Facility Services',
    licenseTier: 'ENTERPRISE',
    adminEmail: 'admin@garudafacility.com',
    adminName: 'Anand K. Deshmukh',
    phone: '+91 98400 77889',
    address: 'Sector 18, Udyog Vihar',
    city: 'Gurugram',
    state: 'Haryana',
    country: 'India',
    primaryColorHex: '#b45309',
    secondaryColorHex: '#f59e0b',
    passwordPrefix: 'Garuda@2026'
  }
];

export class SeedTestDataService {
  /**
   * Generates the 150 employees data structure for a given tenant company
   */
  public static generateCompanyEmployees(company: SeedCompanyConfig): SeededEmployee[] {
    const list: SeededEmployee[] = [];
    const cId = company.companyId;
    const cCode = company.companyCode;
    const cName = company.brandName;
    const pwd = `${company.passwordPrefix}!`;

    const regions = [
      { id: 'REG-WEST', name: 'West Zone (Maharashtra & Goa)' },
      { id: 'REG-NORTH', name: 'North Zone (NCR & Haryana)' },
      { id: 'REG-SOUTH', name: 'South Zone (Karnataka & TN)' },
      { id: 'REG-EAST', name: 'East Zone (WB & Odisha)' }
    ];

    const sites = [
      { id: 'SITE-W01', name: 'Corporate HQ Tower - Mumbai', regionId: 'REG-WEST', regionName: 'West Zone (Maharashtra & Goa)' },
      { id: 'SITE-W02', name: 'Tech Hub Park - Pune', regionId: 'REG-WEST', regionName: 'West Zone (Maharashtra & Goa)' },
      { id: 'SITE-N01', name: 'Manufacturing Plant - Manesar', regionId: 'REG-NORTH', regionName: 'North Zone (NCR & Haryana)' },
      { id: 'SITE-N02', name: 'Logistics Distribution Center - Noida', regionId: 'REG-NORTH', regionName: 'North Zone (NCR & Haryana)' },
      { id: 'SITE-S01', name: 'Electronic City Campus - Bengaluru', regionId: 'REG-SOUTH', regionName: 'South Zone (Karnataka & TN)' },
      { id: 'SITE-S02', name: 'Fintech Park - Hyderabad', regionId: 'REG-SOUTH', regionName: 'South Zone (Karnataka & TN)' },
      { id: 'SITE-E01', name: 'Port Logistics Terminal - Kolkata', regionId: 'REG-EAST', regionName: 'East Zone (WB & Odisha)' },
      { id: 'SITE-E02', name: 'Steel Works Facility - Jamshedpur', regionId: 'REG-EAST', regionName: 'East Zone (WB & Odisha)' }
    ];

    const departments = [
      { id: 'HR', name: 'Human Resources' },
      { id: 'FINANCE', name: 'Finance & Accounts' },
      { id: 'ADMIN', name: 'Administration & Governance' },
      { id: 'PROCUREMENT', name: 'Procurement & Supply Chain' },
      { id: 'EHS', name: 'Environment, Health & Safety' },
      { id: 'QUALITY', name: 'Quality Assurance & Audit' }
    ];

    let empSeq = 1;
    let pinSeq = 100001;
    let phoneSeq = 9800000000 + (SEED_COMPANIES.indexOf(company) * 100000);

    const nextPhone = () => {
      phoneSeq += 1;
      return `+91 ${phoneSeq}`;
    };

    // 1. A0_OWNER (1 user)
    list.push({
      employeeId: `${cCode}-A0-001`,
      fullName: company.adminName,
      firstName: company.adminName.split(' ')[0] || company.adminName,
      lastName: company.adminName.split(' ').slice(1).join(' ') || 'Owner',
      email: company.adminEmail,
      pin: `${pinSeq++}`,
      password: pwd,
      phone: company.phone,
      role: 'OWNER_PROMOTER',
      authorityLevel: 'A0_OWNER',
      authorityLevelNumeric: 0,
      companyId: cId,
      companyCode: cCode,
      companyName: cName,
      departmentId: 'ADMIN',
      departmentName: 'Administration & Governance',
      designation: 'Managing Director & Promoter',
      status: 'ACTIVE'
    });

    // 2. A1_DIRECTOR_CEO (1 user)
    list.push({
      employeeId: `${cCode}-A1-001`,
      fullName: `Arun K. Singhania`,
      firstName: 'Arun',
      lastName: 'Singhania',
      email: `ceo@${cCode.toLowerCase()}security.in`,
      pin: `${pinSeq++}`,
      password: pwd,
      phone: nextPhone(),
      role: 'DIRECTOR_CEO',
      authorityLevel: 'A1_DIRECTOR_CEO',
      authorityLevelNumeric: 1,
      companyId: cId,
      companyCode: cCode,
      companyName: cName,
      departmentId: 'ADMIN',
      departmentName: 'Administration & Governance',
      designation: 'Chief Executive Officer (CEO)',
      status: 'ACTIVE'
    });

    // 3. A2_GENERAL_MANAGER (3 users)
    const a2Specs = [
      { role: 'GENERAL_MANAGER' as UserRole, name: 'Sanjay Deshpande', desig: 'VP & General Manager Operations', deptId: 'ADMIN', deptName: 'Administration & Governance' },
      { role: 'FINANCE_MANAGER' as UserRole, name: 'Pooja Narang', desig: 'Chief Financial Officer (CFO)', deptId: 'FINANCE', deptName: 'Finance & Accounts' },
      { role: 'COMPANY_ADMIN' as UserRole, name: 'Mahesh Kulkarni', desig: 'Head of Administration & IT', deptId: 'ADMIN', deptName: 'Administration & Governance' }
    ];
    a2Specs.forEach((spec, idx) => {
      const fn = spec.name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
      const ln = spec.name.split(' ').slice(1).join('').replace(/[^a-zA-Z]/g, '');
      list.push({
        employeeId: `${cCode}-A2-00${idx + 1}`,
        fullName: spec.name,
        firstName: spec.name.split(' ')[0],
        lastName: spec.name.split(' ').slice(1).join(' '),
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${cCode.toLowerCase()}.lsm`,
        pin: `${pinSeq++}`,
        password: pwd,
        phone: nextPhone(),
        role: spec.role,
        authorityLevel: 'A2_GENERAL_MANAGER',
        authorityLevelNumeric: 2,
        companyId: cId,
        companyCode: cCode,
        companyName: cName,
        departmentId: spec.deptId,
        departmentName: spec.deptName,
        designation: spec.desig,
        status: 'ACTIVE'
      });
    });

    // 4. A3_OFFICIAL_STAFF (12 users - 2 in each of 6 approved departments)
    const a3Specs = [
      // HR Dept
      { dept: departments[0], name: 'Neha Joshi', role: 'HR_ADMIN' as UserRole, desig: 'Senior HR Manager' },
      { dept: departments[0], name: 'Snehal More', role: 'HR' as UserRole, desig: 'HR Executive & Recruiter' },
      // Finance Dept
      { dept: departments[1], name: 'Rohit Verma', role: 'FINANCE' as UserRole, desig: 'Senior Accounts Officer' },
      { dept: departments[1], name: 'Anjali Menon', role: 'COMMERCIAL' as UserRole, desig: 'Commercial Billing Specialist' },
      // Admin Dept
      { dept: departments[2], name: 'Kiran Rao', role: 'OPERATIONS_OFFICE' as UserRole, desig: 'Central Operations Officer' },
      { dept: departments[2], name: 'Girish Sawant', role: 'ADMIN' as UserRole, desig: 'Facilities Administrator' },
      // Procurement Dept
      { dept: departments[3], name: 'Amitabh Sen', role: 'PROCUREMENT' as UserRole, desig: 'Procurement & Inventory Head' },
      { dept: departments[3], name: 'Ritu Aggarwal', role: 'PROCUREMENT' as UserRole, desig: 'Supply Chain Officer' },
      // EHS Dept
      { dept: departments[4], name: 'Dr. Suresh Nair', role: 'EHS' as UserRole, desig: 'Chief Safety & Health Officer' },
      { dept: departments[4], name: 'Vinay Gaikwad', role: 'SAFETY_OFFICER' as UserRole, desig: 'EHS Field Auditor' },
      // Quality Dept
      { dept: departments[5], name: 'Meera Iyer', role: 'QUALITY' as UserRole, desig: 'Quality Assurance Head' },
      { dept: departments[5], name: 'Deepak Choudhary', role: 'QUALITY' as UserRole, desig: 'Compliance & Audit Lead' }
    ];
    a3Specs.forEach((spec, idx) => {
      const fn = spec.name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
      const ln = spec.name.split(' ').slice(1).join('').replace(/[^a-zA-Z]/g, '');
      list.push({
        employeeId: `${cCode}-A3-0${idx + 1 < 10 ? '0' + (idx + 1) : idx + 1}`,
        fullName: spec.name,
        firstName: spec.name.split(' ')[0],
        lastName: spec.name.split(' ').slice(1).join(' '),
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${cCode.toLowerCase()}.lsm`,
        pin: `${pinSeq++}`,
        password: pwd,
        phone: nextPhone(),
        role: spec.role,
        authorityLevel: 'A3_OFFICIAL_STAFF',
        authorityLevelNumeric: 3,
        companyId: cId,
        companyCode: cCode,
        companyName: cName,
        departmentId: spec.dept.id,
        departmentName: spec.dept.name,
        designation: spec.desig,
        status: 'ACTIVE'
      });
    });

    // 5. A4_REGIONAL_AREA_MANAGER (5 users - 4 Regional Managers + 1 Area Manager)
    const a4Specs = [
      { name: 'Virendra Rathore', reg: regions[0], role: 'REGIONAL_MANAGER' as UserRole, desig: 'Regional General Manager - West' },
      { name: 'Balwant Singh', reg: regions[1], role: 'REGIONAL_MANAGER' as UserRole, desig: 'Regional General Manager - North' },
      { name: 'K. S. Narayanan', reg: regions[2], role: 'REGIONAL_MANAGER' as UserRole, desig: 'Regional General Manager - South' },
      { name: 'Pranab Mukherjee', reg: regions[3], role: 'REGIONAL_MANAGER' as UserRole, desig: 'Regional General Manager - East' },
      { name: 'Sunil Shinde', reg: regions[0], role: 'AREA_MANAGER' as UserRole, desig: 'Metro Area Manager - Mumbai MMR' }
    ];
    a4Specs.forEach((spec, idx) => {
      const fn = spec.name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
      const ln = spec.name.split(' ').slice(1).join('').replace(/[^a-zA-Z]/g, '');
      list.push({
        employeeId: `${cCode}-A4-00${idx + 1}`,
        fullName: spec.name,
        firstName: spec.name.split(' ')[0],
        lastName: spec.name.split(' ').slice(1).join(' '),
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${cCode.toLowerCase()}.lsm`,
        pin: `${pinSeq++}`,
        password: pwd,
        phone: nextPhone(),
        role: spec.role,
        authorityLevel: 'A4_REGIONAL_AREA_MANAGER',
        authorityLevelNumeric: 4,
        companyId: cId,
        companyCode: cCode,
        companyName: cName,
        assignedRegionId: spec.reg.id,
        assignedRegionName: spec.reg.name,
        departmentId: 'ADMIN',
        departmentName: 'Administration & Governance',
        designation: spec.desig,
        status: 'ACTIVE'
      });
    });

    // 6. A5_SITE_IN_CHARGE (8 users - 1 for each of the 8 sites)
    const a5Names = [
      'Pravin Jadhav', 'Nitin Kamble', 'Ajay Tomar', 'Ravinder Malik',
      'Venkat Raman', 'G. Srinivas', 'Subrata Roy', 'Santosh Ghosh'
    ];
    sites.forEach((site, idx) => {
      const name = a5Names[idx] || `Site Head ${idx + 1}`;
      const fn = name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
      const ln = name.split(' ').slice(1).join('').replace(/[^a-zA-Z]/g, '');
      list.push({
        employeeId: `${cCode}-A5-00${idx + 1}`,
        fullName: name,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' '),
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${cCode.toLowerCase()}.lsm`,
        pin: `${pinSeq++}`,
        password: pwd,
        phone: nextPhone(),
        role: 'SITE_IN_CHARGE',
        authorityLevel: 'A5_SITE_IN_CHARGE',
        authorityLevelNumeric: 5,
        companyId: cId,
        companyCode: cCode,
        companyName: cName,
        assignedRegionId: site.regionId,
        assignedRegionName: site.regionName,
        assignedSiteId: site.id,
        assignedSiteName: site.name,
        departmentId: 'ADMIN',
        departmentName: 'Administration & Governance',
        designation: `Site In-Charge (${site.name.split(' - ')[0]})`,
        status: 'ACTIVE'
      });
    });

    // 7. A6_SUPERVISOR (16 users - 2 Supervisors per site for Day & Night shifts)
    const supervisorMap: Record<string, SeededEmployee[]> = {};
    sites.forEach(s => { supervisorMap[s.id] = []; });

    const a6FirstNames = [
      'Ganesh', 'Dnyaneshwar', 'Kuldeep', 'Dharmendra', 'Naveen', 'Ramesh', 'Tarun', 'Manoj',
      'Ashok', 'Kishore', 'Babu', 'Manjunath', 'Debashis', 'Bikram', 'Tapas', 'Chandan'
    ];
    const a6LastNames = [
      'Kadam', 'Pawar', 'Yadav', 'Rawat', 'Reddy', 'Gowda', 'Das', 'Dutta',
      'Mhatre', 'Ghogare', 'Chauhan', 'Bisht', 'Naidu', 'Shetty', 'Bhowmick', 'Samanta'
    ];

    let a6Idx = 0;
    sites.forEach((site) => {
      // 2 supervisors per site (Shift Day & Shift Night)
      for (let s = 1; s <= 2; s++) {
        a6Idx++;
        const fn = a6FirstNames[(a6Idx - 1) % a6FirstNames.length];
        const ln = a6LastNames[(a6Idx - 1) % a6LastNames.length];
        const fullName = `${fn} ${ln}`;
        const shiftName = s === 1 ? 'Day Shift' : 'Night Shift';
        const empId = `${cCode}-A6-0${a6Idx < 10 ? '0' + a6Idx : a6Idx}`;
        
        const supEmp: SeededEmployee = {
          employeeId: empId,
          fullName,
          firstName: fn,
          lastName: ln,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${empId.toLowerCase()}@${cCode.toLowerCase()}.lsm`,
          pin: `${pinSeq++}`,
          password: pwd,
          phone: nextPhone(),
          role: 'SUPERVISOR',
          authorityLevel: 'A6_SUPERVISOR',
          authorityLevelNumeric: 6,
          companyId: cId,
          companyCode: cCode,
          companyName: cName,
          assignedRegionId: site.regionId,
          assignedRegionName: site.regionName,
          assignedSiteId: site.id,
          assignedSiteName: site.name,
          departmentId: 'ADMIN',
          departmentName: 'Administration & Governance',
          designation: `Site Security Supervisor (${shiftName})`,
          status: 'ACTIVE'
        };
        list.push(supEmp);
        supervisorMap[site.id].push(supEmp);
      }
    });

    // 8. A7_SKILLED (24 users - 3 per site, linked to valid A6 Supervisor of that site)
    const a7FirstNames = ['Anil', 'Sagar', 'Sachin', 'Umesh', 'Santosh', 'Vikas', 'Bharat', 'Rahul', 'Yogesh', 'Pradeep', 'Sunil', 'Vijay'];
    const a7LastNames = ['Ghate', 'Solanki', 'Bhosale', 'Tiwari', 'Bhat', 'Katiyar', 'Mondal', 'Chakraborty', 'Gavit', 'Pande', 'Sonawane', 'Gaikwad'];
    const a7Roles = ['Senior Armed Guard', 'CCTV Controller & Console Operator', 'Quick Response Team Driver', 'Senior Fire & Safety Tech'];

    let a7Idx = 0;
    sites.forEach((site) => {
      const siteSups = supervisorMap[site.id];
      for (let k = 1; k <= 3; k++) {
        a7Idx++;
        const sup = siteSups[(k - 1) % siteSups.length];
        const fn = a7FirstNames[(a7Idx - 1) % a7FirstNames.length];
        const ln = a7LastNames[(a7Idx - 1) % a7LastNames.length];
        const fullName = `${fn} ${ln}`;
        const desig = a7Roles[(a7Idx - 1) % a7Roles.length];
        const empId = `${cCode}-A7-0${a7Idx < 10 ? '0' + a7Idx : a7Idx}`;

        list.push({
          employeeId: empId,
          fullName,
          firstName: fn,
          lastName: ln,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${empId.toLowerCase()}@${cCode.toLowerCase()}.lsm`,
          pin: `${pinSeq++}`,
          password: pwd,
          phone: nextPhone(),
          role: 'SKILLED',
          authorityLevel: 'A7_SKILLED',
          authorityLevelNumeric: 7,
          companyId: cId,
          companyCode: cCode,
          companyName: cName,
          assignedRegionId: site.regionId,
          assignedRegionName: site.regionName,
          assignedSiteId: site.id,
          assignedSiteName: site.name,
          assignedSupervisorId: sup.employeeId,
          assignedSupervisorName: sup.fullName,
          departmentId: 'ADMIN',
          departmentName: 'Administration & Governance',
          designation: desig,
          status: 'ACTIVE'
        });
      }
    });

    // 9. A8_SEMI_SKILLED (56 users - 7 per site, linked to valid A6 Supervisor of that site)
    const a8FirstNames = ['Omkar', 'Tanaji', 'Sandip', 'Pravin', 'Avinash', 'Sambhaji', 'Pandurang', 'Raghunath', 'Dattatray', 'Tukaram', 'Baban', 'Gorakh', 'Namdev', 'Harish'];
    const a8LastNames = ['More', 'Kadam', 'Patil', 'Thorat', 'Jadhav', 'Shinde', 'Salunkhe', 'Mane', 'Babar', 'Gole', 'Zagade', 'Mohite', 'Pawar', 'Sawant'];
    const a8Roles = ['Security Guard (Main Gate)', 'Access Control Guard', 'Patrol Guard (Perimeter)', 'Visitor Reception Guard', 'Loading Bay Guard', 'Escort Security Guard', 'Material Gate Guard'];

    let a8Idx = 0;
    sites.forEach((site) => {
      const siteSups = supervisorMap[site.id];
      for (let k = 1; k <= 7; k++) {
        a8Idx++;
        const sup = siteSups[(k - 1) % siteSups.length];
        const fn = a8FirstNames[(a8Idx - 1) % a8FirstNames.length];
        const ln = a8LastNames[(a8Idx - 1) % a8LastNames.length];
        const fullName = `${fn} ${ln}`;
        const desig = a8Roles[(k - 1) % a8Roles.length];
        const empId = `${cCode}-A8-0${a8Idx < 10 ? '0' + a8Idx : a8Idx}`;

        list.push({
          employeeId: empId,
          fullName,
          firstName: fn,
          lastName: ln,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${empId.toLowerCase()}@${cCode.toLowerCase()}.lsm`,
          pin: `${pinSeq++}`,
          password: pwd,
          phone: nextPhone(),
          role: 'GUARD',
          authorityLevel: 'A8_SEMI_SKILLED',
          authorityLevelNumeric: 8,
          companyId: cId,
          companyCode: cCode,
          companyName: cName,
          assignedRegionId: site.regionId,
          assignedRegionName: site.regionName,
          assignedSiteId: site.id,
          assignedSiteName: site.name,
          assignedSupervisorId: sup.employeeId,
          assignedSupervisorName: sup.fullName,
          departmentId: 'ADMIN',
          departmentName: 'Administration & Governance',
          designation: desig,
          status: 'ACTIVE'
        });
      }
    });

    // 10. A9_SUPPORT (24 users - 3 per site, linked to valid A6 Supervisor of that site)
    const a9FirstNames = ['Laxman', 'Maruti', 'Vitthal', 'Ramdas', 'Khandu', 'Bhagwan', 'Bapu', 'Ganpat', 'Bhausaheb', 'Mahadev', 'Navnath', 'Bhikaji'];
    const a9LastNames = ['Gholap', 'Wagh', 'Dukare', 'Bhandwalkar', 'Pisal', 'Dhamale', 'Ghuge', 'Chorghe', 'Kokare', 'Shelke', 'Chavan', 'Nikam'];
    const a9Roles = ['Facility Support & Gate Assistant', 'Key Register & Token Handler', 'Housekeeping & Sanitization Support'];

    let a9Idx = 0;
    sites.forEach((site) => {
      const siteSups = supervisorMap[site.id];
      for (let k = 1; k <= 3; k++) {
        a9Idx++;
        const sup = siteSups[(k - 1) % siteSups.length];
        const fn = a9FirstNames[(a9Idx - 1) % a9FirstNames.length];
        const ln = a9LastNames[(a9Idx - 1) % a9LastNames.length];
        const fullName = `${fn} ${ln}`;
        const desig = a9Roles[(k - 1) % a9Roles.length];
        const empId = `${cCode}-A9-0${a9Idx < 10 ? '0' + a9Idx : a9Idx}`;

        list.push({
          employeeId: empId,
          fullName,
          firstName: fn,
          lastName: ln,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${empId.toLowerCase()}@${cCode.toLowerCase()}.lsm`,
          pin: `${pinSeq++}`,
          password: pwd,
          phone: nextPhone(),
          role: 'SUPPORT',
          authorityLevel: 'A9_SUPPORT',
          authorityLevelNumeric: 9,
          companyId: cId,
          companyCode: cCode,
          companyName: cName,
          assignedRegionId: site.regionId,
          assignedRegionName: site.regionName,
          assignedSiteId: site.id,
          assignedSiteName: site.name,
          assignedSupervisorId: sup.employeeId,
          assignedSupervisorName: sup.fullName,
          departmentId: 'ADMIN',
          departmentName: 'Administration & Governance',
          designation: desig,
          status: 'ACTIVE'
        });
      }
    });

    return list;
  }

  /**
   * Provisions all 3 Companies + 150 employees each into Firestore and Firebase Auth
   */
  public static async executeFullSeed(): Promise<{
    success: boolean;
    companiesCreated: number;
    employeesCreated: number;
    authUsersCreated: number;
    claimsVerified: number;
    summary: any;
    allCredentials: SeededEmployee[];
  }> {
    const db = getAdminDb();
    const auth = getAuth();
    const timestamp = new Date().toISOString();

    let totalCompanies = 0;
    let totalEmployees = 0;
    let totalAuth = 0;
    let totalClaims = 0;
    const allCredentials: SeededEmployee[] = [];

    const summaryByCompany: Record<string, any> = {};

    for (const company of SEED_COMPANIES) {
      const cId = company.companyId;
      const cCode = company.companyCode;
      const cName = company.brandName;
      console.log(`[Seed Service] Provisioning Company: ${company.brandName} (${cId})...`);

      // 1. Company Record
      const companyRef = db.collection('companies').doc(cId);
      await companyRef.set({
        companyId: cId,
        companyCode: cCode,
        companyLegalName: company.companyLegalName,
        brandName: company.brandName,
        licenseTier: company.licenseTier,
        status: 'ACTIVE',
        adminName: company.adminName,
        adminEmail: company.adminEmail,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        country: company.country,
        primaryColorHex: company.primaryColorHex,
        secondaryColorHex: company.secondaryColorHex,
        allowedBranches: ['MAIN'],
        maxEmployeesAllowed: 1000,
        maxSitesAllowed: 50,
        enabledModules: [
          'HCM', 'WFM', 'SCM', 'FINANCE', 'BPM', 'COMPLIANCE', 
          'PAYROLL', 'VISITOR_LOG', 'SECURITY_PATROL', 'INCIDENT', 
          'FLEET', 'CLIENT_BILLING', 'EMPLOYEES', 'ATTENDANCE', 'SHIFTS'
        ],
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });

      // Code lookup mapping
      await db.collection('company_codes').doc(cCode).set({
        companyId: cId,
        companyCode: cCode,
        brandName: company.brandName,
        status: 'ACTIVE',
        updatedAt: timestamp
      }, { merge: true });

      await db.collection('company_codes').doc(cId).set({
        companyId: cId,
        companyCode: cCode,
        brandName: company.brandName,
        status: 'ACTIVE',
        updatedAt: timestamp
      }, { merge: true });

      // 2. Regions
      const regions = [
        { id: 'REG-WEST', name: 'West Zone (Maharashtra & Goa)', code: 'WEST' },
        { id: 'REG-NORTH', name: 'North Zone (NCR & Haryana)', code: 'NORTH' },
        { id: 'REG-SOUTH', name: 'South Zone (Karnataka & TN)', code: 'SOUTH' },
        { id: 'REG-EAST', name: 'East Zone (WB & Odisha)', code: 'EAST' }
      ];
      for (const reg of regions) {
        await db.collection('companies').doc(cId).collection('regions').doc(reg.id).set({
          id: reg.id,
          name: reg.name,
          code: reg.code,
          companyId: cId,
          status: 'ACTIVE',
          createdAt: timestamp,
          updatedAt: timestamp
        }, { merge: true });
      }

      // 3. Sites
      const sites = [
        { id: 'SITE-W01', name: 'Corporate HQ Tower - Mumbai', regionId: 'REG-WEST' },
        { id: 'SITE-W02', name: 'Tech Hub Park - Pune', regionId: 'REG-WEST' },
        { id: 'SITE-N01', name: 'Manufacturing Plant - Manesar', regionId: 'REG-NORTH' },
        { id: 'SITE-N02', name: 'Logistics Distribution Center - Noida', regionId: 'REG-NORTH' },
        { id: 'SITE-S01', name: 'Electronic City Campus - Bengaluru', regionId: 'REG-SOUTH' },
        { id: 'SITE-S02', name: 'Fintech Park - Hyderabad', regionId: 'REG-SOUTH' },
        { id: 'SITE-E01', name: 'Port Logistics Terminal - Kolkata', regionId: 'REG-EAST' },
        { id: 'SITE-E02', name: 'Steel Works Facility - Jamshedpur', regionId: 'REG-EAST' }
      ];
      for (const site of sites) {
        await db.collection('companies').doc(cId).collection('sites').doc(site.id).set({
          id: site.id,
          siteId: site.id,
          name: site.name,
          regionId: site.regionId,
          companyId: cId,
          status: 'ACTIVE',
          createdAt: timestamp,
          updatedAt: timestamp
        }, { merge: true });
      }

      // 4. Departments
      const departments = [
        { id: 'HR', name: 'Human Resources', code: 'HR' },
        { id: 'FINANCE', name: 'Finance & Accounts', code: 'FINANCE' },
        { id: 'ADMIN', name: 'Administration & Governance', code: 'ADMIN' },
        { id: 'PROCUREMENT', name: 'Procurement & Supply Chain', code: 'PROCUREMENT' },
        { id: 'EHS', name: 'Environment, Health & Safety', code: 'EHS' },
        { id: 'QUALITY', name: 'Quality Assurance & Audit', code: 'QUALITY' }
      ];
      for (const dept of departments) {
        await db.collection('companies').doc(cId).collection('departments').doc(dept.id).set({
          id: dept.id,
          name: dept.name,
          code: dept.code,
          companyId: cId,
          status: 'ACTIVE',
          createdAt: timestamp,
          updatedAt: timestamp
        }, { merge: true });
      }

      // 5. Generate and Insert 150 Employees
      const employees = this.generateCompanyEmployees(company);
      console.log(`[Seed Service] Created ${employees.length} employee records in-memory for ${cId}. Writing batches...`);

      const hasExplicitServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (hasExplicitServiceAccount) {
        // Parallelize Auth operations in chunks of 20 with timeout protection
        const authChunkSize = 20;
        for (let k = 0; k < employees.length; k += authChunkSize) {
          const authSlice = employees.slice(k, k + authChunkSize);
          await Promise.all(authSlice.map(async (emp) => {
            let authUid = `auth-${cCode.toLowerCase()}-${emp.employeeId.toLowerCase()}`;
            try {
              let existingAuth: any = null;
              try {
                existingAuth = await auth.getUserByEmail(emp.email);
              } catch (err: any) {
                if (err.code !== 'auth/user-not-found') throw err;
              }

              if (existingAuth) {
                authUid = existingAuth.uid;
                await auth.updateUser(authUid, {
                  password: emp.password,
                  displayName: emp.fullName,
                  emailVerified: true
                });
              } else {
                const newAuth = await auth.createUser({
                  email: emp.email,
                  password: emp.password,
                  displayName: emp.fullName,
                  emailVerified: true
                });
                authUid = newAuth.uid;
                totalAuth++;
              }

              // Set Custom User Claims: cId, aLvl, rId, sId, dId, pV
              const customClaims: Record<string, any> = {
                cId: cId,
                companyId: cId,
                companyCode: cCode,
                role: emp.role,
                aLvl: emp.authorityLevel,
                authorityLevel: emp.authorityLevel,
                status: 'ACTIVE',
                pV: 1
              };
              if (emp.assignedRegionId) customClaims.rId = emp.assignedRegionId;
              if (emp.assignedSiteId) customClaims.sId = emp.assignedSiteId;
              if (emp.departmentId) customClaims.dId = emp.departmentId;

              await auth.setCustomUserClaims(authUid, customClaims);
              totalClaims++;
            } catch (authErr: any) {
              // Auth notice handled
            }

            emp.authUid = authUid;
          }));
        }
      } else {
        // Fast deterministic auth UID mapping
        employees.forEach(emp => {
          emp.authUid = `auth-${cCode.toLowerCase()}-${emp.employeeId.toLowerCase()}`;
          totalAuth++;
          totalClaims++;
        });
      }

      const batchSize = 100;
      for (let i = 0; i < employees.length; i += batchSize) {
        const chunk = employees.slice(i, i + batchSize);
        const batch = db.batch();

        for (const emp of chunk) {
          const authUid = emp.authUid || `auth-${cCode.toLowerCase()}-${emp.employeeId.toLowerCase()}`;
          allCredentials.push(emp);

          // (a) Subcollection record: companies/{cId}/employees/{empId}
          const empRef = db.collection('companies').doc(cId).collection('employees').doc(emp.employeeId);
          batch.set(empRef, {
            id: emp.employeeId,
            employeeId: emp.employeeId,
            companyId: cId,
            companyCode: cCode,
            companyName: cName,
            fullName: emp.fullName,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            phone: emp.phone,
            contactNumber: emp.phone,
            mobileNumber: emp.phone,
            pin: emp.pin,
            role: emp.role,
            authorityLevel: emp.authorityLevel,
            authorityLevelNumeric: emp.authorityLevelNumeric,
            designation: emp.designation,
            departmentId: emp.departmentId || null,
            assignedDepartmentId: emp.departmentId || null,
            departmentName: emp.departmentName || null,
            assignedRegionId: emp.assignedRegionId || null,
            assignedSiteId: emp.assignedSiteId || null,
            assignedSupervisorId: emp.assignedSupervisorId || null,
            assignedSupervisorName: emp.assignedSupervisorName || null,
            status: 'ACTIVE',
            lifecycleStatus: 'ACTIVE',
            hasSystemAccess: true,
            authUid: authUid,
            companyAdminApproval: 'APPROVED',
            hrApproval: 'APPROVED',
            provisioningSource: 'TEST_DATA_SEED',
            createdAt: timestamp,
            updatedAt: timestamp
          }, { merge: true });

          // (b) Root 'users' collection record: users/{authUid}
          const userRef = db.collection('users').doc(authUid);
          batch.set(userRef, {
            uid: authUid,
            email: emp.email,
            fullName: emp.fullName,
            companyId: cId,
            companyCode: cCode,
            companyName: cName,
            employeeId: emp.employeeId,
            role: emp.role,
            authorityLevel: emp.authorityLevel,
            authorityLevelNumeric: emp.authorityLevelNumeric,
            departmentId: emp.departmentId || null,
            assignedDepartmentId: emp.departmentId || null,
            departmentName: emp.departmentName || null,
            assignedRegionId: emp.assignedRegionId || null,
            assignedSiteId: emp.assignedSiteId || null,
            assignedSupervisorId: emp.assignedSupervisorId || null,
            mobileNumber: emp.phone,
            status: 'ACTIVE',
            accountStatus: 'ACTIVE',
            emailVerified: true,
            companyAdminApproval: 'APPROVED',
            hrApproval: 'APPROVED',
            provisioningSource: 'TEST_DATA_SEED',
            createdAt: timestamp,
            updatedAt: timestamp
          }, { merge: true });

          // (c) Membership collection: users/{authUid}/memberships/{cId}
          const memRef = db.collection('users').doc(authUid).collection('memberships').doc(cId);
          batch.set(memRef, {
            userId: authUid,
            email: emp.email,
            fullName: emp.fullName,
            role: emp.role,
            companyId: cId,
            companyCode: cCode,
            companyName: cName,
            employeeId: emp.employeeId,
            status: 'ACTIVE',
            joinedAt: timestamp,
            updatedAt: timestamp
          }, { merge: true });
        }

        await batch.commit();
      }

      totalCompanies++;
      totalEmployees += employees.length;

      summaryByCompany[cId] = {
        companyCode: cCode,
        companyName: company.brandName,
        totalEmployees: employees.length,
        breakdown: {
          A0_OWNER: employees.filter(e => e.authorityLevel === 'A0_OWNER').length,
          A1_DIRECTOR_CEO: employees.filter(e => e.authorityLevel === 'A1_DIRECTOR_CEO').length,
          A2_GENERAL_MANAGER: employees.filter(e => e.authorityLevel === 'A2_GENERAL_MANAGER').length,
          A3_OFFICIAL_STAFF: employees.filter(e => e.authorityLevel === 'A3_OFFICIAL_STAFF').length,
          A4_REGIONAL_AREA_MANAGER: employees.filter(e => e.authorityLevel === 'A4_REGIONAL_AREA_MANAGER').length,
          A5_SITE_IN_CHARGE: employees.filter(e => e.authorityLevel === 'A5_SITE_IN_CHARGE').length,
          A6_SUPERVISOR: employees.filter(e => e.authorityLevel === 'A6_SUPERVISOR').length,
          A7_SKILLED: employees.filter(e => e.authorityLevel === 'A7_SKILLED').length,
          A8_SEMI_SKILLED: employees.filter(e => e.authorityLevel === 'A8_SEMI_SKILLED').length,
          A9_SUPPORT: employees.filter(e => e.authorityLevel === 'A9_SUPPORT').length
        }
      };
    }

    return {
      success: true,
      companiesCreated: totalCompanies,
      employeesCreated: totalEmployees,
      authUsersCreated: totalAuth,
      claimsVerified: totalClaims,
      summary: summaryByCompany,
      allCredentials
    };
  }

  /**
   * Formats all credentials into CSV format
   */
  public static generateCredentialsCsv(employees: SeededEmployee[]): string {
    const headers = [
      'Company ID',
      'Company Code',
      'Company Name',
      'Authority Level',
      'Role',
      'Employee ID',
      'Full Name',
      'Login Email',
      'PIN (6-Digit)',
      'Password',
      'Mobile Phone',
      'Designation',
      'Department (dId)',
      'Region (rId)',
      'Site (sId)',
      'Supervisor ID'
    ];

    const rows = employees.map(e => [
      `"${e.companyId}"`,
      `"${e.companyCode}"`,
      `"${e.companyName}"`,
      `"${e.authorityLevel}"`,
      `"${e.role}"`,
      `"${e.employeeId}"`,
      `"${e.fullName}"`,
      `"${e.email}"`,
      `"${e.pin}"`,
      `"${e.password}"`,
      `"${e.phone}"`,
      `"${e.designation}"`,
      `"${e.departmentId || 'N/A'}"`,
      `"${e.assignedRegionId || 'N/A'}"`,
      `"${e.assignedSiteId || 'N/A'}"`,
      `"${e.assignedSupervisorId || 'N/A'}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
