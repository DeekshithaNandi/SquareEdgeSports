import { useEffect } from 'react'
import { pingBackend } from './api/axios'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Spinner from './components/common/Spinner'

// Public pages
import LandingPage from './pages/public/LandingPage'

// Auth pages
import LoginPage           from './pages/auth/LoginPage'
import RegisterPage        from './pages/auth/RegisterPage'
import ForgotPasswordPage  from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage   from './pages/auth/ResetPasswordPage'

// User pages
import UserLayout    from './components/layout/UserLayout'
import UserDashboard from './pages/user/UserDashboard'
import MyBookings    from './pages/user/MyBookings'
import EditProfile   from './pages/user/EditProfile'
import FeedbackPage  from './pages/user/FeedbackPage'
import PaymentsPage      from './pages/user/PaymentsPage'
import UserMemberships from './pages/user/UserMemberships'
import LiveCourtView from './pages/user/LiveCourtView'

// Admin pages
import AdminLayout   from './components/layout/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminBookings from './pages/admin/AdminBookings'
import AdminCreateBooking from './pages/admin/AdminCreateBooking'
import AdminUsers    from './pages/admin/AdminUsers'
import AdminPayments from './pages/admin/AdminPayments'
import AdminRevenue  from './pages/admin/AdminRevenue'
import AdminCourts   from './pages/admin/AdminCourts'
import AdminPricing  from './pages/admin/AdminPricing'
import AdminFeedback from './pages/admin/AdminFeedback'
import AdminCMS      from './pages/admin/AdminCMS'
import AdminMemberships from './pages/admin/AdminMemberships'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size={32} /></div>
  if (!user)   return <Navigate to="/login" replace />
  if (adminOnly) {
    const isAdmin = ['SUPER_ADMIN', 'ADMINISTRATOR', 'EMPLOYEE'].includes(user.role)
    if (!isAdmin) return <Navigate to="/dashboard" replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size={32} /></div>
  if (user) {
    const isAdmin = ['SUPER_ADMIN', 'ADMINISTRATOR', 'EMPLOYEE'].includes(user.role)
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  }
  return children
}

export default function App() {
  useEffect(() => { pingBackend() }, [])
  return (
    <Routes>
      {/* Landing page â€” accessible to everyone */}
      <Route path="/" element={<LandingPage />} />

      {/* Public auth routes */}
      <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />

      {/* Live court view â€” public */}
      <Route path="/live" element={<LiveCourtView />} />

      {/* User routes */}
      <Route path="/" element={<PrivateRoute><UserLayout /></PrivateRoute>}>
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="bookings"  element={<MyBookings />} />
        <Route path="profile"   element={<EditProfile />} />
        <Route path="feedback"  element={<FeedbackPage />} />
        <Route path="payments"     element={<PaymentsPage />} />
        <Route path="memberships" element={<UserMemberships />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<PrivateRoute adminOnly><AdminLayout /></PrivateRoute>}>
        <Route index           element={<AdminOverview />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="bookings/new" element={<AdminCreateBooking />} />
        <Route path="users"    element={<AdminUsers />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="revenue"  element={<AdminRevenue />} />
        <Route path="courts"   element={<AdminCourts />} />
        <Route path="pricing"  element={<AdminPricing />} />
        <Route path="feedback" element={<AdminFeedback />} />
        <Route path="cms"      element={<AdminCMS />} />
        <Route path="memberships" element={<AdminMemberships />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

