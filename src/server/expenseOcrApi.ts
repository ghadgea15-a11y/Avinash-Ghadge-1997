import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const CONFIDENCE_THRESHOLD = 0.80; // 80% confidence threshold required for automated approval eligibility

export async function processReceiptOcrHandler(req: Request, res: Response) {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'No image data provided for receipt OCR',
        requiresManualReview: true,
        manualReviewReason: 'No receipt document provided.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // STRICT REQUIREMENT: Never silently simulate fake OCR. Route to Manual Review Required.
      return res.status(200).json({
        success: false,
        error: 'GEMINI_API_KEY_NOT_CONFIGURED',
        message: 'AI Vision OCR engine is not configured (GEMINI_API_KEY missing).',
        requiresManualReview: true,
        manualReviewReason: 'AI OCR service key not configured on server. Manual verification of invoice required by Approver.',
        confidenceScore: 0,
        ocrExtractionStatus: 'FAILED_MANUAL_REVIEW_REQUIRED'
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const effectiveMimeType = mimeType || 'image/jpeg';

    const prompt = `
      You are an enterprise Accounts Payable & Expense Audit OCR system.
      Analyze this receipt/tax invoice document and extract financial fields accurately.

      Respond ONLY with a valid JSON object in the exact schema below (no Markdown fences, no extra text):
      {
        "merchantName": "Name of vendor or establishment",
        "merchantGstin": "GSTIN or Tax ID if visible, else null",
        "invoiceNumber": "Invoice or Receipt # if visible, else null",
        "expenseDate": "YYYY-MM-DD formatted date, or current date if not readable",
        "category": "One of: TRAVEL_FARE, LODGING, MEALS_FOOD, FUEL_MILEAGE, CLIENT_ENTERTAINMENT, OFFICE_SUPPLIES, EQUIPMENT_REPAIR, UNIFORM_SAFETY_GEAR, COMMUNICATION_INTERNET, MISCELLANEOUS",
        "totalAmount": 0.00,
        "taxAmount": 0.00,
        "currency": "INR",
        "description": "Brief description of items / service rendered",
        "confidenceScore": 0.95,
        "isLegible": true,
        "tamperingOrSuspicionDetected": false
      }

      Note:
      - confidenceScore must be between 0.0 and 1.0 reflecting your certainty about totalAmount and merchantName.
      - If text is blurry, truncated, or ambiguous, assign a confidenceScore below 0.70.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: effectiveMimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      return res.status(200).json({
        success: false,
        error: 'PARSE_FAILURE',
        message: 'Could not parse structured financial data from OCR output.',
        requiresManualReview: true,
        manualReviewReason: 'AI OCR output could not be parsed into verified financial schema. Approver manual verification mandatory.',
        confidenceScore: 0,
        ocrExtractionStatus: 'FAILED_MANUAL_REVIEW_REQUIRED'
      });
    }

    const confidenceScore = Number(parsed.confidenceScore) || 0.5;
    const isBelowThreshold = confidenceScore < CONFIDENCE_THRESHOLD;
    const isSuspicious = Boolean(parsed.tamperingOrSuspicionDetected);

    const requiresManualReview = isBelowThreshold || isSuspicious || !parsed.isLegible;
    let manualReviewReason: string | undefined;

    if (isSuspicious) {
      manualReviewReason = 'Potential invoice alteration or anomaly flagged by AI Vision audit.';
    } else if (isBelowThreshold) {
      manualReviewReason = `Low OCR confidence score (${Math.round(confidenceScore * 100)}% < ${Math.round(CONFIDENCE_THRESHOLD * 100)}% threshold). Approver must cross-verify original invoice.`;
    } else if (!parsed.isLegible) {
      manualReviewReason = 'Receipt document flagged as poorly legible. Approver manual check required.';
    }

    return res.status(200).json({
      success: true,
      data: {
        merchantName: parsed.merchantName || 'Unknown Vendor',
        merchantGstin: parsed.merchantGstin || null,
        invoiceNumber: parsed.invoiceNumber || null,
        expenseDate: parsed.expenseDate || new Date().toISOString().split('T')[0],
        category: parsed.category || 'MISCELLANEOUS',
        totalAmount: Number(parsed.totalAmount) || 0,
        taxAmount: Number(parsed.taxAmount) || 0,
        currency: parsed.currency || 'INR',
        description: parsed.description || '',
        confidenceScore,
        ocrExtracted: true,
        requiresManualReview,
        manualReviewReason,
        ocrExtractionStatus: requiresManualReview ? 'LOW_CONFIDENCE' : 'SUCCESS'
      }
    });

  } catch (error: any) {
    console.error('[ExpenseOcrApi] OCR processing error:', error);
    // STRICT REQUIREMENT: Never silently simulate fake OCR. Route to Manual Review Required.
    return res.status(200).json({
      success: false,
      error: 'OCR_EXECUTION_ERROR',
      message: error?.message || 'Error executing AI Vision OCR',
      requiresManualReview: true,
      manualReviewReason: `AI OCR execution failed (${error?.message || 'Unknown network error'}). Approver manual review required.`,
      confidenceScore: 0,
      ocrExtractionStatus: 'FAILED_MANUAL_REVIEW_REQUIRED'
    });
  }
}
