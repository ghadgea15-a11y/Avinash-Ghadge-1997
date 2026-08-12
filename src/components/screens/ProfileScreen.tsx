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
  Fingerprint
} from 'lucide-react';
import { UserSession, CompanyTenant, UserProfileData } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { MOCK_USER_PROFILE } from '../../services/mockData';

interface ProfileScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userSession,
  activeCompany
}) => {
  const { isDark } = useTheme();
  const [profile, setProfile] = useState<UserProfileData>(MOCK_USER_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    FirestoreService.getUserProfile(userSession.userId).then((data) => {
      setProfile(data);
    });
  }, [userSession.userId]);

  const handleSave = async () => {
    await FirestoreService.saveUserProfile(userSession.userId, profile);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className={`p-4 space-y-4 overflow-y-auto max-h-full ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Toast Alert */}
      {savedSuccess && (
        <div className="bg-emerald-950 border border-emerald-800 p-3 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Profile changes saved and synced to Firestore!</span>
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
              src={userSession.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
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
                Joined: {profile.joinedDate}
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
          {profile.certifications.map((cert, idx) => (
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
              <p className="font-mono font-medium">{profile.phoneNumber}</p>
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
              <p className="font-mono font-medium text-rose-400">{profile.emergencyContact}</p>
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
              <p className="font-mono font-medium">{profile.bloodGroup}</p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Shift Roster
            </label>
            <p className="font-medium text-indigo-400">{profile.shiftSchedule}</p>
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
            <p className="text-xs leading-relaxed font-medium">{profile.address}</p>
          )}
        </div>
      </div>

      {/* Device Security & Biometric Binding */}
      <div className={`p-4 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-sm font-bold border-b pb-2.5 border-slate-800 flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4 text-emerald-400" />
          Hardware & Biometric Binding
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 block mb-0.5">Device ID Lock</span>
            <span className="font-mono font-bold text-indigo-400">ANDR-SEC-9901-X</span>
          </div>

          <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 block mb-0.5">Biometric Status</span>
            <span className="font-mono font-bold text-emerald-400">
              {userSession.isBiometricEnabled ? 'ACTIVE (FINGERPRINT)' : 'DISABLED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
