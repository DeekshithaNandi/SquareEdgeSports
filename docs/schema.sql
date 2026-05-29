-- SquareEdgeSports Database Schema (v2.0)
-- Run manually or let spring.jpa.hibernate.ddl-auto=update create tables automatically

CREATE DATABASE IF NOT EXISTS squareedgesports_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE squareedgesports_db;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name           VARCHAR(100) NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  password            VARCHAR(255) NOT NULL,
  phone               VARCHAR(20),
  address             TEXT,
  profile_picture     VARCHAR(500),
  role                ENUM('SUPER_ADMIN','ADMINISTRATOR','EMPLOYEE','PLAYER') NOT NULL DEFAULT 'PLAYER',
  email_verified      TINYINT(1) NOT NULL DEFAULT 0,
  active              TINYINT(1) NOT NULL DEFAULT 1,
  cricket_lane_member TINYINT(1) DEFAULT 0,
  box_cricket_member  TINYINT(1) DEFAULT 0,
  pickleball_member   TINYINT(1) DEFAULT 0,
  membership_expiry   DATETIME,
  created_at          DATETIME,
  updated_at          DATETIME
);

-- OTP Verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(150) NOT NULL,
  otp         VARCHAR(10) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used        TINYINT(1) DEFAULT 0,
  created_at  DATETIME
);

-- Password Reset Tokens (also used for admin invite links)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  token       VARCHAR(255) NOT NULL UNIQUE,
  email       VARCHAR(150) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used        TINYINT(1) DEFAULT 0,
  created_at  DATETIME
);

-- Employee Permissions (RBAC)
CREATE TABLE IF NOT EXISTS employee_permissions (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id               BIGINT NOT NULL,
  can_manage_bookings   TINYINT(1) DEFAULT 0,
  can_manage_payments   TINYINT(1) DEFAULT 0,
  can_manage_courts     TINYINT(1) DEFAULT 0,
  can_view_reports      TINYINT(1) DEFAULT 0,
  can_manage_users      TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Courts
CREATE TABLE IF NOT EXISTS courts (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(100) NOT NULL,
  type                 ENUM('CRICKET_LANE','BOX_CRICKET','PICKLEBALL') NOT NULL,
  box_group            VARCHAR(20),
  lane_number          INT,
  location             VARCHAR(200),
  description          TEXT,
  price_per_slot       DECIMAL(10,2),
  member_price_per_slot DECIMAL(10,2),
  capacity             INT,
  status               ENUM('ACTIVE','MAINTENANCE','INACTIVE') DEFAULT 'ACTIVE'
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_ref    VARCHAR(20) NOT NULL UNIQUE,
  user_id        BIGINT NOT NULL,
  court_id       BIGINT NOT NULL,
  booking_date   DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  duration_hours DECIMAL(3,1),
  status         ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED') DEFAULT 'PENDING',
  total_price    DECIMAL(10,2),
  is_member_price TINYINT(1) DEFAULT 0,
  notes          TEXT,
  cancel_reason  TEXT,
  created_at     DATETIME,
  updated_at     DATETIME,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (court_id) REFERENCES courts(id)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id           BIGINT NOT NULL,
  booking_id        BIGINT,
  amount            DECIMAL(10,2) NOT NULL,
  status            ENUM('PENDING','COMPLETED','FAILED','REFUNDED') DEFAULT 'PENDING',
  payment_method    VARCHAR(50),
  payment_reference VARCHAR(100),
  description       TEXT,
  paid_at           DATETIME,
  refunded_at       DATETIME,
  created_at        DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Pricing Rules
CREATE TABLE IF NOT EXISTS pricing_rules (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  rule_key    VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(200),
  price       DECIMAL(10,2) NOT NULL
);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  booking_id  BIGINT,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category    VARCHAR(50),
  comment     TEXT NOT NULL,
  reviewed    TINYINT(1) DEFAULT 0,
  created_at  DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- CMS Content
CREATE TABLE IF NOT EXISTS cms_content (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  body         TEXT,
  image_url    VARCHAR(500),
  content_type VARCHAR(50),
  active       TINYINT(1) DEFAULT 1,
  sort_order   INT DEFAULT 0
);
