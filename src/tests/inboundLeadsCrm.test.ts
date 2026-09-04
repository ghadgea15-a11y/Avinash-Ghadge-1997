import { describe, it, expect } from 'vitest';
import { FirestoreService } from '../services/firestoreService';
import { SuperAdminService } from '../services/superAdminService';
import { UserSession } from '../types';

describe('Point 1.11: Inbound Leads & Sales CRM Suite', () => {
  const mockSuperAdminSession: UserSession = {
    userId: 'super_admin_test_1',
    companyId: 'GLOBAL_ADMIN',
    role: 'SUPER_ADMIN',
    fullName: 'Chief Super Admin',
    email: 'admin@platform.com'
  };

  it('Test 1: Website/Demo Form submission creates a real lead document with status NEW', async () => {
    const demoLeadPayload = {
      id: `lead_demo_${Date.now()}`,
      name: 'Priya Sharma',
      company: 'Apex Security & Facility Services',
      email: 'priya@apexsecurity.com',
      phone: '+91 98200 12345',
      workforceSize: '50-200',
      interestedModules: 'Attendance, Muster, QR Patrol',
      source: 'WEBSITE_DEMO',
      message: 'Looking to digitize guard muster rolls across 12 client locations.'
    };

    const created = await FirestoreService.createLead(demoLeadPayload);
    expect(created).toBe(true);

    const savedLead = await FirestoreService.getLeadById(demoLeadPayload.id);
    expect(savedLead).not.toBeNull();
    expect(savedLead?.name).toBe('Priya Sharma');
    expect(savedLead?.company).toBe('Apex Security & Facility Services');
    expect(savedLead?.email).toBe('priya@apexsecurity.com');
    expect(savedLead?.status).toBe('NEW');
    expect(savedLead?.source).toBe('WEBSITE_DEMO');
    expect(savedLead?.activityHistory).toBeDefined();
    expect(savedLead?.activityHistory.length).toBeGreaterThan(0);
  });

  it('Test 2: Super Admin manually registers a sales lead via CRM', async () => {
    const manualLead = {
      id: `lead_manual_${Date.now()}`,
      name: 'Vikram Joshi',
      company: 'Zenith Logistics Hub',
      email: 'vikram@zenithlogistics.in',
      phone: '+91 91234 56789',
      workforceSize: '200-1000',
      interestedModules: 'Roster, Shift Management, Payroll',
      source: 'SUPER_ADMIN_MANUAL',
      notes: 'Met at Logistics Conclave 2025.'
    };

    const result = await SuperAdminService.createLead(mockSuperAdminSession, manualLead);
    expect(result).toBe(true);

    const lead = await SuperAdminService.getLeadById(manualLead.id);
    expect(lead).toBeDefined();
    expect(lead?.company).toBe('Zenith Logistics Hub');
    expect(lead?.status).toBe('NEW');
  });

  it('Test 3: Reading and subscribing to real-time leads collection', async () => {
    let capturedLeads: any[] = [];
    const unsub = FirestoreService.subscribeToLeads((list) => {
      capturedLeads = list;
    });

    expect(Array.isArray(capturedLeads)).toBe(true);
    expect(capturedLeads.length).toBeGreaterThan(0);

    const leadsList = await FirestoreService.getLeads();
    expect(leadsList.length).toBeGreaterThan(0);

    unsub();
  });

  it('Test 4: Status workflow transitions (NEW -> CONTACTED -> QUALIFIED -> DEMO)', async () => {
    const testLeadId = `lead_workflow_${Date.now()}`;
    await FirestoreService.createLead({
      id: testLeadId,
      name: 'Rohan Deshmukh',
      company: 'Sahyadri Facility Guard',
      email: 'rohan@sahyadri.org',
      phone: '+91 98888 11111',
      status: 'NEW'
    });

    // Move to CONTACTED
    await SuperAdminService.updateLeadStatus(mockSuperAdminSession, testLeadId, 'CONTACTED', 'Initial discovery call conducted');
    let lead = await FirestoreService.getLeadById(testLeadId);
    expect(lead?.status).toBe('CONTACTED');

    // Move to QUALIFIED
    await SuperAdminService.updateLeadStatus(mockSuperAdminSession, testLeadId, 'QUALIFIED', 'Budget and guard count confirmed');
    lead = await FirestoreService.getLeadById(testLeadId);
    expect(lead?.status).toBe('QUALIFIED');

    // Move to DEMO
    await SuperAdminService.updateLeadStatus(mockSuperAdminSession, testLeadId, 'DEMO', 'Live platform demo scheduled');
    lead = await FirestoreService.getLeadById(testLeadId);
    expect(lead?.status).toBe('DEMO');

    // Check activity history logs every step
    const actions = (lead?.activityHistory || []).map((a: any) => a.action);
    expect(actions).toContain('STATUS_CHANGE');
  });

  it('Test 5: Follow-up date and follow-up notes scheduling', async () => {
    const testLeadId = `lead_fu_${Date.now()}`;
    await FirestoreService.createLead({
      id: testLeadId,
      name: 'Anita Roy',
      company: 'Metro Infra Facilities',
      email: 'anita@metroinfra.co.in',
      phone: '+91 97777 22222',
      status: 'CONTACTED'
    });

    const targetDate = new Date(Date.now() + 86400000 * 2).toISOString();
    const followUpNote = 'Review enterprise compliance checklist with VP Operations';

    const success = await SuperAdminService.scheduleLeadFollowUp(
      mockSuperAdminSession,
      testLeadId,
      targetDate,
      followUpNote
    );
    expect(success).toBe(true);

    const updated = await FirestoreService.getLeadById(testLeadId);
    expect(updated?.followUpDate).toBe(targetDate);
    expect(updated?.followUpNotes).toBe(followUpNote);

    // Verify activity history contains FOLLOW_UP_SCHEDULED
    const fuActivity = (updated?.activityHistory || []).find((a: any) => a.action === 'FOLLOW_UP_SCHEDULED');
    expect(fuActivity).toBeDefined();
    expect(fuActivity?.notes).toContain('Follow-up set for');
  });

  it('Test 6: Internal notes and activity history timeline', async () => {
    const testLeadId = `lead_notes_${Date.now()}`;
    await FirestoreService.createLead({
      id: testLeadId,
      name: 'Sunil Verma',
      company: 'Titan Guarding Solutions',
      email: 'sunil@titanguard.com',
      phone: '+91 96666 33333',
      status: 'DEMO'
    });

    const note1 = 'Customer requested special pricing for 500+ security guards.';
    const note2 = 'Custom compliance report template shared with client.';

    await SuperAdminService.addLeadNote(mockSuperAdminSession, testLeadId, note1);
    await SuperAdminService.addLeadNote(mockSuperAdminSession, testLeadId, note2);

    const lead = await FirestoreService.getLeadById(testLeadId);
    expect(lead?.notes).toContain(note1);
    expect(lead?.notes).toContain(note2);

    const noteActivities = (lead?.activityHistory || []).filter((a: any) => a.action === 'NOTE_ADDED');
    expect(noteActivities.length).toBeGreaterThanOrEqual(2);
  });

  it('Test 7: Direct Lead to Tenant Conversion Shortcut provisions company & updates lead to CONVERTED', async () => {
    const testLeadId = `lead_convert_${Date.now()}`;
    const companyName = 'Garuda Facility Management Pvt Ltd';
    const tenantCode = `GARUDA-${Date.now().toString().slice(-4)}`;

    await FirestoreService.createLead({
      id: testLeadId,
      name: 'Rajesh Gokhale',
      company: companyName,
      email: 'rajesh@garudafm.com',
      phone: '+91 95555 44444',
      status: 'QUALIFIED'
    });

    // Execute direct conversion shortcut
    const result = await SuperAdminService.convertLeadToTenant(mockSuperAdminSession, {
      leadId: testLeadId,
      companyCode: tenantCode,
      companyName,
      subscriptionPlan: 'ENTERPRISE',
      trialDays: 21,
      adminEmail: 'admin@garudafm.com',
      adminName: 'Rajesh Gokhale',
      adminPhone: '+91 95555 44444',
      adminPassword: 'GarudaPass2025!'
    });

    expect(result.success).toBe(true);
    expect(result.companyId).toBe(tenantCode);

    // Verify lead record has been updated
    const convertedLead = await FirestoreService.getLeadById(testLeadId);
    expect(convertedLead?.status).toBe('CONVERTED');
    expect(convertedLead?.convertedCompanyId).toBe(tenantCode);
    expect(convertedLead?.convertedAt).toBeDefined();

    const conversionAct = (convertedLead?.activityHistory || []).find((a: any) => a.action === 'CONVERTED_TO_TENANT');
    expect(conversionAct).toBeDefined();

    // Verify provisioned company tenant
    const companies = await FirestoreService.getAllCompanies();
    const createdCompany = companies.find((c: any) => c.companyId === tenantCode);
    expect(createdCompany).toBeDefined();
    expect(createdCompany?.companyLegalName).toBe(companyName);
    expect(createdCompany?.trialDays).toBe(21);
    expect(createdCompany?.status).toBe('ACTIVE');
  });

  it('Test 8: Deleting a lead permanently removes it from CRM', async () => {
    const testLeadId = `lead_delete_${Date.now()}`;
    await FirestoreService.createLead({
      id: testLeadId,
      name: 'Spam Visitor',
      company: 'Spam Bot LLC',
      email: 'spam@bot.com',
      status: 'LOST'
    });

    expect(await FirestoreService.getLeadById(testLeadId)).not.toBeNull();

    const deleted = await SuperAdminService.deleteLead(mockSuperAdminSession, testLeadId);
    expect(deleted).toBe(true);

    const check = await FirestoreService.getLeadById(testLeadId);
    expect(check).toBeNull();
  });
});
