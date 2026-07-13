import { useState, useEffect } from "react";
import {
  Sparkles,
  User,
  Briefcase,
  GraduationCap,
  Code,
  ExternalLink,
  Globe,
  GitBranch,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudentDashboardLayout } from "@/components/student/StudentDashboardLayout";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  field: string;
  bio: string;
  introduction: string;
  skills: string[];
  experience: string;
  education: string[];
  linkedin: string;
  github: string;
  portfolio: string;
}

interface AppSummary {
  job: string;
  company: string;
  stage: string;
  rejected: boolean;
  applied: string;
}

interface FeedbackResponse {
  profile: ProfileData;
  applications: AppSummary[] | string[];
  feedback: string;
}

// ─── Helpers ──────────────────────────────────────────────

function formatFeedback(text: string): string {
  // Convert markdown-style headers to HTML
  let html = text
    .replace(/^### (.*$)/gm, '<h3 class="text-[15px] font-semibold text-[#101828] mt-5 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-[17px] font-semibold text-[#101828] mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-semibold text-[#101828] mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#101828]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li class="text-[13px] text-[#667085] ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-[13px] text-[#667085] leading-relaxed mb-2">')
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li.*?>.*?<\/li>)+)/g, '<ul class="space-y-1 my-2">$1</ul>');

  return `<p class="text-[13px] text-[#667085] leading-relaxed mb-2">${html}</p>`;
}

function stageColor(stage: string) {
  switch (stage) {
    case 'shortlisted': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'interview': return 'bg-purple-50 text-purple-600 border-purple-100';
    case 'hired': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
    case 'under_review': return 'bg-amber-50 text-amber-600 border-amber-100';
    default: return 'bg-gray-50 text-gray-600 border-gray-100';
  }
}

function stageLabel(stage: string) {
  switch (stage) {
    case 'shortlisted': return 'Shortlisted';
    case 'interview': return 'Interview';
    case 'hired': return 'Hired';
    case 'rejected': return 'Rejected';
    case 'under_review': return 'Under Review';
    default: return 'Applied';
  }
}

// ─── Skeleton ─────────────────────────────────────────────

