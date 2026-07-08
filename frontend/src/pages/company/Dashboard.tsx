import { Link } from "react-router-dom";
import {
  Briefcase,
  Users,
  Eye,
  Star,
  TrendingUp,
  Clock,
  MessageSquare,
  ArrowUpRight,
  ChevronRight,
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
import { Button } from "@/components/ui/button";
import { CompanyDashboardLayout } from "@/components/company/CompanyDashboardLayout";

// ------------------------------------------------------------------
// Static data
// ------------------------------------------------------------------

const statCards = [
  {
    label: "Active Jobs",
    value: "12",
    delta: "+3 this month",
    icon: Briefcase,
    color: "text-[#1a6fa8]",
    bg: "bg-blue-50",
  },
  {
    label: "Total Applicants",
    value: "847",
    delta: "+124 this week",
    icon: Users,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    label: "Interviews Scheduled",
    value: "38",
    delta: "+12 this week",
    icon: Eye,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    label: "Hiring Rate",
    value: "24%",
    delta: "+4% improvement",
    icon: Star,
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
];

const recentApplicants = [
  { name: "Sarah Ahmed", role: "Frontend Developer", score: 92, status: "Shortlisted" },
  { name: "Ali Raza", role: "Backend Engineer", score: 88, status: "Interview" },
  { name: "Fatima Khan", role: "UI/UX Designer", score: 85, status: "Reviewed" },
  { name: "Usman Malik", role: "Full Stack Dev", score: 79, status: "New" },
  { name: "Zara Hassan", role: "Data Analyst", score: 76, status: "New" },
];

const applicantTrend = [
  { month: "Jan", applicants: 45 },
  { month: "Feb", applicants: 52 },
  { month: "Mar", applicants: 48 },
  { month: "Apr", applicants: 70 },
  { month: "May", applicants: 85 },
  { month: "Jun", applicants: 92 },
  { month: "Jul", applicants: 124 },
];

const activeJobs = [
  { title: "Senior Frontend Engineer", applicants: 48, daysLeft: 12, status: "Active" },
  { title: "Backend Developer (Node.js)", applicants: 32, daysLeft: 5, status: "Active" },
  { title: "Product Manager", applicants: 56, daysLeft: 2, status: "Active" },
  { title: "UI/UX Designer", applicants: 27, daysLeft: 19, status: "Active" },
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    Shortlisted: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Interview: "bg-blue-50 text-[#1a6fa8] border-blue-100",
    Reviewed: "bg-amber-50 text-amber-600 border-amber-100",
    New: "bg-gray-50 text-gray-600 border-gray-100",
    Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  return variants[status] || "bg-gray-50 text-gray-600 border-gray-100";
}

// ------------------------------------------------------------------
// Stats
// ------------------------------------------------------------------

function StatsSection() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="rounded-xl border-[#EAECF0] shadow-sm transition-shadow hover:shadow-md">
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
// Applicant Trend Chart
// ------------------------------------------------------------------

function ApplicantTrend() {
  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#101828]">Applicant Trend</h3>
            <p className="text-[12.5px] text-[#667085]">Monthly applicants across all jobs</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[12.5px] font-semibold text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            +35%
          </div>
        </div>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={applicantTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="applicantFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a6fa8" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1a6fa8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#EAECF0" strokeDasharray="4 4" />
              <XAxis dataKey="month" tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#667085", fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #EAECF0", boxShadow: "0 4px 12px rgba(16,24,40,0.08)", fontSize: 12.5 }}
                labelStyle={{ color: "#101828", fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="applicants" stroke="#1a6fa8" strokeWidth={2.5} fill="url(#applicantFill)" activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Recent Applicants
// ------------------------------------------------------------------

function RecentApplicants() {
  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#101828]">Recent Applicants</h3>
          <Link to="/company/applicants" className="flex items-center gap-1 text-[13px] font-medium text-[#1a6fa8] hover:underline">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-[#EAECF0]">
          {recentApplicants.map((app) => (
            <div key={app.name} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[13px] font-semibold text-[#1a6fa8]">
                  {app.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-[13.5px] font-medium text-[#101828]">{app.name}</p>
                  <p className="text-[12px] text-[#667085]">{app.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-[#1a6fa8]">{app.score}%</span>
                <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge(app.status)}`}>
                  {app.status}
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
// Active Jobs
// ------------------------------------------------------------------

function ActiveJobs() {
  return (
    <Card className="rounded-xl border-[#EAECF0] shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#101828]">Active Jobs</h3>
          <Link to="/company/post-job" className="flex items-center gap-1 text-[13px] font-medium text-[#1a6fa8] hover:underline">
            Post New <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-[#EAECF0]">
          {activeJobs.map((job) => (
            <div key={job.title} className="flex items-center justify-between py-3">
              <div>
                <p className="text-[13.5px] font-medium text-[#101828]">{job.title}</p>
                <div className="mt-0.5 flex items-center gap-3 text-[12px] text-[#667085]">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.applicants} applicants</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.daysLeft} days left</span>
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
// Company Dashboard Page
// ------------------------------------------------------------------

export default function CompanyDashboard() {
  return (
    <CompanyDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">
              Company Dashboard 🏢
            </h1>
            <p className="mt-1 text-[13.5px] text-[#667085]">
              Manage your job postings, screen candidates, and track hiring progress.
            </p>
          </div>
          <Link
            to="/company/post-job"
            className="hidden h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 text-[13.5px] font-medium text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 sm:flex"
          >
            <Briefcase className="h-4 w-4" />
            Post a New Job
          </Link>
        </div>

        <StatsSection />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <ApplicantTrend />
          </div>
          <div className="xl:col-span-2">
            <RecentApplicants />
          </div>
        </div>

        <ActiveJobs />
      </div>
    </CompanyDashboardLayout>
  );
}
