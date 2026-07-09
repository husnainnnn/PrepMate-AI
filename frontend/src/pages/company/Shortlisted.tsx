import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCheck,
  Briefcase,
  MapPin,
  ExternalLink,
  XCircle,
  ChevronRight,
  Search,
  Star,
  GraduationCap,
  FileText,
  Mail,
  Phone,
  Link as LinkIcon,
  Send,
  Ban,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { CompanyDashboardLayout } from "@/components/company/CompanyDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

// ─── Types ──────────────────────────────────────────────────

interface ShortlistedApplicant {
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
}

// ─── Helpers ────────────────────────────────────────────────

function stageBadge(stage: string) {
  const map: Record<string, string> = {
    shortlisted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    hired: "bg-blue-50 text-blue-700 border-blue-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  return map[stage] || "bg-gray-50 text-gray-600 border-gray-100";
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    shortlisted: "Shortlisted",
    hired: "Hired",
    rejected: "Rejected",
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

// ─── Applicant Detail Panel ─────────────────────────────────

function ApplicantDetail({ app, onBack }: { app: ShortlistedApplicant; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[12px] font-medium text-[#1a6fa8] hover:underline"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Back to shortlisted
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-600">
          {getInitials(app.fullName)}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-[#101828]">{app.fullName || "Unknown"}</h2>
          <p className="text-[13px] text-[#667085]">
            Shortlisted for <strong>{app.jobTitle}</strong>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${stageBadge(app.currentStage)}`}>
              {stageLabel(app.currentStage)}
            </Badge>
            <span className="text-[11px] text-[#98A2B3]">Applied {app.appliedDate}</span>
          </div>
        </div>
      </div>

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
            <GraduationCap className="h-4 w-4 text-emerald-500" /> Education
          </h3>
          <p className="text-[13px] text-[#344054]">{app.education}</p>
        </div>
      )}

      {app.experience && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#101828]">
            <Briefcase className="h-4 w-4 text-emerald-500" /> Experience
          </h3>
          <p className="text-[13px] text-[#344054]">{app.experience}</p>
        </div>
      )}

      {app.skills?.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-[13px] font-semibold text-[#101828]">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {app.skills.map((s) => (
              <span key={s} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700">{s}</span>
            ))}
          </div>
        </div>
      )}

      {app.coverLetter && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#101828]">
            <FileText className="h-4 w-4 text-emerald-500" /> Cover Letter
          </h3>
          <p className="text-[13px] leading-relaxed text-[#344054] whitespace-pre-line">{app.coverLetter}</p>
        </div>
      )}

      {app.resumeUrl && (
        <a
          href={app.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700"
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

export default function Shortlisted() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<ShortlistedApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState<ShortlistedApplicant | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/company/shortlisted', {
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

  const handleAction = async (id: string, action: string) => {
    if (!token) return;
    const key = `${action}-${id}`;
    setActionLoading(key);
    try {
      const endpoint = `/api/company/applicants/${id}/${action}`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      setSelectedApplicant(null);
      fetchData();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  // Filter by search
  const filteredApplicants = applicants.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.fullName?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.jobTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <CompanyDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Shortlisted</h1>
            <p className="mt-1 text-[13.5px] text-[#667085]">
              {applicants.length} shortlisted candidate{applicants.length !== 1 ? 's' : ''} across all jobs.
            </p>
          </div>
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortlisted..."
              className="h-10 w-60 rounded-lg border border-[#D0D5DD] bg-white pl-9 pr-3 text-[13px] text-[#101828] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-[#98A2B3]"
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
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserCheck className="h-12 w-12 text-[#D0D5DD]" strokeWidth={1.5} />
            <h3 className="mt-3 text-[15px] font-semibold text-[#101828]">No shortlisted candidates</h3>
            <p className="mt-1 text-[13px] text-[#667085]">
              Go to <strong>Applicants</strong> and shortlist candidates — they'll appear here.
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
                {/* Reject */}
                <button
                  onClick={() => handleAction(selectedApplicant._id, 'reject')}
                  disabled={actionLoading === `reject-${selectedApplicant._id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[12.5px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" /> Reject
                </button>

                {/* Schedule Interview — go to Messages to communicate */}
                <button
                  onClick={() => navigate('/company/messages')}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-2 text-[12.5px] font-medium text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110"
                >
                  <Send className="h-4 w-4" /> Schedule Interview
                </button>

                {/* Hired — update status + go to Messages */}
                <button
                  onClick={async () => {
                    await handleAction(selectedApplicant._id, 'hire');
                    navigate('/company/messages');
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-emerald-600"
                >
                  <CheckCircle className="h-4 w-4" /> Hired
                </button>

                {/* Direct Message button */}
                <button
                  onClick={() => navigate('/company/messages')}
                  className="flex items-center gap-1.5 rounded-lg border border-[#EAECF0] px-4 py-2 text-[12.5px] font-medium text-[#667085] transition-colors hover:bg-gray-50"
                >
                  <MessageSquare className="h-4 w-4" /> Send Message
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[#98A2B3]">
                Use <strong>Messages</strong> to communicate with the candidate directly.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* ── Shortlisted List ─────────────────────────── */
          <div className="space-y-3">
            {filteredApplicants.map((app) => (
              <div
                key={app._id}
                onClick={() => setSelectedApplicant(app)}
                className="cursor-pointer rounded-xl border border-[#EAECF0] bg-white shadow-sm transition-all hover:shadow-md hover:border-emerald-200"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                      <Star className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-[#101828] truncate">
                        {app.fullName || "Unknown"}
                      </p>
                      <div className="flex items-center gap-2 text-[12px] text-[#667085]">
                        <span className="truncate">{app.email}</span>
                        <span className="text-[#D0D5DD]">·</span>
                        <span className="truncate">{app.jobTitle}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 shrink-0">
                      Shortlisted
                    </Badge>
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
