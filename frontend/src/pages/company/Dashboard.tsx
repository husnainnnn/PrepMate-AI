import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Users,
  Eye,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompanyDashboardLayout } from "@/components/company/CompanyDashboardLayout";
import { useAuth } from "@/context/AuthContext";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface RecentApplicant {
  id: string;
  studentId: string;
  studentName: string;
  jobTitle: string;
  score: number;
  status: string;
  appliedDate: string;
  location: string;
}

interface TrendPoint {
  month: string;
  applicants: number;
}

interface ActiveJob {
  id: string;
  title: string;
  location: string;
  applicantCount: number;
  daysLeft: number;
  status: string;
  createdAt: string;
}

interface StageDistribution {
  applied: number;
  under_review: number;
  shortlisted: number;
  interview: number;
  hired: number;
  rejected: number;
}

interface DashboardData {
  company: { id: string; name: string; website: string; description: string; logo: string; isVerified?: boolean; plan?: string };
  stats: {
    activeJobs: number;
    totalApplicants: number;
    newApplicants: number;
    interviewsScheduled: number;
    hiringRate: number;
    shortlistedCount: number;
    trendPercent: number;
  };
  recentApplicants: RecentApplicant[];
  applicantTrend: TrendPoint[];
  activeJobs: ActiveJob[];
  stageDistribution: StageDistribution;
}

// ------------------------------------------------------------------
// Skeleton Components
// ------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className || ''}`} />;
}

function StatSkeleton() {
  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-10 w-10" />
        </div>
        <Skeleton className="mt-3 h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="divide-y divide-[#EAECF0]">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-10" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    shortlisted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    interview: "bg-blue-50 text-[#1a6fa8] border-blue-200",
    under_review: "bg-amber-50 text-amber-700 border-amber-200",
    applied: "bg-gray-50 text-gray-700 border-gray-200",
    hired: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Expired: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return variants[status?.toLowerCase()] || "bg-gray-50 text-gray-600 border-gray-100";
}

function formatStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    applied: "New",
    under_review: "Under Review",
    shortlisted: "Shortlisted",
    interview: "Interview",
    hired: "Hired",
    rejected: "Rejected",
  };
  return labels[stage] || stage;
}

