import { useEffect, useState } from "react";
import {
  Brain,
  Briefcase,
  ExternalLink,
  XCircle,
  Trash2,
  ChevronRight,
  Search,
  Star,
  GraduationCap,
  FileText,
  Mail,
  Phone,
  Link as LinkIcon,
} from "lucide-react";
import { CompanyDashboardLayout } from "@/components/company/CompanyDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

// ─── Types ──────────────────────────────────────────────────

interface Applicant {
  _id: string;
  studentId: string;
  jobId: string;
  companyName: string;
  jobTitle: string;
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
  currentStage: string;
  isRejected: boolean;
  hiddenFromCompany: boolean;
  appliedDate: string;
  matchScore: number;
  matchedSkills: string[];
  requiredSkills: string[];
}

// ─── Helpers ────────────────────────────────────────────────

function stageBadge(stage: string, isRejected: boolean) {
  const map: Record<string, string> = {
    applied: "bg-gray-50 text-gray-700 border-gray-200",
    under_review: "bg-blue-50 text-blue-700 border-blue-200",
    shortlisted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    hired: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  if (isRejected) return "bg-red-50 text-red-700 border-red-200";
  return map[stage] || "bg-gray-50 text-gray-600 border-gray-100";
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    applied: "Applied",
    under_review: "Under Review",
    shortlisted: "Shortlisted",
    rejected: "Rejected",
    hired: "Hired",
  };
  return map[stage] || stage;
}

function getInitials(name: string): string {
  if (!name || name === "Unknown") return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function ensureHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 70) return "text-[#1a6fa8] bg-blue-50 border-blue-200";
  return "text-amber-600 bg-amber-50 border-amber-200";
}

// ─── Applicant Detail Panel ─────────────────────────────────

