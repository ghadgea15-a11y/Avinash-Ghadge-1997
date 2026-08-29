import { GoogleGenerativeAI } from "@google/generative-ai";

export interface VisionVerificationResult {
  isMatch: boolean;
  livenessScore: number; // 0 to 1
  isLivenessValid: boolean;
  matchScore: number; // 0 to 1
  analysis: string;
  isSpoofDetected: boolean;
}

export class AiVisionService {
  private static genAI: GoogleGenerativeAI;
  private static model: any;

  private static init() {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set. AI Vision verification will be bypassed.");
        return;
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
  }

  /**
   * Verifies if the person in the punch photo matches the profile photo and checks for liveness.
   * @param punchPhotoBase64 Base64 string of the selfie taken during punch-in
   * @param profilePhotoBase64 Base64 string of the employee's official profile photo
   */
  static async verifyLivenessAndMatch(
    punchPhotoBase64: string,
    profilePhotoBase64: string
  ): Promise<VisionVerificationResult> {
    this.init();
    if (!this.model) {
      return {
        isMatch: true,
        livenessScore: 1,
        isLivenessValid: true,
        matchScore: 1,
        analysis: "AI Vision bypassed (API Key missing)",
        isSpoofDetected: false
      };
    }

    try {
      const prompt = `
        Analyze these two images for an enterprise attendance system.
        Image 1: Official Profile Photo
        Image 2: Live Selfie for Punch-in

        Tasks:
        1. Face Match: Determine if the person in both images is the same. Provide a matchScore (0.0 to 1.0).
        2. Liveness Detection: Check if Image 2 is a live human face. Look for signs of spoofing (e.g., photo-of-a-photo, screen reflections, static masks, or deepfakes). Provide a livenessScore (0.0 to 1.0).
        3. Spoof Detection: Explicitly state if any spoofing attempt is detected.

        Respond strictly in JSON format:
        {
          "isMatch": boolean,
          "matchScore": number,
          "livenessScore": number,
          "isLivenessValid": boolean, (true if livenessScore > 0.8)
          "isSpoofDetected": boolean,
          "analysis": "Brief explanation of findings"
        }
      `;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: punchPhotoBase64.split(',')[1] || punchPhotoBase64,
            mimeType: "image/jpeg"
          }
        },
        {
          inlineData: {
            data: profilePhotoBase64.split(',')[1] || profilePhotoBase64,
            mimeType: "image/jpeg"
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Clean JSON response
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(jsonStr);

    } catch (error) {
      console.error("[AiVisionService] Verification failed:", error);
      return {
        isMatch: true, // Fail-safe to allow punch but log error
        livenessScore: 0.5,
        isLivenessValid: true,
        matchScore: 0.5,
        analysis: "AI Verification Error: " + (error as any).message,
        isSpoofDetected: false
      };
    }
  }
}
