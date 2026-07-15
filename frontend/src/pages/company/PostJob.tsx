import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Briefcase,
  MapPin,
  FileText,
  Wrench,
  GraduationCap,
  DollarSign,
  ClipboardList,
  Send,
  X,
  AlertCircle,
  CheckCircle,
  Trash2,
  EyeOff,
  ChevronDown,
  PencilLine,
  Crown,
} from "lucide-react";

import { CompanyDashboardLayout } from "@/components/company/CompanyDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useCachedFetch } from '@/hooks/useCachedFetch'
import { TTL } from '@/lib/apiCache'

// ─── Types ──────────────────────────────────────────────────

interface JobForm {
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
  minCgpa: string;
  experienceLevel: string;
  salaryType: string;
  salaryMin: string;
  salaryMax: string;
  applicationDeadline: string;
  openPositions: string;
  hiringProcess: string[];
}

interface Job extends JobForm {
  _id: string;
  companyId: string;
  companyName: string;
  isClosed: boolean;
  closedAt: string | null;
  createdAt: string;
}

const emptyForm: JobForm = {
  jobTitle: "",
  jobCategory: "",
  employmentType: "",
  workplace: "",
  country: "",
  city: "",
  officeAddress: "",
  description: "",
  responsibilities: "",
  requirements: "",
  requiredSkills: [],
  preferredSkills: [],
  degree: "",
  minCgpa: "",
  experienceLevel: "",
  salaryType: "",
  salaryMin: "",
  salaryMax: "",
  applicationDeadline: "",
  openPositions: "1",
  hiringProcess: [],
};

// ─── Constants ──────────────────────────────────────────────

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
  { value: "remote-internship", label: "Remote Internship" },
];