function ApplicantDetail({ app, onBack }: { app: Applicant; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[12px] font-medium text-[#1a6fa8] hover:underline"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Back to screening
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-[#1a6fa8]">
          {getInitials(app.fullName)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[#101828]">{app.fullName || "Unknown"}</h2>
            <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${scoreColor(app.matchScore)}`}>
              {app.matchScore}% Match
            </Badge>
          </div>
          <p className="text-[13px] text-[#667085]">
            Applied for <strong>{app.jobTitle}</strong>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${stageBadge(app.currentStage, app.isRejected)}`}>
              {app.isRejected ? "Rejected" : stageLabel(app.currentStage)}
            </Badge>
            <span className="text-[11px] text-[#98A2B3]">Applied {app.appliedDate}</span>
          </div>
        </div>
      </div>

      {/* Matched Skills */}
      {app.matchedSkills?.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-[13px] font-semibold text-[#101828]">Matched Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {app.matchedSkills.map((s) => (
              <span key={s} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {app.email && (
          <div className="flex items-center gap-2 text-[13px] text-[#344054]">
            <Mail className="h-4 w-4 text-[#98A2B3]" /> {app.email}
          </div>
        )}
        {app.phone && (
          <div className="flex items-center gap-2 text-[13px] text-[#344054]">
            <Phone className="h-4 w-4 text-[#98A2B3]" /> {app.phone}
          </div>
        )}
        {app.linkedin && (
          <a href={ensureHttps(app.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-[#1a6fa8] hover:underline">
            <LinkIcon className="h-4 w-4 text-[#98A2B3]" /> LinkedIn
          </a>
        )}
        {app.github && (
          <a href={ensureHttps(app.github)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-[#1a6fa8] hover:underline">
            <LinkIcon className="h-4 w-4 text-[#98A2B3]" /> GitHub
          </a>
        )}
        {app.portfolio && (
          <a href={ensureHttps(app.portfolio)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-[#1a6fa8] hover:underline">
            <ExternalLink className="h-4 w-4 text-[#98A2B3]" /> Portfolio
          </a>
        )}
      </div>

      {app.education && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#101828]">
            <GraduationCap className="h-4 w-4 text-[#1a6fa8]" /> Education
          </h3>
          <p className="text-[13px] text-[#344054]">{app.education}</p>
        </div>
      )}

      {app.experience && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#101828]">
            <Briefcase className="h-4 w-4 text-[#1a6fa8]" /> Experience
          </h3>
          <p className="text-[13px] text-[#344054]">{app.experience}</p>
        </div>
      )}

      {app.skills?.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-[13px] font-semibold text-[#101828]">All Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {app.skills.map((s) => (
              <span key={s} className="rounded-md bg-blue-50 px-2 py-0.5 text-[12px] font-medium text-[#1a6fa8]">{s}</span>
            ))}
          </div>
        </div>
      )}

      {app.coverLetter && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#101828]">
            <FileText className="h-4 w-4 text-[#1a6fa8]" /> Cover Letter
          </h3>
          <p className="text-[13px] leading-relaxed text-[#344054] whitespace-pre-line">{app.coverLetter}</p>
        </div>
      )}

      {app.resumeUrl && (
        <a
          href={app.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1a6fa8] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#155a8a]"
        >
          <ExternalLink className="h-4 w-4" /> View Resume
        </a>
      )}
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className || ''}`} />;
}

// ─── Page ───────────────────────────────────────────────────

export default function AIScreeningPage() {
  const { token } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/company/screening', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApplicants(data.applicants || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleView = async (app: Applicant) => {
    setSelectedApplicant(app);
    if (app.currentStage === 'applied' && token) {
      try {
        await fetch(`/api/company/applicants/${app._id}/review`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        fetchData();
      } catch { /* ignore */ }
    }
  };

  const handleAction = async (id: string, action: string) => {
    if (!token) return;
    const key = `${action}-${id}`;
    setActionLoading(key);
    try {
      const method = action === 'delete' ? 'DELETE' : 'PATCH';
      const endpoint = action === 'delete' ? `/api/company/applicants/${id}` :
                       `/api/company/applicants/${id}/${action}`;
      await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      setDeleteConfirm(null);
      setSelectedApplicant(null);
      fetchData();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const filteredApplicants = applicants.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.fullName?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.jobTitle?.toLowerCase().includes(q)
    );
  });

  const avgScore = applicants.length > 0
    ? Math.round(applicants.reduce((sum, a) => sum + a.matchScore, 0) / applicants.length)
    : 0;

  return (
    <CompanyDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">AI Screening</h1>
            <p className="mt-1 text-[13.5px] text-[#667085]">
              {applicants.length} candidate{applicants.length !== 1 ? 's' : ''} with AI match scores ≥ 50%.
              Avg score: <strong>{avgScore}%</strong>
            </p>
          </div>
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidates..."
              className="h-10 w-60 rounded-lg border border-[#D0D5DD] bg-white pl-9 pr-3 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="rounded-xl border-[#EAECF0] shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Brain className="h-12 w-12 text-[#D0D5DD]" strokeWidth={1.5} />
            <h3 className="mt-3 text-[15px] font-semibold text-[#101828]">No high-match candidates</h3>
            <p className="mt-1 text-[13px] text-[#667085] max-w-md">
              Candidates with an AI match score of 50% or higher will appear here. Scores are based on skill matching with job requirements.
            </p>
          </div>
        ) : selectedApplicant ? (
          /* ── Detail View ──────────────────────────────── */
          <Card className="rounded-xl border-[#EAECF0] shadow-sm">
            <CardContent className="p-6">
              <ApplicantDetail
                app={selectedApplicant}
                onBack={() => setSelectedApplicant(null)}
              />

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-2 border-t border-[#EAECF0] pt-5">
                {!selectedApplicant.isRejected && selectedApplicant.currentStage !== 'shortlisted' && selectedApplicant.currentStage !== 'hired' && (
                  <button
                    onClick={() => handleAction(selectedApplicant._id, 'shortlist')}
                    disabled={actionLoading === `shortlist-${selectedApplicant._id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <Star className="h-4 w-4" /> Shortlist
                  </button>
                )}
                {!selectedApplicant.isRejected && selectedApplicant.currentStage !== 'hired' && (
                  <button
                    onClick={() => handleAction(selectedApplicant._id, 'reject')}
                    disabled={actionLoading === `reject-${selectedApplicant._id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                )}
                {selectedApplicant.isRejected && (
                  deleteConfirm === selectedApplicant._id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAction(selectedApplicant._id, 'delete')}
                        className="rounded-lg bg-red-600 px-3 py-2 text-[12px] font-medium text-white"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-lg border border-[#EAECF0] px-3 py-2 text-[12px] font-medium text-[#667085]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(selectedApplicant._id)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#EAECF0] px-4 py-2 text-[12.5px] font-medium text-[#667085] transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ── Applicants List (sorted by score) ────────── */
          <div className="space-y-3">
            {filteredApplicants.map((app) => (
              <div
                key={app._id}
                onClick={() => handleView(app)}
                className="cursor-pointer rounded-xl border border-[#EAECF0] bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-200"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 text-[12px] font-bold text-[#1a6fa8]">
                      {getInitials(app.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-medium text-[#101828] truncate">
                          {app.fullName || "Unknown"}
                        </p>
                        <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${scoreColor(app.matchScore)}`}>
                          {app.matchScore}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-[#667085] mt-0.5">
                        <span className="truncate">{app.email}</span>
                        <span className="text-[#D0D5DD]">·</span>
                        <span className="truncate">{app.jobTitle}</span>
                      </div>
                      {app.matchedSkills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {app.matchedSkills.slice(0, 3).map(s => (
                            <span key={s} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">{s}</span>
                          ))}
                          {app.matchedSkills.length > 3 && (
                            <span className="text-[10px] text-[#98A2B3]">+{app.matchedSkills.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${stageBadge(app.currentStage, app.isRejected)}`}>
                        {app.isRejected ? "Rejected" : stageLabel(app.currentStage)}
                      </Badge>
                      {app.isRejected && (
                        deleteConfirm === app._id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleAction(app._id, 'delete')} disabled={actionLoading === `delete-${app._id}`} className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-medium text-white">
                              {actionLoading === `delete-${app._id}` ? '...' : 'Confirm'}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-[#EAECF0] px-2 py-1 text-[10px] font-medium text-[#667085]">X</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(app._id)} className="rounded-lg border border-[#EAECF0] p-1.5 text-[#667085] hover:bg-red-50 hover:text-red-600" title="Delete from my view">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CompanyDashboardLayout>
  );
}
