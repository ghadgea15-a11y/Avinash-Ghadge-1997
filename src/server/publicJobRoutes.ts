import express, { Request, Response } from 'express';
import { getAdminDb } from './firebaseAdmin';
import { PublicJobPosting, JobRequisitionRecord } from '../types';

export const publicJobRoutes = express.Router();

// Sliding-window rate limit buckets for public submissions
// Key: ip:<ip> or email:<email> -> { count: number; resetAt: number }
const submissionRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function resetPublicJobRateLimitBuckets(): void {
  submissionRateLimitBuckets.clear();
}

/**
 * Check and enforce rate limits for public job applications (max 5 per hour per IP / email)
 */
export function checkRateLimit(key: string, limit = 5, windowMs = 3600000): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = submissionRateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    submissionRateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Sanitize text inputs: strips HTML tags, control characters, and enforces length bounds.
 */
export function sanitizeInput(input: string, maxLength = 500): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Strip control characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate resume payload: checks file size limit (5MB) and inspects magic byte headers
 * for true PDF (%PDF-) or DOCX (PK\x03\x04) format.
 */
export function validateResumePayload(resumeBase64OrUrl: string): { valid: boolean; error?: string; detectedType?: 'PDF' | 'DOCX' | 'URL' } {
  if (!resumeBase64OrUrl || typeof resumeBase64OrUrl !== 'string') {
    return { valid: true }; // Optional field
  }

  const trimmed = resumeBase64OrUrl.trim();

  // If it's a URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.length > 2000) {
      return { valid: false, error: 'Resume URL exceeds maximum allowed length (2000 chars).' };
    }
    return { valid: true, detectedType: 'URL' };
  }

  // Base64 Data URI or raw base64 string
  let base64Content = trimmed;
  if (trimmed.includes(',')) {
    base64Content = trimmed.split(',')[1];
  }

  try {
    const buffer = Buffer.from(base64Content, 'base64');
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    if (buffer.length > MAX_SIZE_BYTES) {
      return { valid: false, error: `Resume file exceeds maximum size limit of 5MB (${(buffer.length / (1024 * 1024)).toFixed(2)}MB).` };
    }

    if (buffer.length < 4) {
      return { valid: false, error: 'Corrupt or unreadable resume file.' };
    }

    // Inspect Magic Bytes:
    // PDF: %PDF (0x25, 0x50, 0x44, 0x46)
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    // DOCX (ZIP container): PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    const isDocx = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;

    if (!isPdf && !isDocx) {
      return {
        valid: false,
        error: 'Invalid file format. Only true PDF (.pdf) and Word (.docx) documents are permitted (magic byte verification failed).'
      };
    }

    return { valid: true, detectedType: isPdf ? 'PDF' : 'DOCX' };
  } catch (err: any) {
    return { valid: false, error: 'Failed to decode and verify resume file: ' + err.message };
  }
}

/**
 * Pure function: Extracts ONLY public-safe fields from a job requisition.
 * Strips all internal metadata, budget ceilings, approver chains, and internal IDs.
 */