const WORKPLACE_TYPES = [
  { value: "on-site", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];

const DEGREE_OPTIONS = [
  { value: "bscs", label: "BSCS" },
  { value: "bsse", label: "BSSE" },
  { value: "bsit", label: "BSIT" },
  { value: "bba", label: "BBA" },
  { value: "any", label: "Any" },
];

const EXPERIENCE_LEVELS = [
  { value: "fresh", label: "Fresh" },
  { value: "0-1-year", label: "0–1 Year" },
  { value: "1-3-years", label: "1–3 Years" },
  { value: "3-plus-years", label: "3+ Years" },
];

const SALARY_TYPES = [
  { value: "fixed", label: "Fixed" },
  { value: "range", label: "Range" },
  { value: "unpaid", label: "Unpaid" },
  { value: "stipend", label: "Stipend" },
];

const HIRING_PROCESS_OPTIONS = [
  { value: "resume-screening", label: "Resume Screening" },
  { value: "technical-test", label: "Technical Test" },
  { value: "interview", label: "Interview" },
  { value: "hr-interview", label: "HR Interview" },
];

const JOB_CATEGORIES = [
  "Software Engineering",
  "Data Science",
  "Design",
  "Product Management",
  "Marketing",
  "Sales",
  "Finance",
  "Human Resources",
  "Customer Support",
  "DevOps",
  "AI / ML",
  "Cybersecurity",
  "Mobile Development",
  "Other",
];

// ─── Tags Input Component ───────────────────────────────────

function TagsInput({
  label,
  tags,
  onChange,
  placeholder = "Type and press Enter",
  inputRef,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [input, setInput] = useState("");

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (i: number) => {
    onChange(tags.filter((_, idx) => idx !== i));
  };

  // Render label with red asterisk if present
  const renderLabel = () => {
    if (label.endsWith(' *')) {
      return <><span>{label.slice(0, -2)}</span> <span className="text-red-500">*</span></>;
    }
    return label;
  };

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">{renderLabel()}</label>
      <div className="min-h-[42px] rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 focus-within:border-[#1a6fa8] focus-within:ring-1 focus-within:ring-[#1a6fa8]/20">
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[12px] font-medium text-[#1a6fa8]"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(input);
              }
              if (e.key === "Backspace" && !input && tags.length > 0) {
                removeTag(tags.length - 1);
              }
            }}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="min-w-[120px] flex-1 border-0 bg-transparent text-[13px] text-[#101828] outline-none placeholder:text-[#98A2B3]"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Multi-Select Checkbox Group ────────────────────────────

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-all ${
              selected.includes(opt.value)
                ? "border-[#1a6fa8] bg-blue-50 text-[#1a6fa8]"
                : "border-[#D0D5DD] bg-white text-[#667085] hover:border-[#98A2B3]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Select Input ───────────────────────────────────────────

function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  selectRef,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  selectRef?: React.RefObject<HTMLSelectElement | null>;
  disabled?: boolean;
}) {
  // Render label with red asterisk if present
  const renderLabel = () => {
    if (label.endsWith(' *')) {
      return <><span>{label.slice(0, -2)}</span> <span className="text-red-500">*</span></>;
    }
    return label;
  };

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">{renderLabel()}</label>
      <div className="relative">
        <select
          ref={selectRef as React.RefObject<HTMLSelectElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-lg border px-3 py-2.5 pr-8 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 ${
            disabled ? 'cursor-not-allowed bg-gray-50 text-[#667085]' : 'border-[#D0D5DD] bg-white'
          }`}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
      </div>
    </div>
  );
}

// ─── Form Section Wrapper ───────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Icon className="h-4.5 w-4.5 text-[#1a6fa8]" />
          </div>
          <h2 className="text-[15px] font-semibold text-[#101828]">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Job Management Card ────────────────────────────────────

function JobManagementCard({
  jobs,
  token,
  onRefresh,
  onEdit,
  disabled,
}: {
  jobs: Job[];
  token: string;
  onRefresh: () => void;
  onEdit: (job: Job) => void;
  disabled?: boolean;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleClose = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await fetch(`/api/company/jobs/${jobId}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleReopen = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await fetch(`/api/company/jobs/${jobId}/reopen`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleDelete = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await fetch(`/api/company/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteConfirm(null);
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  if (jobs.length === 0) {
    return (
      <Card className="rounded-xl border-[#EAECF0] shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <ClipboardList className="h-4.5 w-4.5 text-[#1a6fa8]" />
            </div>
            <h2 className="text-[15px] font-semibold text-[#101828]">Your Job Postings</h2>
          </div>
          <p className="mt-3 text-[13px] text-[#667085]">You haven't posted any jobs yet. Fill out the form above to create your first job listing.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <ClipboardList className="h-4.5 w-4.5 text-[#1a6fa8]" />
          </div>
          <h2 className="text-[15px] font-semibold text-[#101828]">Your Job Postings</h2>
          <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#1a6fa8]">
            {jobs.length} total
          </span>
        </div>
        <div className="divide-y divide-[#EAECF0]">
          {jobs.map((job) => (
            <div key={job._id} className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`truncate text-[13.5px] font-medium ${job.isClosed ? 'text-[#98A2B3] line-through' : 'text-[#101828]'}`}>
                    {job.jobTitle}
                  </p>
                  {job.isClosed ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Closed</span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Active</span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-[#667085]">
                  {job.employmentType.replace('-', ' ')} · {job.workplace.replace('-', ' ')} · {job.country || 'Remote'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Edit button — loads job data into form */}
                <button
                  onClick={() => onEdit(job)}
                  disabled={disabled || actionLoading === job._id}
                  className="flex items-center gap-1 rounded-lg border border-[#EAECF0] px-2 py-1.5 text-[11px] font-medium text-[#667085] transition-colors hover:bg-blue-50 hover:text-[#1a6fa8] disabled:opacity-30 disabled:cursor-not-allowed"
                  title={disabled ? 'Save or cancel current edit first' : 'Edit job posting'}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                {!job.isClosed && (
                  <button
                    onClick={() => handleClose(job._id)}
                    disabled={disabled || actionLoading === job._id}
                    className="flex items-center gap-1 rounded-lg border border-[#EAECF0] px-2 py-1.5 text-[11px] font-medium text-[#667085] transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={disabled ? 'Save or cancel current edit first' : 'Close job (hide from students)'}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                )}
                {job.isClosed && (
                  <button
                    onClick={() => handleReopen(job._id)}
                    disabled={disabled || actionLoading === job._id}
                    className="flex items-center gap-1 rounded-lg border border-[#EAECF0] px-2 py-1.5 text-[11px] font-medium text-[#667085] transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={disabled ? 'Save or cancel current edit first' : 'Reopen job'}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Reopen</span>
                  </button>
                )}
                {deleteConfirm === job._id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(job._id)}
                      disabled={disabled || actionLoading === job._id}
                      className="rounded-lg bg-red-500 px-2 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {actionLoading === job._id ? '...' : <><span className="hidden sm:inline">Confirm</span><span className="sm:hidden">✓</span></>}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      disabled={disabled}
                      className="rounded-lg border border-[#EAECF0] px-2 py-1.5 text-[11px] font-medium text-[#667085] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Cancel</span><span className="sm:hidden">✕</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(job._id)}
                    disabled={disabled}
                    className="flex items-center gap-1 rounded-lg border border-[#EAECF0] px-2 py-1.5 text-[11px] font-medium text-[#667085] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={disabled ? 'Save or cancel current edit first' : 'Delete permanently from database'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[#98A2B3]">
          <strong>Close</strong> = hides from students but keeps data. <strong>Delete</strong> = permanently removes from database.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function PostJob() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<JobForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingJobs, setExistingJobs] = useState<Job[]>([]);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const companyName = user?.companyName || user?.fullName || "";

  // Refs for scroll-to-field validation
  const jobTitleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const employmentTypeRef = useRef<HTMLSelectElement>(null);
  const workplaceRef = useRef<HTMLSelectElement>(null);
  const countryRef = useRef<HTMLSelectElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const degreeRef = useRef<HTMLSelectElement>(null);
  const salaryTypeRef = useRef<HTMLSelectElement>(null);
  const requiredSkillsRef = useRef<HTMLInputElement>(null);

  // Scroll and focus to an element
  const scrollToField = (el: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.focus(), 400);
  };

  // ── Load company plan via cache (reuses dashboard cache) ──
  const { data: dashData } = useCachedFetch<{ company: { plan: string; name: string } }>(
    token ? '/api/companies/dashboard' : null,
    { headers: { Authorization: `Bearer ${token}` } } as any,
    TTL.DYNAMIC
  );
  const companyData = dashData?.company
    ? { plan: dashData.company.plan, companyName: dashData.company.name }
    : null;

  // Load existing jobs
  const loadJobs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/company/jobs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExistingJobs(data.jobs || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadJobs();
  }, [token]);

  // Count jobs posted this month
  const thisMonthJobs = existingJobs.filter(job => {
    const created = new Date(job.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;
  const isPro = companyData?.plan === 'pro';
  const jobsRemaining = isPro ? Infinity : Math.max(0, 2 - thisMonthJobs);

  // Update a single field
  const update = (field: keyof JobForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Validate required fields and scroll/focus to first error
  const validateAndScroll = (): boolean => {
    if (!form.jobTitle.trim()) { setError('Job Title is required.'); scrollToField(jobTitleRef.current); return false; }
    if (!form.description.trim()) { setError('Job Description is required.'); scrollToField(descriptionRef.current); return false; }
    if (!form.employmentType) { setError('Employment Type is required.'); scrollToField(employmentTypeRef.current); return false; }
    if (!form.workplace) { setError('Workplace type is required.'); scrollToField(workplaceRef.current); return false; }
    if (!form.country) { setError('Country is required.'); scrollToField(countryRef.current); return false; }
    if (!form.city.trim()) { setError('City is required.'); scrollToField(cityRef.current); return false; }
    if (!form.degree) { setError('Degree requirement is required.'); scrollToField(degreeRef.current); return false; }
    if (!form.salaryType) { setError('Salary Type is required.'); scrollToField(salaryTypeRef.current); return false; }
    if (form.requiredSkills.length === 0) { setError('At least one Required Skill is required.'); scrollToField(requiredSkillsRef.current); return false; }
    return true;
  };

  // Load job data into form for editing
  const startEditing = (job: Job) => {
    setEditingJobId(job._id);
    setForm({
      jobTitle: job.jobTitle || '',
      jobCategory: job.jobCategory || '',
      employmentType: job.employmentType || '',
      workplace: job.workplace || '',
      country: job.country || '',
      city: job.city || '',
      officeAddress: job.officeAddress || '',
      description: job.description || '',
      responsibilities: job.responsibilities || '',
      requirements: job.requirements || '',
      requiredSkills: job.requiredSkills || [],
      preferredSkills: job.preferredSkills || [],
      degree: job.degree || '',
      minCgpa: job.minCgpa?.toString() || '',
      experienceLevel: job.experienceLevel || '',
      salaryType: job.salaryType || '',
      salaryMin: job.salaryMin?.toString() || '',
      salaryMax: job.salaryMax?.toString() || '',
      applicationDeadline: job.applicationDeadline ? job.applicationDeadline.split('T')[0] : '',
      openPositions: job.openPositions?.toString() || '1',
      hiringProcess: job.hiringProcess || [],
    });
    setError(null);
    setSuccess(false);
    // Scroll to form top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingJobId(null);
    setForm(emptyForm);
    setError(null);
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!validateAndScroll()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const body = {
        ...form,
        experienceLevel: form.experienceLevel || 'fresh',
        minCgpa: form.minCgpa ? parseFloat(form.minCgpa) : 0,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin) : 0,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax) : 0,
        openPositions: form.openPositions ? parseInt(form.openPositions) : 1,
        applicationDeadline: form.applicationDeadline || null,
      };

      const isEditing = editingJobId !== null;
      const url = isEditing ? `/api/company/jobs/${editingJobId}` : '/api/company/jobs';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (errData?.code === 'LIMIT_REACHED') {
          setError('Free plan allows only 2 job postings per month. ');
        } else {
          throw new Error(errData?.error || 'Failed to save job');
        }
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setForm(emptyForm);
      setEditingJobId(null);
      await loadJobs();

      // Scroll to top to show success
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Reset success after 4 seconds
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }

    setSubmitting(false);
  };

  return (
    <CompanyDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#101828] sm:text-2xl">Post a Job</h1>
            <p className="mt-1 text-[12.5px] text-[#667085] sm:text-[13.5px]">
              Create a detailed job listing to attract top talent. Fields marked with * are required.
            </p>
          </div>
          {/* Plan indicator */}
          {companyData && (
            <div className="self-start sm:self-auto">
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                  ⭐ PRO — Unlimited Jobs
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-medium text-[#1a6fa8]">
                  <Crown className="h-3.5 w-3.5" />
                  {jobsRemaining} / 2 jobs remaining this month
                </span>
              )}
            </div>
          )}
        </div>

        {/* Success Banner */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-[13.5px] font-medium text-emerald-800">
                {editingJobId ? 'Job updated successfully!' : 'Job posted successfully!'}
              </p>
              <p className="text-[12.5px] text-emerald-600">
                {editingJobId ? 'Changes are now live.' : 'Your job listing is now live and visible to students.'}
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-[13.5px] font-medium text-red-700">
              {error}
              {error.includes('2 job postings') && (
                <Link to="/company/pro-plan" className="ml-1 underline hover:text-red-800">
                  Upgrade to Pro →
                </Link>
              )}
            </p>
          </div>
        )}

        {/* Existing Jobs Management */}
        <JobManagementCard jobs={existingJobs} token={token || ''} onRefresh={loadJobs} onEdit={startEditing} disabled={editingJobId !== null} />

        {/* Post Job Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── 1. Basic Information ─────────────────────── */}
          <Section icon={Briefcase} title="Basic Information">
            <div className="space-y-4">
              {editingJobId && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-[12.5px] font-medium text-amber-700">
                  ⓘ Basic information cannot be edited after posting.
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={jobTitleRef}
                    value={form.jobTitle}
                    onChange={(e) => update('jobTitle', e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    disabled={editingJobId !== null}
                    className={`w-full rounded-lg border px-3 py-2.5 text-[13px] outline-none transition-all placeholder:text-[#98A2B3] ${
                      editingJobId
                        ? 'cursor-not-allowed border-[#D0D5DD] bg-gray-50 text-[#667085]'
                        : 'border-[#D0D5DD] bg-white text-[#101828] focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">
                    Company Name
                  </label>
                  <input
                    value={companyName}
                    disabled
                    className="w-full rounded-lg border border-[#D0D5DD] bg-gray-50 px-3 py-2.5 text-[13px] text-[#667085] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SelectInput
                  label="Job Category"
                  value={form.jobCategory}
                  onChange={(v) => update('jobCategory', v)}
                  options={JOB_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  placeholder="Select category"
                  disabled={editingJobId !== null}
                />
                <SelectInput
                  label="Employment Type *"
                  value={form.employmentType}
                  onChange={(v) => update('employmentType', v)}
                  options={EMPLOYMENT_TYPES}
                  selectRef={employmentTypeRef}
                  disabled={editingJobId !== null}
                />
                <SelectInput
                  label="Workplace *"
                  value={form.workplace}
                  onChange={(v) => update('workplace', v)}
                  options={WORKPLACE_TYPES}
                  selectRef={workplaceRef}
                  disabled={editingJobId !== null}
                />
              </div>
            </div>
          </Section>

          {/* ── 2. Location ─────────────────────────────── */}
          <Section icon={MapPin} title="Location">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectInput
                label="Country *"
                value={form.country}
                onChange={(v) => update('country', v)}
                options={[
                  { value: 'Pakistan', label: 'Pakistan' },
                  { value: 'USA', label: 'United States' },
                  { value: 'UK', label: 'United Kingdom' },
                  { value: 'UAE', label: 'UAE' },
                  { value: 'Canada', label: 'Canada' },
                  { value: 'Australia', label: 'Australia' },
                  { value: 'India', label: 'India' },
                  { value: 'Other', label: 'Other' },
                ]}
                placeholder="Select country"
                selectRef={countryRef}
              />
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">City <span className="text-red-500">*</span></label>
                <input
                  ref={cityRef}
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder="e.g. Lahore, Karachi, Islamabad"
                  className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Office Address (optional)</label>
                <input
                  value={form.officeAddress}
                  onChange={(e) => update('officeAddress', e.target.value)}
                  placeholder="e.g. 5th Floor, Tower A"
                  className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                />
              </div>
            </div>
          </Section>

          {/* ── 3. Job Description ──────────────────────── */}
          <Section icon={FileText} title="Job Description">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">
                  Job Description <span className="text-red-500">*</span>
                </label>                  <textarea
                    ref={descriptionRef}
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    placeholder="Describe the role, team, and company..."
                    rows={5}
                    className="w-full resize-y rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                    required
                  />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Responsibilities</label>
                  <textarea
                    value={form.responsibilities}
                    onChange={(e) => update('responsibilities', e.target.value)}
                    placeholder="What will the candidate do?"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Requirements</label>
                  <textarea
                    value={form.requirements}
                    onChange={(e) => update('requirements', e.target.value)}
                    placeholder="What skills and experience are required?"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ── 4. Skills ───────────────────────────────── */}
          <Section icon={Wrench} title="Skills">
            <div className="space-y-4">
              <TagsInput
                label="Required Skills *"
                tags={form.requiredSkills}
                onChange={(tags) => update('requiredSkills', tags)}
                placeholder="e.g. React, Node.js, MongoDB"
                inputRef={requiredSkillsRef}
              />
              <TagsInput
                label="Preferred Skills (optional)"
                tags={form.preferredSkills}
                onChange={(tags) => update('preferredSkills', tags)}
                placeholder="e.g. TypeScript, AWS, Docker"
              />
            </div>
          </Section>

          {/* ── 5. Eligibility ──────────────────────────── */}
          <Section icon={GraduationCap} title="Eligibility">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectInput
                label="Degree *"
                value={form.degree}
                onChange={(v) => update('degree', v)}
                options={DEGREE_OPTIONS}
                selectRef={degreeRef}
              />
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Minimum CGPA (optional)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="4.0"
                  value={form.minCgpa}
                  onChange={(e) => update('minCgpa', e.target.value)}
                  placeholder="e.g. 3.0"
                  className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                />
              </div>
              <SelectInput
                label="Experience Level"
                value={form.experienceLevel}
                onChange={(v) => update('experienceLevel', v)}
                options={EXPERIENCE_LEVELS}
              />
            </div>
          </Section>

          {/* ── 6. Salary ───────────────────────────────── */}
          <Section icon={DollarSign} title="Salary">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectInput
                label="Salary Type *"
                value={form.salaryType}
                onChange={(v) => update('salaryType', v)}
                options={SALARY_TYPES}
                selectRef={salaryTypeRef}
              />
              {form.salaryType === 'fixed' && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Salary Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={form.salaryMin}
                    onChange={(e) => {
                      update('salaryMin', e.target.value);
                      update('salaryMax', '');
                    }}
                    placeholder="e.g. 150000"
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                  />
                </div>
              )}
              {form.salaryType === 'range' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Min Salary</label>
                    <input
                      type="number"
                      min="0"
                      value={form.salaryMin}
                      onChange={(e) => update('salaryMin', e.target.value)}
                      placeholder="e.g. 100000"
                      className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Max Salary</label>
                    <input
                      type="number"
                      min="0"
                      value={form.salaryMax}
                      onChange={(e) => update('salaryMax', e.target.value)}
                      placeholder="e.g. 200000"
                      className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                    />
                  </div>
                </>
              )}
              {form.salaryType === 'stipend' && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Stipend Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={form.salaryMin}
                    onChange={(e) => update('salaryMin', e.target.value)}
                    placeholder="e.g. 40000"
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
                  />
                </div>
              )}
              {form.salaryType === 'unpaid' && (
                <div className="flex items-center rounded-lg bg-amber-50 px-4 py-3 text-[12.5px] text-amber-700">
                  Selected as unpaid position. No salary will be displayed.
                </div>
              )}
            </div>
          </Section>

          {/* ── 7. Application Details ──────────────────── */}
          <Section icon={ClipboardList} title="Application Details">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Application Deadline (optional)</label>
                  <input
                    type="date"
                    value={form.applicationDeadline}
                    onChange={(e) => update('applicationDeadline', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Number of Open Positions</label>
                  <input
                    type="number"
                    min="1"
                    value={form.openPositions}
                    onChange={(e) => update('openPositions', e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20"
                  />
                </div>
              </div>

              <CheckboxGroup
                label="Hiring Process"
                options={HIRING_PROCESS_OPTIONS}
                selected={form.hiringProcess}
                onChange={(v) => update('hiringProcess', v)}
              />
            </div>
          </Section>

          {/* ── Submit ──────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-end gap-3 pb-8">
            {editingJobId && (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-lg border border-[#D0D5DD] px-5 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/company/dashboard')}
              className="rounded-lg border border-[#D0D5DD] px-4 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-gray-50"
            >
              <span className="hidden sm:inline">Cancel</span><span className="sm:hidden">✕ Back</span>
            </button>
            <button
              type="submit"
              disabled={submitting || !form.jobTitle.trim()}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
            >
              {submitting ? (
                editingJobId ? "Updating..." : "Posting..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>{editingJobId ? 'Update' : 'Post'}</span>
                  <span className="hidden sm:inline"> Job</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </CompanyDashboardLayout>
  );
}
