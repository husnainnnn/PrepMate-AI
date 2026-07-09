import { useEffect, useState } from "react";
import {
  X,
  Briefcase,
  MapPin,
  Calendar,
  GraduationCap,
  DollarSign,
  ClipboardList,
  Send,
  Upload,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// ─── Types ──────────────────────────────────────────────────

interface JobFull {
  _id: string;
  companyId: string;
  companyName: string;
  jobTitle: string;
  jobCategory: string;
  employmentType: string;
  workplace: string;
  country: string;
  city: string;
  officeAddress: string;
  description: string;
  responsibilities: string;
  requirements: string;
  requiredSkills: string[];
  preferredSkills: string[];
  degree: string;
  minCgpa: number;
  experienceLevel: string;
  salaryType: string;
  salaryMin: number;
  salaryMax: number;
  applicationDeadline: string | null;
  openPositions: number;
  hiringProcess: string[];
  createdAt: string;
}

interface ApplyForm {
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
  education: string;
  experience: string;
  resumeUrl: string;
  coverLetter: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

interface JobDetailModalProps {
  jobId: string;
  onClose: () => void;
  onApplied: () => void;
}

// ─── Helpers ────────────────────────────────────────────────

function formatLabel(value: string): string {
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatSalary(type: string, min: number, max: number): string {
  if (type === 'unpaid') return 'Unpaid';
  if (type === 'stipend') return `Stipend: PKR ${min.toLocaleString()}`;
  if (type === 'fixed') return `PKR ${min.toLocaleString()}`;
  if (type === 'range') return `PKR ${min.toLocaleString()} - ${max.toLocaleString()}`;
  return '';
}

const HIRING_PROCESS_LABELS: Record<string, string> = {
  'resume-screening': 'Resume Screening',
  'technical-test': 'Technical Test',
  'interview': 'Interview',
  'hr-interview': 'HR Interview',
};

// ─── Info Row ───────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#98A2B3]" />
      <div>
        <p className="text-[11px] font-medium text-[#98A2B3] uppercase tracking-wide">{label}</p>
        <p className="text-[13px] text-[#344054]">{value}</p>
      </div>
    </div>
  );
}

// ─── Tags Display ───────────────────────────────────────────

function TagsDisplay({ items, empty = "None" }: { items: string[]; empty?: string }) {
  if (!items || items.length === 0) return <span className="text-[12px] text-[#98A2B3]">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md bg-blue-50 px-2 py-0.5 text-[12px] font-medium text-[#1a6fa8]">
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────

export default function JobDetailModal({ jobId, onClose, onApplied }: JobDetailModalProps) {
  const { user, token } = useAuth();

  const [job, setJob] = useState<JobFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply form state
  const [form, setForm] = useState<ApplyForm>({
    fullName: '',
    email: '',
    phone: '',
    skills: [],
    education: '',
    experience: '',
    resumeUrl: '',
    coverLetter: '',
    linkedin: '',
    github: '',
    portfolio: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string>('');

  // Load job details
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Job not found');
        const data = await res.json();
        setJob(data.job);
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    };
    load();
  }, [jobId, token]);

  // Auto-fill form from profile + resume
  useEffect(() => {
    if (!token || !user) return;
    const autoFill = async () => {
      const base = {
        fullName: user.fullName || user.email?.split('@')[0] || '',
        email: user.email || '',
        phone: user.phone || '',
        skills: user.skills || [],
        education: user.education?.map((e: any) => `${e.degree} at ${e.institute} (${e.startYear}-${e.endYear})`).join(', ') || '',
        experience: user.experience || '',
        linkedin: user.linkedin || '',
        github: user.github || '',
        portfolio: user.portfolio || '',
        resumeUrl: '',
        coverLetter: '',
      };

      // Try to get resume data — if saved resume has file, auto-attach
      try {
        const res = await fetch('/api/resume/latest', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const resume = await res.json();
          if (resume.personalInfo?.fullName) base.fullName = resume.personalInfo.fullName;
          if (resume.personalInfo?.email) base.email = resume.personalInfo.email;
          if (resume.personalInfo?.phone) base.phone = resume.personalInfo.phone;
          if (resume.personalInfo?.linkedin) base.linkedin = resume.personalInfo.linkedin;
          if (resume.personalInfo?.github) base.github = resume.personalInfo.github;
          if (resume.personalInfo?.portfolio) base.portfolio = resume.personalInfo.portfolio;
          if (resume.skills?.length) base.skills = resume.skills;
          if (resume.education?.length) {
            base.education = resume.education
              .map((e: any) => `${e.degree || ''} at ${e.institute || ''} (${e.startYear || ''}-${e.endYear || ''})`)
              .filter(Boolean)
              .join(', ');
          }
          if (resume.experience?.length) {
            base.experience = resume.experience
              .map((e: any) => `${e.role || ''} at ${e.company || ''}`)
              .filter(Boolean)
              .join(', ');
          }
          // Auto-attach resume file URL if available from a previous upload
          if (resume.resumeFileUrl) {
            base.resumeUrl = resume.resumeFileUrl;
            setResumeFileName('Saved resume attached');
          } else if (resume.skills?.length > 0 || resume.education?.length > 0) {
            // Structured resume exists from Resume Builder — still send resumeUrl as empty
            // but mark it so user knows resume data will be used
            setResumeFileName('Resume data from your profile will be used');
          }
        }
      } catch { /* resume not available */ }

      setForm(base);
    };
    autoFill();
  }, [token, user]);

  // Handle resume file upload
  const handleResumeUpload = async (file: File) => {
    if (!token || !file) return;
    setUploadingResume(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch('/api/upload/resume', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      updateField('resumeUrl', data.url);
      setResumeFileName(file.name);

      // Save the URL to the Resume model for future auto-attach
      try {
        await fetch('/api/resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ resumeFileUrl: data.url }),
        });
      } catch { /* resume save optional */ }
    } catch (err: any) {
      setFormError(err.message || 'Failed to upload resume');
    }
    setUploadingResume(false);
  };

  const updateField = (field: keyof ApplyForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!token || !job) return;

    // Validate
    if (!form.fullName.trim()) { setFormError('Full name is required.'); return; }
    if (!form.email.trim()) { setFormError('Email is required.'); return; }
    if (!form.education.trim()) { setFormError('Education is required.'); return; }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobId: job._id,
          companyName: job.companyName,
          jobTitle: job.jobTitle,
          location: `${job.city}, ${job.country}`,
          ...form,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to submit application');
      }

      setApplied(true);
      onApplied();
    } catch (err: any) {
      setFormError(err.message);
    }

    setSubmitting(false);
  };

  // Close on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-10 pb-10">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#667085] shadow-sm backdrop-blur-sm transition-colors hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#EAECF0] border-t-[#1a6fa8]" />
          </div>
        ) : error || !job ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="mt-3 text-[14px] font-medium text-[#667085]">{error || 'Job not found'}</p>
          </div>
        ) : applied ? (
          /* ── Success State ───────────────────────────── */
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#101828]">Application Submitted!</h2>
            <p className="mt-2 text-[14px] text-[#667085] text-center max-w-md">
              You've successfully applied for <strong>{job.jobTitle}</strong> at <strong>{job.companyName}</strong>.
              The company will review your application and get back to you.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-[#1a6fa8] px-6 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#155a8a]"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Job Details + Apply Form ────────────────── */
          <div className="grid grid-cols-1 divide-y divide-[#EAECF0] md:grid-cols-5 md:divide-x md:divide-y-0">
            {/* LEFT: Job Details */}
            <div className="col-span-3 space-y-5 overflow-y-auto p-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-semibold text-[#101828]">{job.jobTitle}</h2>
                <p className="mt-1 text-[14px] text-[#667085]">{job.companyName}</p>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-2">
                {job.employmentType && (
                  <span className="rounded-full border border-[#EAECF0] px-3 py-1 text-[11px] font-medium text-[#667085]">
                    {formatLabel(job.employmentType)}
                  </span>
                )}
                {job.workplace && (
                  <span className="rounded-full border border-[#EAECF0] px-3 py-1 text-[11px] font-medium text-[#667085]">
                    {formatLabel(job.workplace)}
                  </span>
                )}
                {job.jobCategory && (
                  <span className="rounded-full border border-[#EAECF0] px-3 py-1 text-[11px] font-medium text-[#667085]">
                    {job.jobCategory}
                  </span>
                )}
                <span className="rounded-full border border-[#EAECF0] px-3 py-1 text-[11px] font-medium text-[#667085]">
                  {formatLabel(job.experienceLevel)} experience
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={MapPin} label="Location" value={`${job.city}, ${job.country}`} />
                <InfoRow icon={Briefcase} label="Positions" value={job.openPositions > 0 ? `${job.openPositions} open` : ''} />
                <InfoRow icon={DollarSign} label="Salary" value={formatSalary(job.salaryType, job.salaryMin, job.salaryMax)} />
                <InfoRow icon={Calendar} label="Deadline" value={job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : ''} />
                <InfoRow icon={GraduationCap} label="Degree Required" value={job.degree ? formatLabel(job.degree) : ''} />
                {job.minCgpa > 0 && (
                  <InfoRow icon={GraduationCap} label="Min CGPA" value={`${job.minCgpa}`} />
                )}
              </div>

              {/* Description */}
              {job.description && (
                <div>
                  <h3 className="mb-1.5 text-[13px] font-semibold text-[#101828]">Job Description</h3>
                  <p className="text-[13px] leading-relaxed text-[#344054] whitespace-pre-line">{job.description}</p>
                </div>
              )}

              {/* Responsibilities */}
              {job.responsibilities && (
                <div>
                  <h3 className="mb-1.5 text-[13px] font-semibold text-[#101828]">Responsibilities</h3>
                  <p className="text-[13px] leading-relaxed text-[#344054] whitespace-pre-line">{job.responsibilities}</p>
                </div>
              )}

              {/* Requirements */}
              {job.requirements && (
                <div>
                  <h3 className="mb-1.5 text-[13px] font-semibold text-[#101828]">Requirements</h3>
                  <p className="text-[13px] leading-relaxed text-[#344054] whitespace-pre-line">{job.requirements}</p>
                </div>
              )}

              {/* Required Skills */}
              <div>
                <h3 className="mb-1.5 text-[13px] font-semibold text-[#101828]">Required Skills</h3>
                <TagsDisplay items={job.requiredSkills} empty="No specific skills listed" />
              </div>

              {/* Preferred Skills */}
              {job.preferredSkills?.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-[13px] font-semibold text-[#101828]">Preferred Skills</h3>
                  <TagsDisplay items={job.preferredSkills} />
                </div>
              )}

              {/* Hiring Process */}
              {job.hiringProcess?.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-[13px] font-semibold text-[#101828]">Hiring Process</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.hiringProcess.map((step) => (
                      <span key={step} className="flex items-center gap-1.5 rounded-lg border border-[#EAECF0] px-3 py-1.5 text-[12px] text-[#667085]">
                        <ClipboardList className="h-3.5 w-3.5" />
                        {HIRING_PROCESS_LABELS[step] || formatLabel(step)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Posted Date */}
              <p className="text-[11px] text-[#98A2B3]">
                Posted {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* RIGHT: Apply Form */}
            <div className="col-span-2 p-6">
              <h3 className="mb-1 text-[15px] font-semibold text-[#101828]">Apply for this Job</h3>
              <p className="mb-5 text-[12px] text-[#667085]">
                Your profile and resume info are auto-filled. Edit if needed.
              </p>

              {formError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">Full Name *</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                    placeholder="Your full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">Email *</label>
                  <input
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                    placeholder="your@email.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                    placeholder="+92 300 1234567"
                  />
                </div>

                {/* Skills (tags) */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">Skills</label>
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 min-h-[38px]">
                    {form.skills.map((s, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-[#1a6fa8]">
                        {s}
                        <button type="button" onClick={() => updateField('skills', form.skills.filter((_, j) => j !== i))} className="hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      placeholder={form.skills.length === 0 ? "Add skill..." : ""}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !form.skills.includes(val)) {
                            updateField('skills', [...form.skills, val]);
                          }
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="min-w-[80px] flex-1 border-0 bg-transparent text-[12px] text-[#101828] outline-none placeholder:text-[#98A2B3]"
                    />
                  </div>
                </div>

                {/* Education */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">Education <span className="text-red-500">*</span></label>
                  <input
                    value={form.education}
                    onChange={(e) => updateField('education', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                    placeholder="e.g. BSCS, FAST University 2022-2026"
                  />
                </div>

                {/* Experience */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">Experience</label>
                  <input
                    value={form.experience}
                    onChange={(e) => updateField('experience', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                    placeholder="e.g. Frontend at TechFlow, 2024-Present"
                  />
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">LinkedIn URL</label>
                  <input
                    value={form.linkedin}
                    onChange={(e) => updateField('linkedin', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                {/* GitHub */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">GitHub URL</label>
                  <input
                    value={form.github}
                    onChange={(e) => updateField('github', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                    placeholder="https://github.com/..."
                  />
                </div>

                {/* Portfolio */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">Portfolio URL</label>
                  <input
                    value={form.portfolio}
                    onChange={(e) => updateField('portfolio', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                    placeholder="https://..."
                  />
                </div>

                {/* Resume URL */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">Resume URL or Upload</label>
                  <div className="flex gap-2">
                    <input
                      value={form.resumeUrl}
                      onChange={(e) => updateField('resumeUrl', e.target.value)}
                      className="flex-1 rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                      placeholder="Link to your resume"
                    />
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#D0D5DD] px-3 py-2 text-[12px] font-medium text-[#667085] hover:bg-gray-50 disabled:opacity-50">
                      {uploadingResume ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D0D5DD] border-t-[#1a6fa8]" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadingResume ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleResumeUpload(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {resumeFileName && (
                    <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {resumeFileName}
                    </p>
                  )}
                </div>

                {/* Cover Letter */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#344054]">Cover Letter (optional)</label>
                  <textarea
                    value={form.coverLetter}
                    onChange={(e) => updateField('coverLetter', e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                    placeholder="Why are you a good fit for this role?"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