export function extractPublicSafeJobPosting(
  companyId: string,
  reqId: string,
  requisition: Partial<JobRequisitionRecord>
): { isPublic: boolean; posting: PublicJobPosting | null } {
  const status = String(requisition.status || '').toUpperCase();
  const isInternalOnly = requisition.isInternalOnly === true;
  const isPublic = ['OPEN', 'APPROVED', 'PUBLISHED'].includes(status) && !isInternalOnly;

  if (!isPublic) {
    return { isPublic: false, posting: null };
  }

  // Handle salary visibility: ONLY include salary if explicitly marked public
  let publicSalaryRange: string | undefined = undefined;
  if (requisition.isSalaryPublic === true) {
    if (requisition.salaryMin && requisition.salaryMax) {
      publicSalaryRange = `₹${requisition.salaryMin.toLocaleString('en-IN')} - ₹${requisition.salaryMax.toLocaleString('en-IN')} / ${requisition.salaryFrequency || 'month'}`;
    } else if (requisition.expectedSalary || requisition.salaryRange) {
      publicSalaryRange = String(requisition.expectedSalary || requisition.salaryRange);
    }
  }

  const posting: PublicJobPosting = {
    id: reqId,
    companyId,
    companyName: sanitizeInput(requisition.companyName || 'Enterprise Partner', 100),
    jobTitle: sanitizeInput(requisition.jobTitle || requisition.title || 'Open Position', 120),
    departmentName: sanitizeInput(requisition.departmentName || requisition.department || 'Operations', 100),
    siteName: sanitizeInput(requisition.siteName || '', 100),
    locationCity: sanitizeInput(requisition.locationCity || requisition.location || 'On-site', 100),
    employmentType: (requisition.employmentType as any) || 'FULL_TIME',
    experienceRequired: sanitizeInput(requisition.experienceRequired || '1-3 Years', 50),
    jobDescription: sanitizeInput(requisition.jobDescription || requisition.description || 'Exciting career opportunity.', 5000),
    skills: Array.isArray(requisition.skills) ? requisition.skills.map(s => sanitizeInput(String(s), 50)) : [],
    openPositions: Math.max(1, Number(requisition.openPositions || requisition.openings) || 1),
    publicSalaryRange,
    status: 'PUBLISHED',
    publishedAt: requisition.publishedAt || requisition.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closingDate: requisition.closingDate || undefined
  };

  return { isPublic: true, posting };
}

/**
 * POST /api/jobs/sync-public-posting
 * Synchronizes job requisition to root /publicJobPostings via Admin SDK.
 * Ensures complete stripping of internal metadata.
 */
