import React, { useState, useEffect } from 'react';
import { PhaseAScreen, PublicJobPosting } from '../../types';
import { TalentAcquisitionService } from '../../services/talentAcquisitionService';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Search, 
  Filter, 
  Building2, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  X, 
  FileText,
  User,
  Mail,
  Phone,
  DollarSign
} from 'lucide-react';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

export const CareersPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  const [postings, setPostings] = useState<PublicJobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Application Modal state
  const [selectedJob, setSelectedJob] = useState<PublicJobPosting | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ candidateCode: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form fields
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    experienceYears: '2',
    expectedSalary: '',
    resumeUrl: '',
    notes: ''
  });

  useEffect(() => {
    loadPostings();
  }, [selectedDept]);

  const loadPostings = async () => {
    setLoading(true);
    try {
      const data = await TalentAcquisitionService.getPublicJobPostings(selectedDept);
      setPostings(data);
    } catch (err) {
      console.error('Failed to load public postings:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPostings = postings.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.jobTitle.toLowerCase().includes(term) ||
      (p.departmentName && p.departmentName.toLowerCase().includes(term)) ||
      (p.locationCity && p.locationCity.toLowerCase().includes(term)) ||
      (p.skills && p.skills.some(s => s.toLowerCase().includes(term)))
    );
  });

  const handleOpenApply = (job: PublicJobPosting) => {
    setSelectedJob(job);
    setSubmitSuccess(null);
    setSubmitError(null);
    setShowApplyModal(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
        throw new Error('Full Name, Email, and Phone are mandatory.');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        throw new Error('Please enter a valid email address.');
      }

      const result = await TalentAcquisitionService.submitPublicApplication({
        requisitionId: selectedJob.id,
        companyId: selectedJob.companyId,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        experienceYears: Number(form.experienceYears) || 0,
        expectedSalary: form.expectedSalary.trim(),
        resumeUrl: form.resumeUrl.trim(),
        notes: form.notes.trim()
      });

      if (result.success && result.candidateCode) {
        setSubmitSuccess({ candidateCode: result.candidateCode });
        setForm({
          fullName: '',
          email: '',
          phone: '',
          experienceYears: '2',
          expectedSalary: '',
          resumeUrl: '',
          notes: ''
        });
      } else {
        throw new Error(result.error || 'Failed to submit application');
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setSubmitError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Careers & Opportunities
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Join the operational workforce platform transforming facility management across India.
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl backdrop-blur-md">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by role, skill, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Dept:
            </span>
            {['ALL', 'Operations', 'Engineering', 'Security', 'Facility', 'HR'].map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  selectedDept === dept
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Active Job Openings Grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-sm text-slate-400">Loading open positions...</p>
          </div>
        ) : filteredPostings.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 space-y-4">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No active postings found</h3>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              We don't have open positions matching your search right now. Check back soon or send your spontaneous CV to hr@shouryaenterprises.com.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPostings.map((job) => (
              <div 
                key={job.id} 
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-6 rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                        {job.departmentName || 'Operations'}
                      </span>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {job.jobTitle}
                      </h3>
                      {job.companyName && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3" /> {job.companyName}
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      {job.employmentType || 'Full-Time'}
                    </span>
                  </div>

                  <p className="text-slate-300 text-sm line-clamp-3 leading-relaxed">
                    {job.jobDescription}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.skills?.slice(0, 4).map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                    {job.skills && job.skills.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">
                        +{job.skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {job.locationCity || 'On-site'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {job.experienceRequired || '1-3 Yrs'}
                    </span>
                    {job.publicSalaryRange && (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        {job.publicSalaryRange}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenApply(job)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-sm"
                  >
                    Apply Now <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Candidate Application Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setShowApplyModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {submitSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Application Received!</h3>
                <p className="text-slate-300 text-sm max-w-sm mx-auto leading-relaxed">
                  Thank you for applying to <span className="font-semibold text-white">{selectedJob.jobTitle}</span>. Your application is now in review.
                </p>
                <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl max-w-xs mx-auto">
                  <p className="text-xs text-slate-400">Candidate Tracking Reference</p>
                  <p className="text-base font-mono font-bold text-blue-400">{submitSuccess.candidateCode}</p>
                </div>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors mt-4"
                >
                  Close & Browse Other Positions
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Job Application</span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedJob.jobTitle}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                    <span>{selectedJob.departmentName || 'Operations'}</span> • 
                    <span>{selectedJob.locationCity || 'On-site'}</span> • 
                    <span>{selectedJob.employmentType || 'Full-Time'}</span>
                  </p>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          placeholder="rahul@example.com"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number *</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={form.experienceYears}
                        onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Expected Salary (Optional)</label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. ₹25,000 / mo"
                          value={form.expectedSalary}
                          onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Resume Link or Portfolio URL</label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        placeholder="https://drive.google.com/your-resume or LinkedIn"
                        value={form.resumeUrl}
                        onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Cover Note / Key Strengths</label>
                    <textarea
                      rows={3}
                      placeholder="Tell us briefly why you're a great fit for this position..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Submit Application
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

