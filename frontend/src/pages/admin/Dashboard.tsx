import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, LogOut, Ticket, Users, Building2, TrendingUp, UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'

interface MonthlyData {
  labels: string[]
  students: number[]
  companies: number[]
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [totalStudents, setTotalStudents] = useState<number | null>(null)
  const [totalCompanies, setTotalCompanies] = useState<number | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null)
  const [loading, setLoading] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('prepmate_token')
      if (!token) return
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setTotalStudents(data.totalStudents)
          setTotalCompanies(data.totalCompanies)
          setMonthlyData(data.monthlyData)
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    fetchStats()
  }, [])

  // Transform monthly data for charts
  const studentChartData = monthlyData?.labels.map((label, i) => ({
    month: label,
    Students: monthlyData.students[i],
  })) || []

  const companyChartData = monthlyData?.labels.map((label, i) => ({
    month: label,
    Companies: monthlyData.companies[i],
  })) || []

  const combinedChartData = monthlyData?.labels.map((label, i) => ({
    month: label,
    Students: monthlyData.students[i],
    Companies: monthlyData.companies[i],
  })) || []

  return (
    <div className="flex min-h-screen bg-[#F7F9FC]">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-[#EAECF0] bg-white">
        <div className="flex items-center gap-2.5 border-b border-[#EAECF0] px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#101828]">Admin Panel</p>
            <p className="text-[11px] text-[#667085]">{user?.email}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <div className="flex items-center gap-2.5 rounded-lg bg-[#1a6fa8]/10 px-3.5 py-2.5 text-[13px] font-medium text-[#1a6fa8]">
            <Shield className="h-4 w-4" />
            Dashboard
          </div>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]">
            <Ticket className="h-4 w-4" />
            Support Tickets
          </button>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]">
            <Users className="h-4 w-4" />
            Students
          </button>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]">
            <Building2 className="h-4 w-4" />
            Companies
          </button>
        </nav>

        <div className="border-t border-[#EAECF0] px-3 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
          <h1 className="text-lg font-semibold text-[#101828]">Admin Dashboard</h1>
          <p className="text-[13px] text-[#667085]">Welcome back, {user?.fullName || 'Admin'}</p>
        </div>

        <div className="p-8 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <Users className="h-6 w-6 text-[#1a6fa8]" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#101828]">
                    {loading ? '...' : totalStudents?.toLocaleString() || '0'}
                  </p>
                  <p className="text-[13px] text-[#667085]">Total Students</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                  <Building2 className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#101828]">
                    {loading ? '...' : totalCompanies?.toLocaleString() || '0'}
                  </p>
                  <p className="text-[13px] text-[#667085]">Registered Companies</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Student Registrations Chart */}
            <div className="rounded-xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <UserPlus className="h-4 w-4 text-[#1a6fa8]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#101828]">Student Registrations</h3>
                  <p className="text-[11px] text-[#667085]">Monthly signups (last 12 months)</p>
                </div>
              </div>
              {loading ? (
                <div className="flex h-[250px] items-center justify-center text-[13px] text-[#98A2B3]">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={studentChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
                    <XAxis dataKey="month" tick={{ fill: '#667085', fontSize: 11 }} axisLine={{ stroke: '#EAECF0' }} />
                    <YAxis tick={{ fill: '#667085', fontSize: 11 }} axisLine={{ stroke: '#EAECF0' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #EAECF0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      labelStyle={{ color: '#101828', fontWeight: 600, fontSize: 13 }}
                    />
                    <Bar dataKey="Students" fill="#1a6fa8" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Company Registrations Chart */}
            <div className="rounded-xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#101828]">Company Registrations</h3>
                  <p className="text-[11px] text-[#667085]">Monthly signups (last 12 months)</p>
                </div>
              </div>
              {loading ? (
                <div className="flex h-[250px] items-center justify-center text-[13px] text-[#98A2B3]">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={companyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
                    <XAxis dataKey="month" tick={{ fill: '#667085', fontSize: 11 }} axisLine={{ stroke: '#EAECF0' }} />
                    <YAxis tick={{ fill: '#667085', fontSize: 11 }} axisLine={{ stroke: '#EAECF0' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #EAECF0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      labelStyle={{ color: '#101828', fontWeight: 600, fontSize: 13 }}
                    />
                    <Bar dataKey="Companies" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Combined Line Chart */}
          <div className="rounded-xl border border-[#EAECF0] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#101828]">Growth Comparison</h3>
                <p className="text-[11px] text-[#667085]">Students vs Companies — monthly trend</p>
              </div>
            </div>
            {loading ? (
              <div className="flex h-[280px] items-center justify-center text-[13px] text-[#98A2B3]">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={combinedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
                  <XAxis dataKey="month" tick={{ fill: '#667085', fontSize: 11 }} axisLine={{ stroke: '#EAECF0' }} />
                  <YAxis tick={{ fill: '#667085', fontSize: 11 }} axisLine={{ stroke: '#EAECF0' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #EAECF0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    labelStyle={{ color: '#101828', fontWeight: 600, fontSize: 13 }}
                  />
                  <Line type="monotone" dataKey="Students" stroke="#1a6fa8" strokeWidth={2} dot={{ fill: '#1a6fa8', r: 3 }} />
                  <Line type="monotone" dataKey="Companies" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