function FeedbackSkeleton() {
  return (
    <div className="space-y-6 px-6 py-6 lg:px-8 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-[#EAECF0]" />
      <div className="h-4 w-72 rounded-lg bg-[#EAECF0]" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2 h-[500px] rounded-xl bg-[#F7F9FC] border border-[#EAECF0]" />
        <div className="xl:col-span-3 h-[500px] rounded-xl bg-[#F7F9FC] border border-[#EAECF0]" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function AIFeedbackPage() {
  const { token } = useAuth();
  const [data, setData] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [error, setError] = useState('');
  const [expandedApps, setExpandedApps] = useState(false);

  // Fetch profile (without feedback) on mount
  useEffect(() => {
    if (!token) return;
    fetchProfileOnly();
  }, [token]);

  const fetchProfileOnly = async () => {
    try {
      const res = await fetch('/api/feedback/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch { /* offline */ }
    setFetchingProfile(false);
  };

  const generateFeedback = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/feedback/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate feedback');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  if (fetchingProfile) {
    return (
      <StudentDashboardLayout>
        <FeedbackSkeleton />
      </StudentDashboardLayout>
    );
  }

  const profile = data?.profile;
  const apps = data?.applications;
  const feedback = data?.feedback;

  // Parse feedback sections
  const hasFeedback = feedback && typeof feedback === 'string' && !feedback.startsWith('⚠️');

  return (
    <StudentDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">

        {/* ── Header ───────────────────────────────────── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">
              AI Profile Feedback
            </h1>
            <p className="mt-1 text-[13.5px] text-[#667085]">
              Get detailed, actionable AI feedback to strengthen your interview profile
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={generateFeedback}
            disabled={loading}
            className="inline-flex h-11 items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 text-[13.5px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#0b3b5c]/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
                Analyzing Profile...
              </>
            ) : (
              <>
                <Sparkles className="h-[18px] w-[18px]" />
                {hasFeedback ? 'Regenerate Feedback' : 'Generate Feedback'}
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="text-[13px] font-medium text-red-800">Error</p>
              <p className="text-[12.5px] text-red-600">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">

          {/* ── LEFT: Profile Summary ──────────────────── */}
          <div className="xl:col-span-2 space-y-6">
            {/* Profile Card */}
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                    <User className="h-4 w-4 text-[#1a6fa8]" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#101828]">Your Profile</h3>
                </div>

                {profile ? (
                  <div className="space-y-4">
                    {/* Name & Field */}
                    <div>
                      <p className="text-[14px] font-semibold text-[#101828]">{profile.fullName}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full border-[#EAECF0] bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[#1a6fa8]">
                          <Briefcase className="mr-1 h-3 w-3" />
                          {profile.field}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-[#EAECF0] bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-[#667085]">
                          {profile.experience}
                        </Badge>
                      </div>
                    </div>

                    {/* Bio */}
                    {profile.bio && profile.bio !== 'Not provided' && (
                      <div>
                        <p className="mb-1 text-[11.5px] font-medium uppercase tracking-wider text-[#98A2B3]">Bio</p>
                        <p className="text-[13px] text-[#667085] leading-relaxed">{profile.bio}</p>
                      </div>
                    )}

                    {/* Introduction */}
                    {profile.introduction && profile.introduction !== 'Not provided' && (
                      <div>
                        <p className="mb-1 text-[11.5px] font-medium uppercase tracking-wider text-[#98A2B3]">Introduction</p>
                        <p className="text-[13px] text-[#667085] leading-relaxed">{profile.introduction}</p>
                      </div>
                    )}

                    {/* Skills */}
                    <div>
                      <p className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wider text-[#98A2B3]">
                        <Code className="mr-1 inline h-3 w-3" />
                        Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(profile.skills) && profile.skills.map((s, i) => (
                          <Badge key={i} variant="outline" className="rounded-full border-[#E4E7EC] bg-white px-2.5 py-0.5 text-[11.5px] text-[#344054]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Education */}
                    <div>
                      <p className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wider text-[#98A2B3]">
                        <GraduationCap className="mr-1 inline h-3 w-3" />
                        Education
                      </p>
                      <ul className="space-y-1.5">
                        {Array.isArray(profile.education) ? profile.education.map((e, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-[#667085]">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D0D5DD]" />
                            {e}
                          </li>
                        )) : (
                          <li className="text-[13px] text-[#98A2B3]">{profile.education}</li>
                        )}
                      </ul>
                    </div>

                    {/* Links */}
                    <div className="space-y-1.5">
                      {profile.linkedin && profile.linkedin !== 'Not provided' && (
                        <a href={profile.linkedin} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[13px] text-[#1a6fa8] hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {profile.github && profile.github !== 'Not provided' && (
                        <a href={profile.github} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[13px] text-[#1a6fa8] hover:underline">
                          <GitBranch className="h-3.5 w-3.5" /> GitHub
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {profile.portfolio && profile.portfolio !== 'Not provided' && (
                        <a href={profile.portfolio} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[13px] text-[#1a6fa8] hover:underline">
                          <Globe className="h-3.5 w-3.5" /> Portfolio
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="border-t border-[#EAECF0] pt-3">
                      <p className="mb-1 text-[11.5px] font-medium uppercase tracking-wider text-[#98A2B3]">Contact</p>
                      <p className="flex items-center gap-1.5 text-[13px] text-[#667085]">
                        <Mail className="h-3.5 w-3.5 text-[#98A2B3]" />
                        {profile.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#98A2B3]">Profile data unavailable</p>
                )}
              </CardContent>
            </Card>

            {/* Applications Card */}
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-5">
                <button
                  onClick={() => setExpandedApps(!expandedApps)}
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                      <FileText className="h-4 w-4 text-amber-500" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-[#101828]">
                      Applications ({Array.isArray(apps) ? apps.length : 0})
                    </h3>
                  </div>
                  {Array.isArray(apps) && apps.length > 0 && (
                    expandedApps ? <ChevronUp className="h-4 w-4 text-[#667085]" /> : <ChevronDown className="h-4 w-4 text-[#667085]" />
                  )}
                </button>

                {expandedApps && Array.isArray(apps) && apps.length > 0 && (
                  <div className="mt-3 divide-y divide-[#EAECF0]">
                    {apps.map((app, i) => {
                      if (typeof app === 'string') return null;
                      return (
                        <div key={i} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-[13px] font-medium text-[#101828]">{app.job}</p>
                            <p className="text-[12px] text-[#667085]">{app.company} &middot; {app.applied}</p>
                          </div>
                          <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${stageColor(app.stage)}`}>
                            {app.rejected ? 'Rejected' : stageLabel(app.stage)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(!Array.isArray(apps) || apps.length === 0) && (
                  <p className="mt-3 text-[13px] text-[#98A2B3]">No applications yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: AI Feedback ─────────────────────── */}
          <div className="xl:col-span-3">
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#101828]">AI Analysis & Feedback</h3>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0b3b5c]/10 to-[#1a6fa8]/10">
                      <Loader2 className="h-8 w-8 animate-spin text-[#1a6fa8]" />
                    </div>
                    <p className="mt-5 text-[15px] font-semibold text-[#101828]">Analyzing your profile...</p>
                    <p className="mt-1.5 text-[13px] text-[#667085]">Using AI to evaluate your profile and application history</p>
                    <div className="mt-6 flex gap-1.5">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a6fa8]" style={{ animationDelay: '0s' }} />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a6fa8]" style={{ animationDelay: '0.3s' }} />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a6fa8]" style={{ animationDelay: '0.6s' }} />
                    </div>
                  </div>
                ) : hasFeedback ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatFeedback(feedback) }}
                  />
                ) : feedback && typeof feedback === 'string' && feedback.startsWith('⚠️') ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                      <AlertTriangle className="h-8 w-8 text-amber-400" />
                    </div>
                    <p className="text-[15px] font-semibold text-[#101828]">API Key Not Configured</p>
                    <p className="mt-2 max-w-md text-[13px] text-[#667085] leading-relaxed">
                      {feedback.replace('⚠️ ', '')}
                    </p>
                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-left">
                      <p className="text-[12.5px] font-medium text-amber-800">Quick Fix:</p>
                      <ol className="mt-1.5 space-y-1 text-[12px] text-amber-700">
                        <li>1. Open <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">Backend/.env</code></li>
                        <li>2. Add: <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">GROQ_API_KEY=your-groq-api-key</code></li>
                        <li>3. Restart backend server</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0b3b5c]/10 to-[#1a6fa8]/10 ring-1 ring-[#0b3b5c]/5">
                      <Sparkles className="h-8 w-8 text-[#1a6fa8]" />
                    </div>
                    <p className="text-[16px] font-semibold text-[#101828]">Ready for AI Feedback</p>
                    <p className="mt-2 max-w-sm text-[13px] text-[#667085] leading-relaxed">
                      Get a detailed analysis of your <strong>profile strength</strong>, <strong>skills</strong>, 
                      and <strong>application strategy</strong> with actionable recommendations.
                    </p>
                    <div className="mt-7 flex items-center gap-6 text-[12px] text-[#98A2B3]">
                      <span className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Profile Analysis
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        Skills Review
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        App Strategy
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={generateFeedback}
                      className="mt-7 inline-flex h-11 items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-7 text-[13.5px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#0b3b5c]/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Sparkles className="h-[18px] w-[18px]" />
                      Generate Feedback
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </StudentDashboardLayout>
  );
}