publicJobRoutes.post('/sync-public-posting', async (req: Request, res: Response) => {
  try {
    const { companyId, requisitionId, requisition } = req.body;

    if (!companyId || !requisitionId) {
      return res.status(400).json({ error: 'Bad Request', message: 'companyId and requisitionId are required' });
    }

    const { isPublic, posting } = extractPublicSafeJobPosting(companyId, requisitionId, requisition || {});

    const db = getAdminDb();
    if (!db) {
      return res.status(503).json({ error: 'Service Unavailable', message: 'Database connection unavailable' });
    }

    const publicDocRef = db.collection('publicJobPostings').doc(requisitionId);

    if (isPublic && posting) {
      await publicDocRef.set(posting, { merge: true });
      return res.json({
        success: true,
        action: 'PUBLISHED',
        message: 'Job posting published to public portal with strict data minimization.',
        publicJobPosting: posting
      });
    } else {
      await publicDocRef.delete();
      return res.json({
        success: true,
        action: 'REMOVED',
        message: 'Job posting removed from public portal (status is closed/draft/internal).'
      });
    }
  } catch (err: any) {
    console.error('[PublicJobAPI] Sync error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/jobs/public-postings
 * Read published jobs with optional department filtering.
 */
publicJobRoutes.get('/public-postings', async (req: Request, res: Response) => {
  try {
    const department = req.query.department as string;
    const db = getAdminDb();
    if (!db) {
      return res.status(503).json({ error: 'Service Unavailable', message: 'Database connection unavailable' });
    }

    let queryRef = db.collection('publicJobPostings').where('status', '==', 'PUBLISHED');
    if (department && department !== 'ALL') {
      queryRef = queryRef.where('departmentName', '==', department);
    }

    const snap = await queryRef.get();
    const postings = snap.docs.map(d => ({ ...d.data(), id: d.id }));

    return res.json({
      success: true,
      postings
    });
  } catch (err: any) {
    console.error('[PublicJobAPI] Query error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * POST /api/jobs/apply
 * External candidates submit application without needing high-privilege credentials.
 * Automatically verifies requisition in /publicJobPostings and routes to isolated company candidate collection.
 * Enforces rate limiting per IP & email, input sanitization, and resume magic byte validation.
 */
publicJobRoutes.post('/apply', async (req: Request, res: Response) => {
  try {
    const {
      requisitionId,
      fullName,
      email,
      phone,
      experienceYears,
      expectedSalary,
      resumeUrl,
      resumeBase64,
      notes
    } = req.body;

    const clientIp = (req.headers && req.headers['x-forwarded-for'] ? (req.headers['x-forwarded-for'] as string).split(',')[0]?.trim() : '') || req.socket?.remoteAddress || req.ip || '127.0.0.1';

    // 1. IP Rate Limiting (max 5 per hour)
    const ipLimitCheck = checkRateLimit(`ip:${clientIp}`, 5, 3600000);
    if (!ipLimitCheck.allowed) {
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', ipLimitCheck.retryAfterSeconds.toString());
      }
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many job applications submitted from this IP address. Please try again later.',
        retryAfterSeconds: ipLimitCheck.retryAfterSeconds
      });
    }

    // 2. Input Validation
    if (!requisitionId || !fullName?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'requisitionId, fullName, email, and phone are mandatory.'
      });
    }

    const sanitizedEmail = sanitizeInput(email, 100).toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid email address format.' });
    }

    // 3. Email Rate Limiting (max 5 per hour)
    const emailLimitCheck = checkRateLimit(`email:${sanitizedEmail}`, 5, 3600000);
    if (!emailLimitCheck.allowed) {
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', emailLimitCheck.retryAfterSeconds.toString());
      }
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many applications submitted for this email address. Please try again later.',
        retryAfterSeconds: emailLimitCheck.retryAfterSeconds
      });
    }

    const sanitizedFullName = sanitizeInput(fullName, 100);
    const sanitizedPhone = sanitizeInput(phone, 20);
    const sanitizedExpectedSalary = sanitizeInput(expectedSalary || '', 50);
    const sanitizedNotes = sanitizeInput(notes || '', 2000);

    // 4. Resume Validation (File size limit 5MB and magic byte header check)
    const resumePayload = resumeBase64 || resumeUrl;
    if (resumePayload) {
      const resumeCheck = validateResumePayload(resumePayload);
      if (!resumeCheck.valid) {
        return res.status(400).json({
          error: 'Bad Request',
          message: resumeCheck.error || 'Invalid resume attachment.'
        });
      }
    }

    const db = getAdminDb();
    if (!db) {
      return res.status(503).json({ error: 'Service Unavailable', message: 'Database connection unavailable' });
    }

    // 5. Verify job exists and is active in publicJobPostings
    const publicDocSnap = await db.collection('publicJobPostings').doc(requisitionId).get();
    if (!publicDocSnap.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The requested job posting is no longer active or does not exist.'
      });
    }

    const publicJob = publicDocSnap.data() as PublicJobPosting;
    if (publicJob.status !== 'PUBLISHED') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Applications are closed for this position.'
      });
    }

    const companyId = publicJob.companyId;
    const now = new Date().toISOString();
    const candidateId = `CAND-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const candidateCode = `CAND-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;

    const candidateRecord = {
      id: candidateId,
      candidateCode,
      companyId,
      requisitionId,
      jobTitle: publicJob.jobTitle,
      departmentName: publicJob.departmentName || 'Operations',
      fullName: sanitizedFullName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      phoneNumber: sanitizedPhone,
      experienceYears: Math.max(0, Math.min(50, Number(experienceYears) || 0)),
      expectedSalary: sanitizedExpectedSalary,
      resumeUrl: typeof resumeUrl === 'string' ? sanitizeInput(resumeUrl, 2000) : '',
      notes: sanitizedNotes,
      stage: 'REGISTERED',
      source: 'PUBLIC_CAREER_PORTAL',
      status: 'ACTIVE',
      appliedDate: now,
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          stage: 'REGISTERED',
          changedBy: 'PUBLIC_PORTAL',
          changedByName: 'Candidate Self-Service',
          changedAt: now,
          sourceEvent: 'Public Career Portal Submission'
        }
      ]
    };

    // 6. Persist to isolated tenant candidates collection
    await db.collection('companies').doc(companyId).collection('candidates').doc(candidateId).set(candidateRecord);

    // 7. Record audit log
    await db.collection('audit_logs').add({
      companyId,
      actorUid: 'unauthenticated_job_seeker',
      actorName: sanitizedFullName,
      actorRole: 'EXTERNAL_CANDIDATE',
      module: 'TALENT_ACQUISITION',
      action: 'PUBLIC_APPLICATION_SUBMITTED',
      entityId: candidateId,
      description: `Public job application submitted for "${publicJob.jobTitle}" (${candidateCode})`,
      timestamp: now
    });

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      candidateCode,
      appliedAt: now
    });
  } catch (err: any) {
    console.error('[PublicJobAPI] Application submission error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

export default publicJobRoutes;
