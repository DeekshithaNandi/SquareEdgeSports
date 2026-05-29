# ⚡ SquareEdgeSports — Full-Stack Platform

A secure, scalable indoor sports court booking platform with advanced authentication, role-based admin control, and a polished modern UI.

---

## 🏗️ Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Backend   | Spring Boot 3.2, Spring Security, JPA, MySQL    |
| Auth      | JWT (JJWT), BCrypt, OTP via Email               |
| Email     | JavaMailSender (Gmail SMTP)                     |
| Frontend  | React 18 + Vite, TailwindCSS, React Router v6   |
| HTTP      | Axios with JWT interceptors                     |

---

## 🚀 Quick Start

### Prerequisites
- Java 17+, Maven, MySQL 8+, Node.js 18+

### Backend Setup

```bash
cd backend

# 1. Create database
mysql -u root -p -e "CREATE DATABASE squareedgesports_db;"

# 2. Configure credentials
# Edit src/main/resources/application.properties:
#   spring.datasource.password=YOUR_DB_PASSWORD
#   spring.mail.username=YOUR_GMAIL@gmail.com
#   spring.mail.password=YOUR_GMAIL_APP_PASSWORD
#   app.email.from=YOUR_GMAIL@gmail.com

# 3. Run
mvn spring-boot:run
```
Backend starts at **http://localhost:8080**

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Frontend starts at **http://localhost:5173**

---

## 🔑 Default Admin Credentials

| Role         | Email                        | Password      |
|--------------|------------------------------|---------------|
| Super Admin  | admin@squareedgesports.com   | Admin@2024!   |
| Administrator| manager@squareedgesports.com | Manager@2024! |

---

## ✨ Features

### 🔐 Authentication
- OTP-based email verification on registration
- JWT login with BCrypt password hashing
- **Forgot Password** → time-limited reset link (30 min)
- **Reset Password** page with strength indicator
- Email change with OTP verification

### 👤 User Dashboard
- Booking history & payment history
- Profile avatar (top-right dropdown: View / Edit / Logout)
- Edit profile: full name, phone, **address** (new), profile photo upload
- Change email with OTP verification flow
- Change password

### 🛠️ Admin Dashboard
- **User Management (CRUD)**
  - View, edit (name/phone/address/role/status/password), delete
  - **Invite user by email** → user sets own password via invite link
  - Role assignment: Super Admin / Administrator / Employee / Player
  - Membership management (Cricket Lane / Box Cricket / Pickleball)
- **Employee Permissions (RBAC)**
  - Per-employee toggle: Bookings / Payments / Courts / Reports / Users
- Courts, Pricing, Feedback, CMS, Revenue management

### 📧 Email Notifications (SquareEdgeSports-branded HTML)
- Registration OTP
- Password reset link
- Admin invite link (24hr expiry)
- Email change OTP
- Booking confirmation

### 🔒 Security
- Spring Security filter chain, stateless JWT
- BCrypt password hashing
- Token expiry (reset: 30min, invite: 24hr, JWT: 24hr)
- Email enumeration protection on forgot-password
- File upload validation (type + 5MB size limit)
- CORS configured for local dev

---

## 📁 Project Structure

```
squareedgesports/
├── backend/
│   ├── src/main/java/com/squareedgesports/
│   │   ├── config/          SecurityConfig, DataInitializer
│   │   ├── controller/      AuthController, UserController, AdminController, ...
│   │   ├── dto/             UserDto, ForgotPasswordRequest, ResetPasswordRequest, ...
│   │   ├── entity/          User, PasswordResetToken, EmployeePermission, ...
│   │   ├── repository/      UserRepository, PasswordResetTokenRepository, ...
│   │   ├── security/        JwtAuthFilter, CustomUserDetailsService
│   │   ├── service/         AuthService, EmailService, BookingService
│   │   └── util/            JwtUtil
│   └── src/main/resources/
│       └── application.properties
│
├── frontend/
│   └── src/
│       ├── api/             axios.js, index.js
│       ├── components/
│       │   ├── common/      Badge, Modal, Spinner, StatCard
│       │   └── layout/      UserLayout, AdminLayout
│       ├── context/         AuthContext.jsx
│       └── pages/
│           ├── auth/        LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
│           ├── user/        UserDashboard, MyBookings, EditProfile, PaymentsPage, FeedbackPage
│           └── admin/       AdminOverview, AdminUsers, AdminBookings, AdminPayments,
│                            AdminRevenue, AdminCourts, AdminPricing, AdminFeedback, AdminCMS
│
└── docs/
    ├── README.md
    └── schema.sql
```

---

## 🔌 API Reference

### Auth (public)
| Method | Endpoint                          | Description                  |
|--------|-----------------------------------|------------------------------|
| POST   | `/api/auth/send-otp`              | Send registration OTP        |
| POST   | `/api/auth/verify-otp`            | Verify OTP                   |
| POST   | `/api/auth/register`              | Register user                |
| POST   | `/api/auth/login`                 | Login → JWT                  |
| GET    | `/api/auth/me`                    | Current user (auth required) |
| POST   | `/api/auth/forgot-password`       | Send reset link              |
| POST   | `/api/auth/reset-password`        | Reset password via token     |

### User (auth required)
| Method | Endpoint                                      | Description           |
|--------|-----------------------------------------------|-----------------------|
| GET    | `/api/user/profile`                           | Get profile           |
| PUT    | `/api/user/profile`                           | Update profile        |
| POST   | `/api/user/profile/picture`                   | Upload avatar         |
| POST   | `/api/user/profile/change-email/send`         | Send email change OTP |
| POST   | `/api/user/profile/change-email/verify`       | Confirm email change  |

### Admin (SUPER_ADMIN / ADMINISTRATOR only)
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/api/admin/users`                    | All users                |
| POST   | `/api/admin/users/invite`             | Invite user by email     |
| PUT    | `/api/admin/users/{id}`               | Update user              |
| DELETE | `/api/admin/users/{id}`               | Delete user              |
| GET    | `/api/admin/users/{id}/permissions`   | Get employee permissions |
| PUT    | `/api/admin/users/{id}/permissions`   | Update permissions       |

---

## ⚙️ Gmail App Password Setup

1. Enable 2FA on your Google account
2. Go to: Google Account → Security → App Passwords
3. Generate an app password for "Mail"
4. Use that 16-character password in `spring.mail.password`

---

## 🌐 Environment Variables (Frontend)

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:8080/api
```
