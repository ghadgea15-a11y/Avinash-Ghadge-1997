// Language and Voice Feedback Service for Ground Workforce Accessibility

export type AppLanguage = 'MR' | 'HI' | 'EN';

export interface TranslationDictionary {
  [key: string]: {
    MR: string;
    HI: string;
    EN: string;
  };
}

export const WORKFORCE_DICTIONARY: TranslationDictionary = {
  // Common Navigation & Actions
  PUNCH_IN: { MR: 'हजेरी सुरू करा (Punch In)', HI: 'उपस्थिति दर्ज करें (Punch In)', EN: 'Punch In' },
  PUNCH_OUT: { MR: 'ड्युटी संपवा (Punch Out)', HI: 'ड्यूटी समाप्त करें (Punch Out)', EN: 'Punch Out' },
  SUCCESS_PUNCH: { MR: 'तुमची हजेरी यशस्वीपणे नोंदवली गेली आहे!', HI: 'आपकी उपस्थिति सफलतापूर्वक दर्ज की गई!', EN: 'Punch recorded successfully!' },
  FAILED_PUNCH: { MR: 'हजेरी नोंदवता आली नाही. कृपया पुन्हा प्रयत्न करा.', HI: 'उपस्थिति दर्ज नहीं हो सकी। कृपया पुन: प्रयास करें।', EN: 'Punch failed. Please try again.' },
  OUT_OF_GEOFENCE: { MR: 'तुम्ही साइटच्या आवाराबाहेर आहात. कृपया साइटवर जाऊन पंच करा.', HI: 'आप साइट परिसर से बाहर हैं। कृपया साइट पर जाकर पंच करें।', EN: 'Out of geofence boundary. Please step inside site area.' },
  FACE_NOT_MATCHED: { MR: 'चेहरा स्पष्ट दिसला नाही. कॅमेऱ्याकडे नीट पहा.', HI: 'चेहरा स्पष्ट नहीं दिखा। कैमरे की ओर देखें।', EN: 'Face not recognized. Look at the camera.' },
  NETWORK_OFFLINE: { MR: 'इंटरनेट बंद आहे. पंच ऑफलाइन सेव्ह केला गेला आहे.', HI: 'इंटरनेट बंद है। पंच ऑफलाइन सहेजा गया है।', EN: 'Internet offline. Punch saved locally.' },
  
  // Login & Keypad
  ENTER_PIN: { MR: '४ अंकी पिन टाका', HI: '४ अंकों का पिन दर्ज करें', EN: 'Enter 4-Digit PIN' },
  INVALID_PIN: { MR: 'पिन चुकला आहे. पुन्हा प्रयत्न करा.', HI: 'गलत पिन दर्ज किया गया। पुन: प्रयास करें।', EN: 'Incorrect PIN. Please try again.' },
  COMPANY_CODE: { MR: 'कंपनी कोड', HI: 'कंपनी कोड', EN: 'Company Code' },
  WORKER_ID: { MR: 'कामगार क्रमांक / Employee ID', HI: 'कर्मचारी नंबर / Employee ID', EN: 'Worker / Employee ID' },
  
  // Leave Reasons (Pictograms)
  LEAVE_SICK: { MR: 'आजारपण (Sick Leave)', HI: 'बीमारी (Sick Leave)', EN: 'Sick Leave' },
  LEAVE_CASUAL: { MR: 'घरगुती काम (Personal Work)', HI: 'घरेलू काम (Personal Work)', EN: 'Personal / Family' },
  LEAVE_ANNUAL: { MR: 'नियोजित सुट्टी (Planned Leave)', HI: 'नियोजित छुट्टी (Planned Leave)', EN: 'Annual / Planned' },
  LEAVE_EMERGENCY: { MR: 'आणीबाणी (Emergency)', HI: 'आपातकालीन (Emergency)', EN: 'Emergency' },
  
  // Buttons
  RETRY: { MR: 'पुन्हा प्रयत्न करा', HI: 'पुन्हा प्रयास करें', EN: 'Retry' },
  CALL_SUPERVISOR: { MR: 'सुपरवायझरला कॉल करा', HI: 'सुपरवाइजर को कॉल करें', EN: 'Call Supervisor' },
  SUBMIT: { MR: 'सबमिट करा', HI: 'जमा करें', EN: 'Submit' },
  CANCEL: { MR: 'रद्द करा', HI: 'रद्द करें', EN: 'Cancel' }
};

export class LanguageService {
  private static STORAGE_KEY = 'logsheet_app_language';

  static getLanguage(): AppLanguage {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'MR' || saved === 'HI' || saved === 'EN') {
      return saved;
    }
    return 'MR'; // Default to Marathi for local workforce
  }

  static setLanguage(lang: AppLanguage): void {
    localStorage.setItem(this.STORAGE_KEY, lang);
    window.dispatchEvent(new Event('language_changed'));
  }

  static translate(key: string, overrideLang?: AppLanguage): string {
    const lang = overrideLang || this.getLanguage();
    const entry = WORKFORCE_DICTIONARY[key];
    if (!entry) return key;
    return entry[lang] || entry.MR || entry.EN;
  }
}

export class VoiceFeedbackService {
  private static isSpeaking = false;

  /**
   * Speaks a message in Marathi ('mr-IN'), Hindi ('hi-IN') or English using Web Speech API.
   */
  static speak(text: string, langOverride?: AppLanguage): void {
    if (!('speechSynthesis' in window)) {
      console.warn('[VoiceFeedback] Speech Synthesis not supported in this browser.');
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      
      const lang = langOverride || LanguageService.getLanguage();
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (lang === 'MR') {
        utterance.lang = 'mr-IN';
      } else if (lang === 'HI') {
        utterance.lang = 'hi-IN';
      } else {
        utterance.lang = 'en-IN';
      }

      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;

      utterance.onstart = () => { this.isSpeaking = true; };
      utterance.onend = () => { this.isSpeaking = false; };
      utterance.onerror = (e) => {
        console.warn('[VoiceFeedback] Speech error:', e);
        this.isSpeaking = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[VoiceFeedback] Execution failed:', err);
    }
  }

  static speakKey(translationKey: string, langOverride?: AppLanguage): void {
    const text = LanguageService.translate(translationKey, langOverride);
    this.speak(text, langOverride);
  }

  static stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
