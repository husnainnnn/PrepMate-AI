import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Mic,
  BookOpen,
  FileText,
  Mail,
  Sparkles,
  Video,
  BarChart3,
  Library,
  Target,
  TrendingUp,
  Flame,
  Lightbulb,
  ArrowUpRight,
  ChevronRight,
  Gavel,
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
import { StudentDashboardLayout } from "@/components/student/StudentDashboardLayout";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────

interface DashboardStats {
  interviewCount: number
  avgScore: number
  totalScoreSum: number
  practiceQuestionsCount: number
  practiceSessionsCount: number
  loginStreak: number
  lastLoginDate: string
  interviewsRemaining: number
  plan: string
  applicationsCount: number
  lastInterviewDate: string
}

interface ProfileStats {
  completion: number
  fields: Record<string, boolean>
}

interface DashboardData {
  stats: DashboardStats
  profile: ProfileStats
  recentInterviews: Array<{
    _id: string
    field: string
    overallScore: number
    hireDecision: string
    cheated: boolean
    answeredCount: number
    completedAt: string
    durationMinutes: number
  }>
  recentScores: Array<{ score: number; date: string }>
  today: string
}

// ─── Default empty state ─────────────────────────────────

const EMPTY_STATS: DashboardStats = {
  interviewCount: 0,
  avgScore: 0,
  totalScoreSum: 0,
  practiceQuestionsCount: 0,
  practiceSessionsCount: 0,
  loginStreak: 0,
  lastLoginDate: '',
  interviewsRemaining: 4,
  plan: 'free',
  applicationsCount: 0,
  lastInterviewDate: '',
}

// ─── Helpers ─────────────────────────────────────────────

function scoreBadgeVariant(score: number) {
  if (score >= 85) return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (score >= 70) return "bg-blue-50 text-[#1a6fa8] border-blue-100";
  return "bg-amber-50 text-amber-600 border-amber-100";
}

// ─── Stats Cards ─────────────────────────────────────────

