import API from './axios'

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  sendOtp:          (email, name) => API.post('/auth/send-otp',    { email, name }),
  verifyOtp:        (email, otp)  => API.post('/auth/verify-otp',  { email, otp }),
  register:         (data)        => API.post('/auth/register',    data),
  login:            (data)        => API.post('/auth/login',       data),
  me:               ()            => API.get('/auth/me'),
  forgotPassword:   (email)       => API.post('/auth/forgot-password', { email }),
  resetPassword:    (token, newPassword) => API.post('/auth/reset-password', { token, newPassword }),
  sendEmailChangeOtp:  (newEmail) => API.post('/user/profile/change-email/send', { newEmail }),
  verifyEmailChange:   (newEmail, otp) => API.post('/user/profile/change-email/verify', { newEmail, otp }),
}

// ── Bookings ──────────────────────────────────────────────────────────────
export const bookingAPI = {
  create:                  (data)  => API.post('/bookings',                      data),
  createRazorpayOrder:     (id)    => API.post(`/bookings/${id}/razorpay-order`),
  confirmPayment:          (id, data) => API.post(`/bookings/${id}/confirm-payment`, data),
  createBatchRazorpayOrder: (data) => API.post('/bookings/razorpay-order-batch',  data),
  confirmBatchPayment:      (data) => API.post('/bookings/confirm-payment-batch', data),
  cancel:         (id, reason) => API.patch(`/bookings/${id}/cancel`, { reason }),
  myBookings:     ()           => API.get('/bookings/my'),
  getById:        (id)         => API.get(`/bookings/${id}`),
}

// ── User ──────────────────────────────────────────────────────────────────
export const userAPI = {
  getProfile:          ()       => API.get('/user/profile'),
  updateProfile:       (data)   => API.put('/user/profile', data),
  uploadPicture:       (form)   => API.post('/user/profile/picture', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  submitFeedback:      (data)   => API.post('/user/feedback', data),
  myFeedback:          ()       => API.get('/user/feedback'),
  myPayments:          ()       => API.get('/user/payments'),
  myPermissions:       ()       => API.get('/user/my-permissions'),
  removePhoto:         ()       => API.delete('/user/profile/picture'),
  membershipOrder:     (data)   => API.post('/user/membership/order', data),
  membershipConfirm:   (data)   => API.post('/user/membership/confirm', data),
}
// ── Notifications ─────────────────────────────────────────────────────────
export const notificationAPI = {
  my:          ()   => API.get('/notifications/my'),
  unreadCount: ()   => API.get('/notifications/unread-count'),
  markRead:    (id) => API.patch(`/notifications/${id}/read`),
  markAllRead: ()   => API.patch('/notifications/read-all'),
}

// ── Public ────────────────────────────────────────────────────────────────
export const publicAPI = {
  courts:       () => API.get('/public/courts'),
  pricing:      () => API.get('/public/pricing'),
  cms:          () => API.get('/public/cms'),
  availability: (date, type, boxGroup) =>
    API.get('/public/availability', { params: { date, type, ...(boxGroup ? { boxGroup } : {}) } }),
  liveView:     () => API.get('/public/live-view'),
  contact:      (data) => API.post('/public/contact', data),
}

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminAPI = {
  // Bookings
  allBookings:       ()            => API.get('/admin/bookings'),
  bookingsByDate:    (date)        => API.get(`/admin/bookings/date?date=${date}`),
  cancelledBookings: ()            => API.get('/admin/bookings/cancelled'),
  cancelBooking:     (id, reason)  => API.patch(`/admin/bookings/${id}/cancel`, { reason }),
  refundBooking:     (id)          => API.patch(`/admin/bookings/${id}/refund`),
  notifyNoRefund:    (id)          => API.post(`/admin/bookings/${id}/notify-no-refund`),
  assignCourt:       (id, data)    => API.patch(`/admin/bookings/${id}/assign`, data),
  revenue:           ()            => API.get('/admin/revenue'),
  createBookingForCustomer: (data) => API.post('/admin/bookings', data),
  // Users
  allUsers:          ()            => API.get('/admin/users'),
  getUser:           (id)          => API.get(`/admin/users/${id}`),
  updateUser:        (id, data)    => API.put(`/admin/users/${id}`, data),
  deleteUser:        (id)          => API.delete(`/admin/users/${id}`),
  inviteUser:        (data)        => API.post('/admin/users/invite', data),
  grantMembership:   (id, data) => API.post(`/admin/users/${id}/grant-membership`, data),
  getPermissions:    (id)          => API.get(`/admin/users/${id}/permissions`),
  updatePermissions: (id, data)    => API.put(`/admin/users/${id}/permissions`, data),
  // Courts
  allCourts:         ()            => API.get('/admin/courts'),
  createCourt:       (data)        => API.post('/admin/courts', data),
  updateCourt:       (id, data)    => API.put(`/admin/courts/${id}`, data),
  deleteCourt:       (id)          => API.delete(`/admin/courts/${id}`),
  // Pricing
  allPricing:        ()            => API.get('/admin/pricing'),
  updatePrice:       (id, data)    => API.put(`/admin/pricing/${id}`, data),
  // Feedback
  allFeedback:       ()            => API.get('/admin/feedback'),
  markReviewed:      (id)          => API.patch(`/admin/feedback/${id}/reviewed`),
  // Payments
  allPayments:       ()            => API.get('/admin/payments'),
  refundPayment:     (id)          => API.patch(`/admin/payments/${id}/refund`),
  // CMS
  allCms:            ()            => API.get('/admin/cms'),
  createCms:         (data)        => API.post('/admin/cms', data),
  updateCms:         (id, data)    => API.put(`/admin/cms/${id}`, data),
  deleteCms:         (id)          => API.delete(`/admin/cms/${id}`),
  // Stats
  stats:             ()            => API.get('/admin/stats'),
}
