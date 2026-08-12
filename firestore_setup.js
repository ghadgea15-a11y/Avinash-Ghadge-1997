const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Ensure you have set the GOOGLE_APPLICATION_CREDENTIALS environment variable
// export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-file.json"
admin.initializeApp();

const db = admin.firestore();

async function setupDatabase() {
  try {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // 1. Root Collection: users
    const userRef = db.collection('users').doc('USER-001');
    await userRef.set({
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // users/memberships
    await userRef.collection('memberships').doc('MEM-001').set({
      companyId: 'COMP-001',
      role: 'Admin',
      status: 'Active',
      createdAt: timestamp
    });

    // 2. Root Collection: company_codes
    await db.collection('company_codes').doc('CODE-001').set({
      code: 'COMP-001',
      companyName: 'Acme Corp',
      createdAt: timestamp
    });

    // 3. Root Collection: companies
    const companyRef = db.collection('companies').doc('COMP-001');
    await companyRef.set({
      name: 'Acme Corporation',
      registrationNumber: 'ACME123456',
      industry: 'Manufacturing',
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // Organization
    await companyRef.collection('regions').doc('REG-001').set({
      name: 'North America',
      code: 'NA',
      createdAt: timestamp
    });
    
    await companyRef.collection('branches').doc('BR-001').set({
      name: 'New York HQ',
      regionId: 'REG-001',
      createdAt: timestamp
    });

    await companyRef.collection('sites').doc('SITE-001').set({
      name: 'Manhattan Office',
      branchId: 'BR-001',
      createdAt: timestamp
    });

    await companyRef.collection('departments').doc('DEPT-001').set({
      name: 'Human Resources',
      code: 'HR',
      createdAt: timestamp
    });

    await companyRef.collection('designations').doc('DES-001').set({
      title: 'HR Manager',
      departmentId: 'DEPT-001',
      createdAt: timestamp
    });

    // HRMS
    await companyRef.collection('employees').doc('EMP-001').set({
      userId: 'USER-001',
      employeeCode: 'E001',
      departmentId: 'DEPT-001',
      designationId: 'DES-001',
      status: 'Active',
      createdAt: timestamp
    });

    await companyRef.collection('roles').doc('ROLE-001').set({
      name: 'System Administrator',
      permissions: ['all'],
      createdAt: timestamp
    });

    await companyRef.collection('shifts').doc('SHIFT-001').set({
      name: 'General Shift',
      startTime: '09:00',
      endTime: '17:00',
      createdAt: timestamp
    });

    await companyRef.collection('attendance').doc('ATT-20260724-EMP-001').set({
      employeeId: 'EMP-001',
      date: '2026-07-24',
      checkIn: timestamp,
      status: 'Present',
      createdAt: timestamp
    });

    await companyRef.collection('leave_requests').doc('LEAVE-001').set({
      employeeId: 'EMP-001',
      type: 'Annual',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      status: 'Pending',
      createdAt: timestamp
    });

    await companyRef.collection('holidays').doc('HOL-001').set({
      name: 'New Year',
      date: '2027-01-01',
      createdAt: timestamp
    });

    // Payroll
    await companyRef.collection('payroll_profiles').doc('PAYP-001').set({
      employeeId: 'EMP-001',
      baseSalary: 75000,
      currency: 'USD',
      createdAt: timestamp
    });

    await companyRef.collection('payroll_runs').doc('PRUN-001').set({
      month: 7,
      year: 2026,
      status: 'Processing',
      createdAt: timestamp
    });

    await companyRef.collection('payslips').doc('PSLIP-001').set({
      payrollRunId: 'PRUN-001',
      employeeId: 'EMP-001',
      netPay: 5500,
      createdAt: timestamp
    });

    await companyRef.collection('salary_advances').doc('SADV-001').set({
      employeeId: 'EMP-001',
      amount: 1000,
      status: 'Approved',
      createdAt: timestamp
    });

    await companyRef.collection('expenses').doc('EXP-001').set({
      employeeId: 'EMP-001',
      amount: 250,
      category: 'Travel',
      status: 'Pending',
      createdAt: timestamp
    });

    // Inventory
    await companyRef.collection('inventory_items').doc('INV-001').set({
      name: 'Laptop',
      category: 'Electronics',
      stock: 50,
      createdAt: timestamp
    });

    await companyRef.collection('suppliers').doc('SUP-001').set({
      name: 'Tech Supplies Inc.',
      contact: 'sales@techsupplies.com',
      createdAt: timestamp
    });

    await companyRef.collection('purchase_orders').doc('PO-001').set({
      supplierId: 'SUP-001',
      totalAmount: 15000,
      status: 'Issued',
      createdAt: timestamp
    });

    await companyRef.collection('goods_receipts').doc('GR-001').set({
      purchaseOrderId: 'PO-001',
      receivedDate: timestamp,
      createdAt: timestamp
    });

    await companyRef.collection('stock_transactions').doc('TXN-001').set({
      itemId: 'INV-001',
      type: 'IN',
      quantity: 10,
      createdAt: timestamp
    });

    await companyRef.collection('stock_transfers').doc('ST-001').set({
      itemId: 'INV-001',
      fromSite: 'SITE-001',
      toSite: 'SITE-002',
      quantity: 5,
      createdAt: timestamp
    });

    await companyRef.collection('stock_audits').doc('AUD-001').set({
      siteId: 'SITE-001',
      auditDate: timestamp,
      status: 'Completed',
      createdAt: timestamp
    });

    await companyRef.collection('stock_adjustments').doc('ADJ-001').set({
      itemId: 'INV-001',
      quantityAdjusted: -2,
      reason: 'Damaged',
      createdAt: timestamp
    });

    // Billing
    await companyRef.collection('clients').doc('CLI-001').set({
      name: 'Global Tech',
      email: 'billing@globaltech.com',
      createdAt: timestamp
    });

    await companyRef.collection('invoices').doc('INVX-001').set({
      clientId: 'CLI-001',
      amount: 5000,
      status: 'Sent',
      createdAt: timestamp
    });

    await companyRef.collection('payments').doc('PAY-001').set({
      invoiceId: 'INVX-001',
      amount: 5000,
      method: 'Bank Transfer',
      createdAt: timestamp
    });

    // Operations
    await companyRef.collection('incident_reports').doc('INC-001').set({
      title: 'Network Outage',
      severity: 'High',
      status: 'Resolved',
      createdAt: timestamp
    });

    await companyRef.collection('visitor_logs').doc('VIS-001').set({
      visitorName: 'Alice Smith',
      purpose: 'Meeting',
      checkIn: timestamp,
      createdAt: timestamp
    });

    await companyRef.collection('material_movements').doc('MM-001').set({
      material: 'Office Supplies',
      gatePass: 'GP-001',
      status: 'Out',
      createdAt: timestamp
    });

    // Notifications
    await companyRef.collection('announcements').doc('ANN-001').set({
      title: 'Town Hall Meeting',
      content: 'Scheduled for next Friday.',
      createdAt: timestamp
    });

    await companyRef.collection('notifications').doc('NOT-001').set({
      userId: 'USER-001',
      message: 'Your leave request is approved.',
      read: false,
      createdAt: timestamp
    });

    // Settings
    await companyRef.collection('system_settings').doc('SET-001').set({
      theme: 'Dark',
      language: 'en',
      createdAt: timestamp
    });

    await companyRef.collection('audit_logs').doc('LOG-001').set({
      action: 'USER_LOGIN',
      userId: 'USER-001',
      timestamp: timestamp,
      createdAt: timestamp
    });

    console.log('Database Created Successfully');

  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase();
