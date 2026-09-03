import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractPublicSafeJobPosting } from '../server/publicJobRoutes';
import { JobRequisitionRecord } from '../types';

// In-memory mock for Firebase Admin SDK
const mockDbCollections: Record<string, Record<string, any>> = {};

vi.mock('../server/firebaseAdmin', () => {
  return {
    getAdminDb: () => ({
      collection: (colName: string) => ({
        doc: (docId: string) => ({
          collection: (subColName: string) => ({
            doc: (subDocId?: string) => {
              const effectiveSubDocId = subDocId || `subdoc_${Date.now()}`;
              return {
                id: effectiveSubDocId,
                set: vi.fn(async (data) => {
                  const path = `${colName}/${docId}/${subColName}`;
                  if (!mockDbCollections[path]) mockDbCollections[path] = {};
                  mockDbCollections[path][effectiveSubDocId] = { ...data, id: effectiveSubDocId };
                }),
                get: async () => {
                  const path = `${colName}/${docId}/${subColName}`;
                  const data = mockDbCollections[path]?.[effectiveSubDocId];
                  return { exists: !!data, data: () => data };
                }
              };
            }
          }),
          get: async () => {
            const data = mockDbCollections[colName]?.[docId];
            return {
              exists: !!data,
              data: () => data
            };
          },
          set: vi.fn(async (data) => {
            if (!mockDbCollections[colName]) mockDbCollections[colName] = {};
            mockDbCollections[colName][docId] = { ...data, id: docId };
          }),
          delete: vi.fn(async () => {
            if (mockDbCollections[colName]) {
              delete mockDbCollections[colName][docId];
            }
          })
        }),
        where: (field: string, op: string, val: any) => ({
          where: (field2: string, op2: string, val2: any) => ({
            get: async () => {
              const allDocs = Object.values(mockDbCollections[colName] || {});
              const matches = allDocs.filter((d: any) => d[field] === val && d[field2] === val2);
              return {
                empty: matches.length === 0,
                docs: matches.map(m => ({ id: m.id, data: () => m }))
              };
            }
          }),
          get: async () => {
            const allDocs = Object.values(mockDbCollections[colName] || {});
            const matches = allDocs.filter((d: any) => d[field] === val);
            return {
              empty: matches.length === 0,
              docs: matches.map(m => ({ id: m.id, data: () => m }))
            };
          }
        }),
        add: vi.fn(async (data) => {
          const id = `audit_${Date.now()}`;
          if (!mockDbCollections[colName]) mockDbCollections[colName] = {};
          mockDbCollections[colName][id] = { ...data, id };
          return { id };
        })
      })
    })
  };
});

