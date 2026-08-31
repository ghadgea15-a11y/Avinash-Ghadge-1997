import React, { useState, useEffect } from 'react';
import { Globe, Volume2, VolumeX } from 'lucide-react';
import { LanguageService, VoiceFeedbackService, AppLanguage } from '../../services/voiceFeedbackService';

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
  showVoiceToggle?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  compact = false,
  className = '',
  showVoiceToggle = true
}) => {
  const [currentLang, setCurrentLang] = useState<AppLanguage>(LanguageService.getLanguage());
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  useEffect(() => {
    const handleLangChange = () => {
      setCurrentLang(LanguageService.getLanguage());
    };
    window.addEventListener('language_changed', handleLangChange);
    return () => window.removeEventListener('language_changed', handleLangChange);
  }, []);

  const handleSelectLanguage = (lang: AppLanguage) => {
    LanguageService.setLanguage(lang);
    setCurrentLang(lang);
    
    // Announce language change in new language
    const sampleText = lang === 'MR' 
      ? 'भाषा मराठी निवडली आहे' 
      : lang === 'HI' 
      ? 'भाषा हिंदी चुनी गई है' 
      : 'Language set to English';
      
    if (voiceEnabled) {
      VoiceFeedbackService.speak(sampleText, lang);
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      VoiceFeedbackService.stop();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      VoiceFeedbackService.speakKey('SUCCESS_PUNCH');
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Globe Icon and Language Buttons */}
      <div className="flex items-center bg-slate-800/80 backdrop-blur border border-slate-700/80 p-1 rounded-xl shadow-lg">
        <Globe className="w-4 h-4 text-indigo-400 mx-1.5 shrink-0" />
        
        <button
          type="button"
          onClick={() => handleSelectLanguage('MR')}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
            currentLang === 'MR'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
          title="मराठी"
        >
          मराठी
        </button>

        <button
          type="button"
          onClick={() => handleSelectLanguage('HI')}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
            currentLang === 'HI'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
          title="हिंदी"
        >
          हिंदी
        </button>

        <button
          type="button"
          onClick={() => handleSelectLanguage('EN')}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
            currentLang === 'EN'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
          title="English"
        >
          ENG
        </button>
      </div>

      {/* Voice Prompt Toggle */}
      {showVoiceToggle && (
        <button
          type="button"
          onClick={toggleVoice}
          className={`p-2 rounded-xl border backdrop-blur transition-all ${
            voiceEnabled 
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30' 
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title={voiceEnabled ? 'अवाज चालू आहे (Voice On)' : 'आवाज बंद आहे (Voice Off)'}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};