function StatsSection({ stats }: { stats: DashboardStats }) {
  const avgScoreDisplay = stats.avgScore > 0 ? (stats.avgScore * 10).toFixed(0) + '%' : '—'

  const statCards = [
    {
      label: "Mock Interviews",
      value: String(stats.interviewCount),
      delta: stats.lastInterviewDate ? `Last: ${new Date(stats.lastInterviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Not started yet',
      icon: Mic,
      iconBg: "bg-blue-50",
      iconColor: "text-[#1a6fa8]",
    },
    {
      label: "Average Score",
      value: avgScoreDisplay,
      delta: stats.interviewCount > 0 ? `Across ${stats.interviewCount} interview${stats.interviewCount > 1 ? 's' : ''}` : 'Complete an interview',
      icon: Target,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      label: "Practice Sessions",
      value: String(stats.practiceSessionsCount),
      delta: `${stats.practiceSessionsCount} session${stats.practiceSessionsCount !== 1 ? 's' : ''} started`,
      icon: BookOpen,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
    {
      label: "Day Streak",
      value: `${stats.loginStreak} day${stats.loginStreak !== 1 ? 's' : ''}`,
      delta: stats.loginStreak > 0 ? 'Keep it going! 🔥' : 'Login daily to build streak',
      icon: Flame,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className="rounded-xl border-[#EAECF0] shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[#667085]">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[#101828]">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} strokeWidth={2} />
                </div>
              </div>
              <p className="mt-3 text-[12.5px] font-medium text-emerald-600">
                {stat.delta}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Recent Mock Interviews ──────────────────────────────

function RecentInterviews({ data }: { data: DashboardData }) {
  const { stats, recentInterviews } = data
  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#101828]">
            Recent Mock Interviews
          </h3>
          <Link to="/student/interviews" className="flex items-center gap-1 text-[13px] font-medium text-[#1a6fa8] hover:underline">
            Start new
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentInterviews.length === 0 ? (
          <div className="py-8 text-center">
            <Mic className="mx-auto h-8 w-8 text-[#D0D5DD]" />
            <p className="mt-3 text-[13px] text-[#667085]">No interviews yet</p>
            <p className="mt-1 text-[12px] text-[#98A2B3]">
              Start your first AI mock interview to see results here
            </p>
            <Link to="/student/interviews"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
              Start Interview <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#EAECF0]">
            {recentInterviews.slice(0, 4).map((iv) => (
              <div key={iv._id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iv.cheated ? 'bg-red-50' : 'bg-blue-50'}`}>
                    {iv.cheated ? (
                      <Gavel className="h-4 w-4 text-red-500" />
                    ) : (
                      <BarChart3 className="h-4 w-4 text-[#1a6fa8]" />
                    )}
                  </div>
                  <div>
                    <p className="text-[13.5px] font-medium text-[#101828]">
                      {iv.cheated ? '⚠️ Cheating Detected' : (iv.field || 'Mock Interview')}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3 text-[12px] text-[#667085]">
                      <span>{new Date(iv.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>{iv.answeredCount} answers</span>
                      {!iv.cheated && iv.hireDecision && (
                        <span className="font-medium">{iv.hireDecision}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${iv.cheated ? 'bg-red-50 text-red-600 border-red-200' : scoreBadgeVariant(iv.overallScore * 10)}`}
                >
                  {iv.cheated ? 'Cheated' : (iv.overallScore * 10).toFixed(0) + '%'}
                </Badge>
              </div>
            ))}
            {stats.interviewCount > 4 && (
              <Link to="/student/interviews" className="block py-3 text-center text-[12.5px] font-medium text-[#1a6fa8] hover:underline">
                View all {stats.interviewCount} interviews
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Progress Overview Chart ─────────────────────────────

function ProgressOverview({ data }: { data: DashboardData }) {
  const { stats, recentScores } = data
  // Use real recentScores from MongoDB
  const chartData = recentScores.length > 0
    ? recentScores.map((s, i) => ({
        session: `S${stats.interviewCount - recentScores.length + i + 1}`,
        score: s.score,
      })).reverse()
    : [{ session: 'S1', score: 0 }]

  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#101828]">
              Progress Overview
            </h3>
            <p className="text-[12.5px] text-[#667085]">
              {stats.interviewCount > 0
                ? `Your average score across ${stats.interviewCount} interview${stats.interviewCount > 1 ? 's' : ''}`
                : 'Complete an interview to see your progress'}
            </p>
          </div>
          {stats.avgScore > 0 && (
            <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[12.5px] font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              {(stats.avgScore * 10).toFixed(0) + '%'}
            </div>
          )}
        </div>

        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a6fa8" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1a6fa8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#EAECF0" strokeDasharray="4 4" />
              <XAxis
                dataKey="session"
                tick={{ fill: "#667085", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#667085", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={32}
                domain={[0, 10]}
              />
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
                dataKey="score"
                stroke="#1a6fa8"
                strokeWidth={2.5}
                fill="url(#scoreFill)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature Cards Grid ──────────────────────────────────

const FEATURE_CARDS = [
  {
    title: "AI Mock Interview",
    description: "Practice realistic interviews with an adaptive AI interviewer.",
    icon: Mic,
    iconBg: "bg-blue-50",
    iconColor: "text-[#1a6fa8]",
    cta: "Start Interview",
    href: "/student/interviews",
  },
  {
    title: "Practice Questions",
    description: "Browse curated question banks by role, level, and topic.",
    icon: BookOpen,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    cta: "Browse Questions",
    href: "/student/questions",
  },
  {
    title: "Resume Builder",
    description: "Build an ATS-friendly resume with AI-guided suggestions.",
    icon: FileText,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    cta: "Build Resume",
    href: "/student/resumes",
  },
  {
    title: "Job Matches",
    description: "Discover roles that match your skills and preferences.",
    icon: Target,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-500",
    cta: "View Matches",
    href: "/student/job-matches",
  },
  {
    title: "AI Feedback",
    description: "Get detailed, actionable feedback after every session.",
    icon: Sparkles,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    cta: "View Feedback",
    href: "/student/feedback",
  },
  {
    title: "Live Interviews",
    description: "Real-time support during actual interview calls.",
    icon: Video,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-500",
    cta: "Launch Copilot",
    href: "/student/live-interviews",
  },
  {
    title: "Applications",
    description: "Track your submitted applications and their status.",
    icon: Mail,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    cta: "View Applications",
    href: "/student/applications",
  },
  {
    title: "Resources",
    description: "Guide, templates, and tips from hiring professional.",
    icon: Library,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-500",
    cta: "Explore Resources",
    href: "/student/resources",
  },
]

function FeatureGrid() {
  return (
    <div>
      <h3 className="mb-4 text-[15px] font-semibold text-[#101828]">
        Explore Tools
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {FEATURE_CARDS.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="rounded-xl border-[#EAECF0] shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="flex h-full flex-col p-5">
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${feature.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${feature.iconColor}`} strokeWidth={2} />
                </div>
                <p className="text-[13.5px] font-semibold text-[#101828]">
                  {feature.title}
                </p>
                <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-[#667085]">
                  {feature.description}
                </p>
                <Link
                  to={feature.href}
                  className="mt-4 inline-flex h-8 items-center gap-1 self-start px-0 text-[13px] font-medium text-[#1a6fa8] transition-colors hover:text-[#1a6fa8]"
                >
                  {feature.cta}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 px-6 py-6 lg:px-8 animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-[#EAECF0]" />
      <div className="h-4 w-48 rounded-lg bg-[#EAECF0]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-xl bg-[#F7F9FC] border border-[#EAECF0]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3 h-80 rounded-xl bg-[#F7F9FC] border border-[#EAECF0]" />
        <div className="xl:col-span-2 h-80 rounded-xl bg-[#F7F9FC] border border-[#EAECF0]" />
      </div>
    </div>
  )
}

// ─── Main Student Dashboard Page ─────────────────────────

export default function StudentDashboard() {
  const { user, token } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const fetchDashboard = async () => {
      try {
        // Check in for streak
        fetch('/api/stats/checkin', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {}) // fire-and-forget

        // Fetch dashboard stats
        const res = await fetch('/api/stats/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const dashboardData = await res.json()
          setData(dashboardData)
        }
      } catch { /* backend offline */ }
      setLoading(false)
    }
    fetchDashboard()
  }, [token])

  if (loading) {
    return (
      <StudentDashboardLayout>
        <DashboardSkeleton />
      </StudentDashboardLayout>
    )
  }

  const stats = data?.stats || EMPTY_STATS
  const profile = data?.profile || { completion: 0, fields: {} }
  const safeData = data || {
    stats: EMPTY_STATS,
    profile: { completion: 0, fields: {} },
    recentInterviews: [],
    recentScores: [],
    today: '',
  }

  return (
    <StudentDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="mt-1 text-[13.5px] text-[#667085]">
            {stats.interviewCount === 0
              ? "Ready to ace your first interview?"
              : `Keep it up! You've completed ${stats.interviewCount} interview${stats.interviewCount > 1 ? 's' : ''} so far.`}
          </p>
        </div>

        <StatsSection stats={stats} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <ProgressOverview data={safeData} />
          </div>
          <div className="xl:col-span-2">
            <RecentInterviews data={safeData} />
          </div>
        </div>

        <FeatureGrid />
      </div>
    </StudentDashboardLayout>
  );
}
