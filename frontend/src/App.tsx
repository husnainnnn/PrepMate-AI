import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import NotFound from '@/pages/NotFound'

// ─── Protected Route Wrapper ──────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#EAECF0] border-t-[#1a6fa8]" />
      </div>
    )
  }
  if (!user) {
    // Detect role from URL path so login page shows correct form
    const role = location.pathname.startsWith('/company') ? 'company' : 'student'
    return <Navigate to={`/login?role=${role}`} replace />
  }
  return <>{children}</>
}

// Student pages (all from pages/student/, names match sidebar labels)
import StudentDashboard from '@/pages/student/Dashboard'
import StudentProfilePage from '@/pages/student/Profile'
import MockInterviewsPage from '@/pages/student/MockInterviews'
import PracticePage from '@/pages/student/Practice'
import ResumeBuilderPage from '@/pages/student/ResumeBuilder'
import JobMatches from '@/pages/student/JobMatches'
import Applications from '@/pages/student/Applications'
import LiveInterviewsPage from '@/pages/student/LiveInterviews'
import AIFeedbackPage from '@/pages/student/AIFeedback'
import AnalyticsPage from '@/pages/student/Analytics'
import ResourcesPage from '@/pages/student/Resources'
import StudentNotifications from '@/pages/student/Notifications'
import SettingsPage from '@/pages/student/Settings'
import SupportPage from '@/pages/student/Support'
import StudentMessages from '@/pages/student/Messages'

// Company pages
// Company pages (all from pages/company/, names match sidebar labels)
import CompanyDashboard from '@/pages/company/Dashboard'
import PostJob from '@/pages/company/PostJob'
import Applicants from '@/pages/company/Applicants'
import AIScreeningPage from '@/pages/company/AIScreening'
import CompanyInterviewsPage from '@/pages/company/Interviews'
import Shortlisted from '@/pages/company/Shortlisted'
import CompanyAnalytics from '@/pages/company/Analytics'
import Messages from '@/pages/company/Messages'
import CompanyProfilePage from '@/pages/company/CompanyProfile'
import CompanyNotifications from '@/pages/company/Notifications'
import CompanySettings from '@/pages/company/Settings'
import CompanySupport from '@/pages/company/Support'

function App() {
  return (
    <AuthProvider>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Student routes — file names match sidebar labels */}
      <Route path="/student/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute><StudentProfilePage /></ProtectedRoute>} />
      <Route path="/student/interviews" element={<ProtectedRoute><MockInterviewsPage /></ProtectedRoute>} />
      <Route path="/student/questions" element={<ProtectedRoute><PracticePage /></ProtectedRoute>} />
      <Route path="/student/resumes" element={<ProtectedRoute><ResumeBuilderPage /></ProtectedRoute>} />
      <Route path="/student/job-matches" element={<ProtectedRoute><JobMatches /></ProtectedRoute>} />
      <Route path="/student/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
      <Route path="/student/live-interviews" element={<ProtectedRoute><LiveInterviewsPage /></ProtectedRoute>} />
      <Route path="/student/feedback" element={<ProtectedRoute><AIFeedbackPage /></ProtectedRoute>} />
      <Route path="/student/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/student/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
      <Route path="/student/messages" element={<ProtectedRoute><StudentMessages /></ProtectedRoute>} />
      <Route path="/student/notifications" element={<ProtectedRoute><StudentNotifications /></ProtectedRoute>} />
      <Route path="/student/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/student/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />

      {/* Company routes — file names match sidebar labels */}
      <Route path="/company/dashboard" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
      <Route path="/company/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
      <Route path="/company/applicants" element={<ProtectedRoute><Applicants /></ProtectedRoute>} />
      <Route path="/company/screening" element={<ProtectedRoute><AIScreeningPage /></ProtectedRoute>} />
      <Route path="/company/interviews" element={<ProtectedRoute><CompanyInterviewsPage /></ProtectedRoute>} />
      <Route path="/company/shortlisted" element={<ProtectedRoute><Shortlisted /></ProtectedRoute>} />
      <Route path="/company/analytics" element={<ProtectedRoute><CompanyAnalytics /></ProtectedRoute>} />
      <Route path="/company/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/company/profile" element={<ProtectedRoute><CompanyProfilePage /></ProtectedRoute>} />
      <Route path="/company/notifications" element={<ProtectedRoute><CompanyNotifications /></ProtectedRoute>} />
      <Route path="/company/settings" element={<ProtectedRoute><CompanySettings /></ProtectedRoute>} />
      <Route path="/company/support" element={<ProtectedRoute><CompanySupport /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </AuthProvider>
  )
}

export default App
