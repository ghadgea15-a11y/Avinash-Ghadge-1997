import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Heart, 
  Award, 
  Clock, 
  Edit3, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Key,
  QrCode,
  Copy,
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  Check
} from 'lucide-react';
import { UserSession, CompanyTenant, UserProfileData } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { TotpService, TotpSetupResult } from '../../services/totpService';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface ProfileScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
}

const EMPTY_PROFILE: UserProfileData = {
  phoneNumber: '',
  emergencyContact: '',
  bloodGroup: '',
  address: '',
  kycStatus: 'PENDING',
  certifications: [],
  joinedDate: '',
  shiftSchedule: ''
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userSession,
  activeCompany
}) => {
  const { isDark } = useTheme();
  const [profile, setProfile] = useState<UserProfileData>(EMPTY_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // TOTP MFA State
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [showMfaModal, setShowMfaModal] = useState<boolean>(false);
  const [mfaSetupData, setMfaSetupData] = useState<TotpSetupResult | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState<string>('');
  const [mfaVerifyError, setMfaVerifyError] = useState<string | null>(null);
  const [isActivatingMfa, setIsActivatingMfa] = useState<boolean>(false);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState<boolean>(false);
  const [existingBackupCodes, setExistingBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState<boolean>(false);

  useEffect(() => {
    FirestoreService.getUserProfile(userSession.userId).then((data) => {
      if (data) {
        setProfile(data);
      }
    });

    // Check user MFA status
    getDoc(doc(db, 'users', userSession.userId)).then((snap) => {
      if (snap.exists()) {
        const u = snap.data();
        setMfaEnabled(!!u.mfaEnabled);
        if (u.backupCodes && Array.isArray(u.backupCodes)) {
          setExistingBackupCodes(u.backupCodes);
        }
      }
    }).catch((e) => console.warn('Could not fetch MFA state:', e));
  }, [userSession]);

  const handleSave = async () => {
    await FirestoreService.saveUserProfile(userSession.userId, profile);
    setIsEditing(false);
    setSavedSuccess('Profile changes saved and synced to Firestore!');
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  const handleStartMfaSetup = async () => {
    setMfaVerifyError(null);
    setMfaVerifyCode('');
    try {
      const issuer = activeCompany?.brandName || 'Log Sheet Muster';
      const setup = await TotpService.createMfaSetup({
        accountName: userSession.email,
        issuer: issuer,
        options: {
          digits: 6,
          period: 30
        }
      });
      setMfaSetupData(setup);
      setShowMfaModal(true);
    } catch (err: any) {
      setMfaVerifyError(err.message || 'Failed to initialize MFA generator.');
    }
  };

  const handleConfirmMfaActivation = async () => {
    if (!mfaSetupData) return;
    if (mfaVerifyCode.trim().length !== 6) {
      setMfaVerifyError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setIsActivatingMfa(true);
    setMfaVerifyError(null);

    try {
      const verifyRes = await TotpService.verifyCode(mfaVerifyCode, mfaSetupData.secret);
      if (!verifyRes.isValid) {
        setMfaVerifyError(verifyRes.error || 'Code did not match. Please verify your system clock or try the next code.');
        setIsActivatingMfa(false);
        return;
      }

      // Persist to user document and private subcollection
      const userDocRef = doc(db, 'users', userSession.userId);
      await updateDoc(userDocRef, {
        mfaEnabled: true,
        mfaConfiguredAt: new Date().toISOString()
      });
      const privateMfaRef = doc(db, 'users', userSession.userId, 'private', 'mfa');
      await setDoc(privateMfaRef, {
        totpSecret: mfaSetupData.secret,
        backupCodes: mfaSetupData.backupCodes,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setMfaEnabled(true);
      setExistingBackupCodes(mfaSetupData.backupCodes);
      setShowMfaModal(false);
      setMfaSetupData(null);
      setSavedSuccess('Two-Factor Authentication (TOTP) successfully activated!');
      setTimeout(() => setSavedSuccess(null), 4000);
    } catch (err: any) {
      setMfaVerifyError(err.message || 'Failed to save MFA configuration.');
    } finally {
      setIsActivatingMfa(false);
    }
  };

  const handleDisableMfa = async () => {
    const confirm = window.confirm('Are you sure you want to disable Two-Factor Authentication? Your account will only be protected by password.');
    if (!confirm) return;

    try {
      const userDocRef = doc(db, 'users', userSession.userId);
      await updateDoc(userDocRef, {
        mfaEnabled: false
      });
      const privateMfaRef = doc(db, 'users', userSession.userId, 'private', 'mfa');
      await setDoc(privateMfaRef, {
        totpSecret: null,
        backupCodes: [],
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setMfaEnabled(false);
      setExistingBackupCodes([]);
      setSavedSuccess('Two-Factor Authentication has been disabled.');
      setTimeout(() => setSavedSuccess(null), 3000);
    } catch (err: any) {
      alert('Failed to disable MFA: ' + err.message);
    }
  };

  const handleCopy = (text: string, type: 'secret' | 'backup') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    }
  };

  return (
    <div className={`p-4 space-y-4 overflow-y-auto max-h-full ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Toast Alert */}
      {savedSuccess && (
        <div className="bg-emerald-950 border border-emerald-800 p-3 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* Hero Card */}
      <div className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="relative">
            <img
              src={userSession.avatarUrl || undefined}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border-4 border-indigo-600 shadow-lg"
            />
            <span className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 text-white rounded-full border-2 border-slate-900">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg font-bold">{userSession.fullName}</h2>
              <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                {userSession.role}
              </span>
            </div>

            <p className="text-xs font-mono text-slate-400 mt-1">
              ID: {userSession.employeeId} • {activeCompany?.brandName || userSession.companyId}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                Branch: {userSession.branchId}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Joined: {profile.joinedDate || 'Active'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (isEditing) handleSave();
              else setIsEditing(true);
            }}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg transition ${
              isEditing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            <span>{isEditing ? 'Save Profile' : 'Edit Details'}</span>
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication (TOTP MFA) Security Card */}
      <div className={`p-4 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-3 border-b pb-2.5 border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Two-Factor Authentication (MFA)</h3>
              <p className="text-[11px] text-slate-400">RFC 6238 Time-based One-Time Password (Google Authenticator, Authy, Microsoft Authenticator)</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
            mfaEnabled 
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
              : 'bg-amber-950 text-amber-400 border-amber-800'
          }`}>
            <ShieldCheck className="w-3 h-3" />
            {mfaEnabled ? 'ENFORCED' : 'NOT CONFIGURED'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <p className="font-medium text-slate-300">
              {mfaEnabled
                ? 'Your account requires a 6-digit TOTP code during each sign in.'
                : 'Protect your enterprise account against unauthorized password theft by pairing an authenticator app.'}
            </p>
            {mfaEnabled && existingBackupCodes.length > 0 && (
              <p className="text-[11px] text-slate-500 font-mono">
                {existingBackupCodes.length} single-use backup recovery codes active
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {mfaEnabled ? (
              <>
                <button
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {showBackupCodes ? 'Hide Backup Codes' : 'View Backup Codes'}
                </button>
                <button
                  onClick={handleDisableMfa}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-800 text-xs font-semibold transition"
                >
                  Disable MFA
                </button>
              </>
            ) : (
              <button
                onClick={handleStartMfaSetup}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition"
              >
                <QrCode className="w-4 h-4" />
                <span>Pair Authenticator App</span>
              </button>
            )}
          </div>
        </div>

        {/* Existing Backup Codes Drawer */}
        {showBackupCodes && existingBackupCodes.length > 0 && (
          <div className={`mt-3 p-3 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recovery Codes</span>
              <button
                onClick={() => handleCopy(existingBackupCodes.join('\n'), 'backup')}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedBackupCodes ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedBackupCodes ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {existingBackupCodes.map((code, idx) => (
                <div key={idx} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-center font-mono text-xs font-bold text-amber-300">
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MFA Setup Modal */}
      {showMfaModal && mfaSetupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-5 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Set Up Authenticator App</h3>
                  <p className="text-xs text-slate-400">Scan QR Code with Google Authenticator or Authy</p>
                </div>
              </div>
            </div>

            {/* QR Code Display */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-300">
              <img
                src={mfaSetupData.qrCodeDataUrl}
                alt="MFA QR Code"
                className="w-48 h-48 object-contain"
              />
              <span className="text-[10px] text-slate-600 font-mono mt-1 font-semibold">
                RFC 6238 (SHA-1 • 6-Digits • 30s)
              </span>
            </div>

            {/* Manual Secret Key */}
            <div className={`p-3 rounded-2xl border space-y-1.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manual Setup Key</label>
                <button
                  type="button"
                  onClick={() => handleCopy(mfaSetupData.secret, 'secret')}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSecret ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
              <p className="font-mono text-xs font-bold text-amber-400 break-all select-all">
                {mfaSetupData.formattedSecret}
              </p>
            </div>

            {/* Emergency Recovery Codes */}
            <div className={`p-3 rounded-2xl border space-y-1.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">8 Emergency Recovery Codes</label>
                <button
                  type="button"
                  onClick={() => handleCopy(mfaSetupData.backupCodes.join('\n'), 'backup')}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  {copiedBackupCodes ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedBackupCodes ? 'Copied' : 'Copy All'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {mfaSetupData.backupCodes.map((code: string, idx: number) => (
                  <span key={idx} className="font-mono text-[11px] bg-slate-900 p-1 rounded text-center text-slate-300 font-semibold border border-slate-800">
                    {code}
                  </span>
                ))}
              </div>
            </div>

            {/* Verification Step */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold block text-slate-300">
                Enter 6-Digit Code from App to Confirm:
              </label>
              <input
                type="text"
                maxLength={6}
                value={mfaVerifyCode}
                onChange={(e) => {
                  setMfaVerifyCode(e.target.value.replace(/[^0-9]/g, ''));
                  setMfaVerifyError(null);
                }}
                placeholder="123456"
                className={`w-full p-3 rounded-xl border font-mono text-center text-xl tracking-[0.4em] font-bold ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />

              {mfaVerifyError && (
                <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{mfaVerifyError}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowMfaModal(false);
                  setMfaSetupData(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActivatingMfa || mfaVerifyCode.length < 6}
                onClick={handleConfirmMfaActivation}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition"
              >
                {isActivatingMfa ? 'Verifying & Saving...' : 'Activate MFA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security & KYC Clearance Card */}
      <div className={`p-4 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-3 border-b pb-2.5 border-slate-800">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Security Clearance & PSARA Credentials
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {profile.kycStatus}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(profile.certifications || []).map((cert, idx) => (
            <span
              key={idx}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{cert}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Editable Contact Information */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-sm font-bold border-b pb-2.5 border-slate-800 flex items-center gap-2">
          <Phone className="w-4 h-4 text-indigo-400" />
          Contact & Emergency Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Mobile Phone
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.phoneNumber}
                onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-mono text-xs ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            ) : (
              <p className="font-mono font-medium">{profile.phoneNumber || 'Not configured'}</p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Emergency Contact
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.emergencyContact}
                onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-mono text-xs ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            ) : (
              <p className="font-mono font-medium text-rose-400">{profile.emergencyContact || 'Not configured'}</p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-500" />
              Blood Group
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.bloodGroup}
                onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-mono text-xs ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            ) : (
              <p className="font-mono font-medium">{profile.bloodGroup || 'O+'}</p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Shift Roster
            </label>
            <p className="font-medium text-indigo-400">{profile.shiftSchedule || 'General Shift (09:00 - 18:00)'}</p>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Residential Address
          </label>
          {isEditing ? (
            <textarea
              rows={2}
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className={`w-full p-2.5 rounded-xl border text-xs ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          ) : (
            <p className="text-xs leading-relaxed font-medium">{profile.address || 'Enterprise Facility'}</p>
          )}
        </div>
      </div>

      {/* Device Security */}
      <div className={`p-4 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-sm font-bold border-b pb-2.5 border-slate-800 flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Hardware & Device Security
        </h3>

        <div className="grid grid-cols-1 gap-3 text-xs">
          <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 block mb-0.5">Device ID Lock</span>
            <span className="font-mono font-bold text-indigo-400">ANDR-SEC-9901-X</span>
          </div>
        </div>
      </div>
    </div>
  );
};