function getInitials(name: string): string {
  if (!name || name === "Unknown") return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ------------------------------------------------------------------
// Stats Section (dynamic)
// ------------------------------------------------------------------

function StatsSection({ stats }: { stats: DashboardData['stats'] }) {
  const statCards = [
    {
      label: "Active Jobs",
      value: String(stats.activeJobs),
      delta: `${stats.activeJobs} job${stats.activeJobs !== 1 ? 's' : ''} posted`,
      icon: Briefcase,
      color: "text-[#1a6fa8]",
      bg: "bg-blue-50",
    },
    {
      label: "Total Applicants",
      value: String(stats.totalApplicants),
      delta: `${stats.newApplicants} new`,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Interviews Scheduled",
      value: String(stats.interviewsScheduled),
      delta: `${stats.shortlistedCount} shortlisted`,
      icon: Eye,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Hiring Rate",
      value: `${stats.hiringRate}%`,
      delta: `${stats.hiringRate}% of applicants hired`,
      icon: Star,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="rounded-xl border-[#EAECF0] shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[#667085]">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[#101828]">{stat.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} strokeWidth={2} />
                </div>
              </div>
              <p className="mt-3 text-[12.5px] font-medium text-emerald-600">{stat.delta}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// Applicant Trend Chart (dynamic)
// ------------------------------------------------------------------

function ApplicantTrend({ data, trendPercent }: { data: TrendPoint[]; trendPercent: number }) {
  const isUp = trendPercent >= 0;
  const hasData = data.some(d => d.applicants > 0);

  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#101828]">Applicant Trend</h3>
            <p className="text-[12.5px] text-[#667085]">Monthly applicants across all jobs</p>
          </div>
          {hasData && (
            <div className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12.5px] font-semibold ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {isUp ? '+' : ''}{trendPercent}%
            </div>
          )}
        </div>
        <div className="mt-4 h-64 w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="applicantFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a6fa8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#1a6fa8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EAECF0" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #EAECF0",
                    boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
                    fontSize: 12.5,
                  }}
                  labelStyle={{ color: "#101828", fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="applicants"
                  stroke="#1a6fa8"
                  strokeWidth={2.5}
                  fill="url(#applicantFill)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Users className="mx-auto h-10 w-10 text-[#D0D5DD]" strokeWidth={1.5} />
                <p className="mt-2 text-[13px] text-[#667085]">No applicant data yet</p>
                <p className="text-[12px] text-[#98A2B3]">Applications will appear here once students apply</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Stage Distribution (Pipeline)
// ------------------------------------------------------------------

function PipelineSection({ stages }: { stages: StageDistribution }) {
  const total = Object.values(stages).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const pipeline = [
    { label: "Applied", value: stages.applied, color: "bg-gray-400" },
    { label: "Under Review", value: stages.under_review, color: "bg-amber-400" },
    { label: "Shortlisted", value: stages.shortlisted, color: "bg-blue-400" },
    { label: "Interview", value: stages.interview, color: "bg-indigo-500" },
    { label: "Hired", value: stages.hired, color: "bg-emerald-500" },
    { label: "Rejected", value: stages.rejected, color: "bg-red-400" },
  ];

  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-5">
        <h3 className="mb-3 text-[15px] font-semibold text-[#101828]">Applicant Pipeline</h3>
        {/* Progress bar */}
        <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
          {pipeline.map((s) => {
            const pct = total > 0 ? (s.value / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={s.label}
                className={s.color}
                style={{ width: `${pct}%` }}
                title={`${s.label}: ${s.value}`}
              />
            );
          })}
        </div>
        {/* Legend */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {pipeline.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${s.color}`} />
              <span className="text-[11px] text-[#667085]">
                {s.label}
                <span className="ml-1 font-medium text-[#101828]">{s.value}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Recent Applicants (dynamic)
// ------------------------------------------------------------------

function RecentApplicants({ applicants }: { applicants: RecentApplicant[] }) {
  if (applicants.length === 0) {
    return (
      <Card className="rounded-xl border-[#EAECF0] shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#101828]">Recent Applicants</h3>
            <Link to="/company/applicants" className="flex items-center gap-1 text-[13px] font-medium text-[#1a6fa8] hover:underline">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-10 w-10 text-[#D0D5DD]" strokeWidth={1.5} />
            <p className="mt-2 text-[13px] font-medium text-[#667085]">No applicants yet</p>
            <p className="mt-0.5 text-[12px] text-[#98A2B3]">Post a job to start receiving applications</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#101828]">Recent Applicants</h3>
          <Link to="/company/applicants" className="flex items-center gap-1 text-[13px] font-medium text-[#1a6fa8] hover:underline">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-[#EAECF0]">
          {applicants.map((app) => (
            <div key={app.id} className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50/50 -mx-1 px-1 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[12px] font-semibold text-[#1a6fa8]">
                  {getInitials(app.studentName)}
                </div>
                <div>
                  <p className="text-[13.5px] font-medium text-[#101828]">{app.studentName}</p>
                  <p className="text-[12px] text-[#667085]">{app.jobTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {app.score > 0 && (
                  <span className="text-[13px] font-semibold text-[#1a6fa8]">{app.score}/10</span>
                )}
                <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusBadge(app.status)}`}>
                  {formatStageLabel(app.status)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Active Jobs (dynamic)
// ------------------------------------------------------------------

function ActiveJobs({ jobs }: { jobs: ActiveJob[] }) {
  if (jobs.length === 0) {
    return (
      <Card className="rounded-xl border-[#EAECF0] shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#101828]">Active Jobs</h3>
            <Link to="/company/post-job" className="flex items-center gap-1 text-[13px] font-medium text-[#1a6fa8] hover:underline">
              Post New <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Briefcase className="h-10 w-10 text-[#D0D5DD]" strokeWidth={1.5} />
            <p className="mt-2 text-[13px] font-medium text-[#667085]">No active jobs</p>
            <p className="mt-0.5 text-[12px] text-[#98A2B3]">Post your first job opening to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#101828]">Active Jobs</h3>
          <Link to="/company/post-job" className="flex items-center gap-1 text-[13px] font-medium text-[#1a6fa8] hover:underline">
            Post New <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-[#EAECF0]">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50/50 -mx-1 px-1 rounded-lg">
              <div>
                <p className="text-[13.5px] font-medium text-[#101828]">{job.title}</p>
                <div className="mt-0.5 flex items-center gap-3 text-[12px] text-[#667085]">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}
                  </span>
                  {job.daysLeft > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {job.daysLeft} day{job.daysLeft !== 1 ? 's' : ''} left
                    </span>
                  )}
                  <span className="text-[#98A2B3]">{job.location}</span>
                </div>
              </div>
              <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge(job.status)}`}>
                {job.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Error State
// ------------------------------------------------------------------

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <AlertCircle className="h-7 w-7 text-red-500" />
      </div>
      <h3 className="mt-4 text-[16px] font-semibold text-[#101828]">Failed to load dashboard</h3>
      <p className="mt-1 text-[13.5px] text-[#667085] max-w-md">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 flex items-center gap-2 rounded-lg bg-[#1a6fa8] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#155a8a]"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// Company Dashboard Page (fully dynamic)
// ------------------------------------------------------------------

export default function CompanyDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/companies/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Server error (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    // ── Check if redirected from Stripe payment success ──
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const paymentSuccess = params.get('payment')
    
    if (sessionId && paymentSuccess === 'success') {
      // Confirm payment and upgrade plan
      fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            // Clean URL - remove query params without reload
            window.history.replaceState({}, '', '/company/dashboard')
          }
        })
        .catch(() => {})
        .finally(() => {
          fetchDashboard()
        })
    } else {
      fetchDashboard()
    }
  }, [token]);

  // Auto-refresh every 60 seconds (only when token exists)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchDashboard, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <CompanyDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">
                {data ? `${data.company.name} Dashboard 🏢` : 'Company Dashboard 🏢'}
              </h1>
              {data?.company.plan === 'pro' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                  ⭐ PRO
                </span>
              )}
              {data?.company.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 shadow-sm">
                  ✅ Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-[13.5px] text-[#667085]">
              {data
                ? `Manage job postings, screen candidates, and track hiring progress. ${data.stats.activeJobs} active job${data.stats.activeJobs !== 1 ? 's' : ''}, ${data.stats.totalApplicants} total applicants`
                : 'Manage your job postings, screen candidates, and track hiring progress.'}
            </p>
          </div>
          <Link
            to="/company/post-job"
            className="hidden h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 text-[13.5px] font-medium text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 hover:shadow-xl sm:flex"
          >
            <Briefcase className="h-4 w-4" />
            Post a New Job
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <div className="xl:col-span-3"><ChartSkeleton /></div>
              <div className="xl:col-span-2"><ListSkeleton rows={5} /></div>
            </div>
            <ListSkeleton rows={3} />
          </>
        )}

        {/* Error State */}
        {!loading && error && <ErrorState message={error} onRetry={fetchDashboard} />}

        {/* Real Data */}
        {!loading && !error && data && (
          <>
            <StatsSection stats={data.stats} />

            <PipelineSection stages={data.stageDistribution} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <div className="xl:col-span-3">
                <ApplicantTrend data={data.applicantTrend} trendPercent={data.stats.trendPercent} />
              </div>
              <div className="xl:col-span-2">
                <RecentApplicants applicants={data.recentApplicants} />
              </div>
            </div>

            <ActiveJobs jobs={data.activeJobs} />
          </>
        )}
      </div>
    </CompanyDashboardLayout>
  );
}