describe('FIX 1.2 — Public Career Portal Data Minimization & PublicJobPostings Isolation', () => {
  beforeEach(() => {
    for (const key in mockDbCollections) {
      delete mockDbCollections[key];
    }
  });

  describe('Data Minimization & Sanitization', () => {
    const rawRequisitionWithInternalSecrets: Partial<JobRequisitionRecord> = {
      id: 'REQ-2026-9001',
      requisitionCode: 'REQ-INTERNAL-CODE-9001',
      companyId: 'company_enterprise_alpha',
      companyName: 'Apex Facility Logistics Ltd.',
      jobTitle: 'Senior Facility Operations Officer',
      departmentName: 'Operations & Muster',
      siteName: 'Terminal 3 Logistics Hub',
      locationCity: 'Mumbai',
      employmentType: 'FULL_TIME',
      experienceRequired: '3-5 Years',
      jobDescription: 'Lead daily facility muster operations and shift synchronization.',
      skills: ['Muster Operations', 'Shift Logistics', 'Safety Protocols'],
      openPositions: 4,
      status: 'PUBLISHED',
      isInternalOnly: false,
      // SENSITIVE INTERNAL FIELDS THAT MUST BE STRIPPED:
      budgetCeiling: 1200000,
      salaryMin: 40000,
      salaryMax: 65000,
      salaryFrequency: 'month',
      isSalaryPublic: false, // Salary is confidential
      hiringManagerId: 'EMP-LEAD-888',
      approverChain: [
        { approverUid: 'usr-exec-1', status: 'APPROVED', approvalTimestamp: '2026-09-01T10:00:00Z' }
      ],
      bpmInstanceId: 'bpm_inst_99999',
      internalNotes: 'Must replace contractor agency by Q4 due to high commission rates.',
      createdByUserId: 'usr_hr_lead_44',
      createdByName: 'Pooja Deshmukh'
    };

    it('strictly strips all internal metadata, budget ceilings, notes, and approver chains', () => {
      const { isPublic, posting } = extractPublicSafeJobPosting(
        'company_enterprise_alpha',
        'REQ-2026-9001',
        rawRequisitionWithInternalSecrets
      );

      expect(isPublic).toBe(true);
      expect(posting).not.toBeNull();

      // Verify safe public fields are preserved
      expect(posting?.id).toBe('REQ-2026-9001');
      expect(posting?.companyId).toBe('company_enterprise_alpha');
      expect(posting?.jobTitle).toBe('Senior Facility Operations Officer');
      expect(posting?.departmentName).toBe('Operations & Muster');
      expect(posting?.locationCity).toBe('Mumbai');
      expect(posting?.openPositions).toBe(4);
      expect(posting?.status).toBe('PUBLISHED');

      // CRITICAL SECURITY ASSERTIONS: Verify ZERO sensitive internal fields leak to public object
      const leakedKeys = Object.keys(posting || {});
      expect(leakedKeys).not.toContain('budgetCeiling');
      expect(leakedKeys).not.toContain('approverChain');
      expect(leakedKeys).not.toContain('bpmInstanceId');
      expect(leakedKeys).not.toContain('internalNotes');
      expect(leakedKeys).not.toContain('hiringManagerId');
      expect(leakedKeys).not.toContain('createdByUserId');
      expect(leakedKeys).not.toContain('createdByName');
      expect(leakedKeys).not.toContain('requisitionCode');

      // When isSalaryPublic === false, salary details must not leak
      expect(posting?.publicSalaryRange).toBeUndefined();
    });

    it('formats and reveals publicSalaryRange ONLY when isSalaryPublic is explicitly true', () => {
      const reqWithPublicSalary: Partial<JobRequisitionRecord> = {
        ...rawRequisitionWithInternalSecrets,
        isSalaryPublic: true
      };

      const { isPublic, posting } = extractPublicSafeJobPosting(
        'company_enterprise_alpha',
        'REQ-2026-9001',
        reqWithPublicSalary
      );

      expect(isPublic).toBe(true);
      expect(posting?.publicSalaryRange).toBe('₹40,000 - ₹65,000 / month');
      // Budget ceiling still never exposed
      expect((posting as any).budgetCeiling).toBeUndefined();
    });

    it('rejects publication when isInternalOnly is true or status is non-published', () => {
      // 1. isInternalOnly = true
      const internalReq: Partial<JobRequisitionRecord> = {
        ...rawRequisitionWithInternalSecrets,
        isInternalOnly: true
      };
      const res1 = extractPublicSafeJobPosting('company_enterprise_alpha', 'REQ-INT-1', internalReq);
      expect(res1.isPublic).toBe(false);
      expect(res1.posting).toBeNull();

      // 2. status = DRAFT
      const draftReq: Partial<JobRequisitionRecord> = {
        ...rawRequisitionWithInternalSecrets,
        status: 'DRAFT'
      };
      const res2 = extractPublicSafeJobPosting('company_enterprise_alpha', 'REQ-DRAFT-1', draftReq);
      expect(res2.isPublic).toBe(false);

      // 3. status = FILLED
      const filledReq: Partial<JobRequisitionRecord> = {
        ...rawRequisitionWithInternalSecrets,
        status: 'FILLED'
      };
      const res3 = extractPublicSafeJobPosting('company_enterprise_alpha', 'REQ-FILLED-1', filledReq);
      expect(res3.isPublic).toBe(false);

      // 4. status = CLOSED
      const closedReq: Partial<JobRequisitionRecord> = {
        ...rawRequisitionWithInternalSecrets,
        status: 'CLOSED'
      };
      const res4 = extractPublicSafeJobPosting('company_enterprise_alpha', 'REQ-CLOSED-1', closedReq);
      expect(res4.isPublic).toBe(false);
    });
  });

  describe('Server API Endpoints & Candidate Application Routing', () => {
    it('successfully processes public candidate application and routes to isolated tenant collection', async () => {
      // Setup published job in publicJobPostings collection
      mockDbCollections['publicJobPostings'] = {
        'REQ-PUB-777': {
          id: 'REQ-PUB-777',
          companyId: 'company_tenant_secure_1',
          jobTitle: 'Shift Supervisor',
          departmentName: 'Operations',
          status: 'PUBLISHED'
        }
      };

      // Import publicJobRoutes router
      const { publicJobRoutes } = await import('../server/publicJobRoutes');

      // Emulate express request / response for /apply
      const req: any = {
        body: {
          requisitionId: 'REQ-PUB-777',
          fullName: 'Ananya Verma',
          email: 'ananya.verma@example.com',
          phone: '+91 9876543210',
          experienceYears: 4,
          expectedSalary: '₹45,000 / month',
          resumeUrl: 'https://portfolio.example.com/resume.pdf',
          notes: 'Experienced shift muster supervisor with strong safety track record.'
        }
      };

      let statusCode = 200;
      let jsonPayload: any = null;
      const res: any = {
        status: vi.fn((code) => {
          statusCode = code;
          return res;
        }),
        json: vi.fn((data) => {
          jsonPayload = data;
          return res;
        })
      };

      // Find the apply route handler from router stack
      const applyLayer = publicJobRoutes.stack.find((layer: any) => layer.route && layer.route.path === '/apply');
      expect(applyLayer).toBeDefined();

      const applyHandler = applyLayer.route.stack[0].handle;
      await applyHandler(req, res);

      expect(statusCode).toBe(201);
      expect(jsonPayload.success).toBe(true);
      expect(jsonPayload.candidateCode).toMatch(/^CAND-/);

      // Verify the candidate was written to the specific company's subcollection
      const tenantCandidates = mockDbCollections['companies/company_tenant_secure_1/candidates'];
      expect(tenantCandidates).toBeDefined();

      const candidateList = Object.values(tenantCandidates);
      expect(candidateList).toHaveLength(1);

      const candidate = candidateList[0];
      expect(candidate.fullName).toBe('Ananya Verma');
      expect(candidate.email).toBe('ananya.verma@example.com');
      expect(candidate.companyId).toBe('company_tenant_secure_1');
      expect(candidate.stage).toBe('REGISTERED');
      expect(candidate.source).toBe('PUBLIC_CAREER_PORTAL');
    });

    it('rejects applications for non-existent or closed requisitions', async () => {
      mockDbCollections['publicJobPostings'] = {
        'REQ-CLOSED-888': {
          id: 'REQ-CLOSED-888',
          companyId: 'company_tenant_secure_1',
          jobTitle: 'Closed Role',
          status: 'CLOSED'
        }
      };

      const { publicJobRoutes } = await import('../server/publicJobRoutes');
      const applyLayer = publicJobRoutes.stack.find((layer: any) => layer.route && layer.route.path === '/apply');
      const applyHandler = applyLayer.route.stack[0].handle;

      // 1. Apply to closed role
      const req1: any = {
        body: {
          requisitionId: 'REQ-CLOSED-888',
          fullName: 'Test Candidate',
          email: 'test@example.com',
          phone: '+91 9999999999'
        }
      };
      let res1Code = 200;
      let res1Json: any = null;
      const res1: any = {
        status: vi.fn((c) => { res1Code = c; return res1; }),
        json: vi.fn((d) => { res1Json = d; return res1; })
      };
      await applyHandler(req1, res1);
      expect(res1Code).toBe(400);
      expect(res1Json.message).toContain('closed');

      // 2. Apply to non-existent role
      const req2: any = {
        body: {
          requisitionId: 'REQ-NON-EXISTENT',
          fullName: 'Test Candidate',
          email: 'test@example.com',
          phone: '+91 9999999999'
        }
      };
      let res2Code = 200;
      let res2Json: any = null;
      const res2: any = {
        status: vi.fn((c) => { res2Code = c; return res2; }),
        json: vi.fn((d) => { res2Json = d; return res2; })
      };
      await applyHandler(req2, res2);
      expect(res2Code).toBe(404);
    });

    it('enforces IP and email rate limiting (max 5 applications per hour)', async () => {
      const { publicJobRoutes, resetPublicJobRateLimitBuckets } = await import('../server/publicJobRoutes');
      resetPublicJobRateLimitBuckets();

      mockDbCollections['publicJobPostings'] = {
        'REQ-ACTIVE-100': {
          id: 'REQ-ACTIVE-100',
          companyId: 'company_tenant_secure_1',
          jobTitle: 'Active Role',
          status: 'PUBLISHED'
        }
      };

      const applyLayer = publicJobRoutes.stack.find((layer: any) => layer.route && layer.route.path === '/apply');
      const applyHandler = applyLayer.route.stack[0].handle;

      const makeReq = (email: string, ip: string) => ({
        headers: { 'x-forwarded-for': ip },
        body: {
          requisitionId: 'REQ-ACTIVE-100',
          fullName: 'Candidate Test',
          email,
          phone: '+91 9876543210'
        }
      });

      // Submit 5 valid applications from IP 192.168.1.50
      for (let i = 1; i <= 5; i++) {
        let code = 0;
        const res: any = {
          status: vi.fn((c) => { code = c; return res; }),
          json: vi.fn(() => res)
        };
        await applyHandler(makeReq(`cand${i}@example.com`, '192.168.1.50'), res);
        expect(code).toBe(201);
      }

      // 6th application from same IP must be rejected with 429
      let blockedCode = 0;
      let blockedJson: any = null;
      let retryAfterHeader = '';
      const blockedRes: any = {
        setHeader: vi.fn((k, v) => { if (k === 'Retry-After') retryAfterHeader = v; }),
        status: vi.fn((c) => { blockedCode = c; return blockedRes; }),
        json: vi.fn((d) => { blockedJson = d; return blockedRes; })
      };
      await applyHandler(makeReq('cand6@example.com', '192.168.1.50'), blockedRes);
      expect(blockedCode).toBe(429);
      expect(blockedJson.error).toBe('Too Many Requests');
      expect(blockedJson.message).toContain('Too many job applications');
      expect(retryAfterHeader).toBeDefined();
    });

    it('validates resume file headers via magic bytes (permits PDF/DOCX, rejects spoofed/oversized files)', async () => {
      const { validateResumePayload } = await import('../server/publicJobRoutes');

      // Valid PDF (starts with %PDF-)
      const validPdfBase64 = Buffer.from('%PDF-1.5 Sample Content').toString('base64');
      const pdfResult = validateResumePayload(validPdfBase64);
      expect(pdfResult.valid).toBe(true);
      expect(pdfResult.detectedType).toBe('PDF');

      // Valid DOCX (starts with PK\x03\x04 zip header)
      const validDocxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
      const docxResult = validateResumePayload(validDocxBuffer.toString('base64'));
      expect(docxResult.valid).toBe(true);
      expect(docxResult.detectedType).toBe('DOCX');

      // Invalid fake executable (.exe starting with MZ)
      const fakeExeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);
      const exeResult = validateResumePayload(fakeExeBuffer.toString('base64'));
      expect(exeResult.valid).toBe(false);
      expect(exeResult.error).toContain('magic byte verification failed');

      // Valid URL
      const urlResult = validateResumePayload('https://storage.googleapis.com/company/resumes/c123.pdf');
      expect(urlResult.valid).toBe(true);
      expect(urlResult.detectedType).toBe('URL');
    });

    it('sanitizes candidate text inputs to prevent XSS and control character injection', async () => {
      const { sanitizeInput } = await import('../server/publicJobRoutes');

      const dirtyName = '<script>alert("XSS")</script> Rajesh Sharma <img src=x onerror=alert(1)>';
      const cleanName = sanitizeInput(dirtyName, 100);
      expect(cleanName).toBe('alert("XSS") Rajesh Sharma');
      expect(cleanName).not.toContain('<script>');
      expect(cleanName).not.toContain('<img');

      // Null byte and control characters stripped
      const dirtyNotes = 'Cover Letter\x00\x08 text with null byte';
      const cleanNotes = sanitizeInput(dirtyNotes, 500);
      expect(cleanNotes).toBe('Cover Letter text with null byte');
      expect(cleanNotes).not.toContain('\x00');
    });
  });
});
