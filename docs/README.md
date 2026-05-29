# SquareEdgeSports — Indoor Sports Booking Platform

Full-stack court booking platform built with React (Vite) + Spring Boot + MySQL.

---

## Tech Stack
| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS    |
| Backend  | Spring Boot 3.2 + Spring Security |
| Database | MySQL 8                           |
| Auth     | JWT (Bearer Token)                |
| Email    | Gmail SMTP / JavaMailSender       |

---

## Quick Start

### Backend
```bash
cd backend
# Edit src/main/resources/application.properties:
#   spring.datasource.password=YOUR_DB_PASSWORD
#   spring.mail.username=YOUR_GMAIL@gmail.com
#   spring.mail.password=YOUR_GMAIL_APP_PASSWORD

mvn spring-boot:run
# Runs on http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Default Admin Credentials (seeded on first run)
| Role          | Email                             | Password      |
|---------------|-----------------------------------|---------------|
| Super Admin   | admin@squareedgesports.com        | Admin@2024!   |
| Administrator | manager@squareedgesports.com      | Manager@2024! |

---

## New Features (v2.0)

### 🔐 Authentication
- **Forgot Password** — token-based reset email (30-min expiry)
- **Reset Password** — secure BCrypt hash update
- **Admin Invite** — admin creates users by email; user sets own password (24h link)
- Refresh-safe JWT (token stored as `ses_token`)

### 👤 User Profile
- **Address field** added to profile
- **Profile photo** upload with validation (images only, ≤5MB)
- **Email change** — OTP sent to new email, verified before update
- **Password change** — inline from profile page

### 🛠 Admin Panel
- **User Management CRUD** — create/edit/delete with role dropdown
- **Invite flow** — send invite email with password-setup link
- **Employee Permissions** — toggle module access per employee:
  - Bookings · Payments · Courts · Reports · Users
- **Role indicators** — colour-coded avatars per role

### 📧 Email Templates
All emails branded as SquareEdgeSports with dark-mode HTML:
- OTP / Email verification
- Password reset
- Admin invite / account setup
- Booking confirmation
- Email change verification

---

## Project Structure
```
squareedgesports/
├── backend/
│   └── src/main/java/com/squareedgesports/
│       ├── config/         SecurityConfig, DataInitializer
│       ├── controller/     Auth, User, Admin, Booking, Public
│       ├── dto/            Request/response DTOs
│       ├── entity/         JPA entities
│       ├── repository/     Spring Data repos
│       ├── security/       JwtAuthFilter, UserDetailsService
│       ├── service/        AuthService, EmailService, BookingService
│       └── util/           JwtUtil
└── frontend/
    └── src/
        ├── api/            Axios client + all API calls
        ├── components/     Layout (Admin/User), common UI
        ├── context/        AuthContext
        └── pages/
            ├── auth/       Login, Register, ForgotPassword, ResetPassword
            ├── user/       Dashboard, Bookings, Payments, Feedback, EditProfile
            └── admin/      Overview, Users, Bookings, Payments, Courts...
```
