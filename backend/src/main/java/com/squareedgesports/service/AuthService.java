package com.squareedgesports.service;

import com.squareedgesports.dto.*;
import com.squareedgesports.entity.*;
import com.squareedgesports.repository.*;
import com.squareedgesports.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
// import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepo;
    private final OtpRepository otpRepo;
    private final PasswordResetTokenRepository resetTokenRepo;
    private final EmployeePermissionRepository permRepo;
    private final EmailService emailService;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    // ── Send OTP (registration) ──────────────────────────────────────────────
    // @Transactional
    public ApiResponse sendOtp(String email, String name) {
        if (userRepo.existsByEmail(email))
            return ApiResponse.error("An account with this email already exists.");
        otpRepo.deleteByEmail(email);
        // String code = String.format("%06d", new Random().nextInt(1_000_000));
        // ✅ Fix
        String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));

        otpRepo.save(OtpVerification.builder()
                .email(email).otp(code)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false).build());
        emailService.sendOtp(email, code, name != null ? name : "User");
        return ApiResponse.ok("OTP sent to " + email);
    }

    // ── Verify OTP ───────────────────────────────────────────────────────────
    public ApiResponse verifyOtp(String email, String code) {
        var otp = otpRepo.findTopByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new RuntimeException("No OTP found for this email."));
        if (otp.isUsed())
            return ApiResponse.error("OTP already used.");
        if (otp.isExpired())
            return ApiResponse.error("OTP expired. Please request a new one.");
        if (!otp.getOtp().equals(code))
            return ApiResponse.error("Incorrect OTP.");
        otp.setUsed(true);
        otpRepo.save(otp);
        return ApiResponse.ok("OTP verified successfully.");
    }

    // ── Register ─────────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse register(RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail()))
            return ApiResponse.error("Email already registered.");
        var otp = otpRepo.findTopByEmailOrderByCreatedAtDesc(req.getEmail()).orElse(null);
        if (otp == null || !otp.isUsed())
            return ApiResponse.error("Email not verified. Please verify your email first.");
        userRepo.save(User.builder()
                .fullName(req.getFullName()).email(req.getEmail())
                .password(encoder.encode(req.getPassword()))
                .phone(req.getPhone()).role(User.Role.PLAYER)
                .emailVerified(true).active(true).build());
        otpRepo.deleteByEmail(req.getEmail());
        return ApiResponse.ok("Registration successful. You can now sign in.");
    }

    // ── Login ────────────────────────────────────────────────────────────────
    public AuthResponse login(LoginRequest req) {
        var user = userRepo.findByEmail(req.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));
        if (!encoder.matches(req.getPassword(), user.getPassword()))
            throw new RuntimeException("Invalid email or password.");
        if (!user.isEmailVerified())
            throw new RuntimeException("Please verify your email before signing in.");
        if (!user.isActive())
            throw new RuntimeException("Your account has been deactivated. Contact support.");
        String token = jwtUtil.generate(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, mapUser(user), "Welcome back, " + user.getFullName() + "!");
    }

    // ── Forgot Password ──────────────────────────────────────────────────────
    @Transactional
    public ApiResponse forgotPassword(String email) {
        var user = userRepo.findByEmail(email).orElse(null);
        if (user == null)
            return ApiResponse.ok("If this email is registered, a reset link has been sent.");
        resetTokenRepo.deleteByEmail(email);
        String token = UUID.randomUUID().toString();
        resetTokenRepo.save(PasswordResetToken.builder()
                .token(token).email(email)
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .used(false).build());
        emailService.sendPasswordResetEmail(email, user.getFullName(), token);
        return ApiResponse.ok("If this email is registered, a reset link has been sent.");
    }

    // ── Reset Password ───────────────────────────────────────────────────────
    @Transactional
    public ApiResponse resetPassword(ResetPasswordRequest req) {
        var tokenObj = resetTokenRepo.findByToken(req.getToken())
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset link."));
        if (tokenObj.isUsed())
            throw new RuntimeException("This reset link has already been used.");
        if (tokenObj.isExpired())
            throw new RuntimeException("This reset link has expired. Please request a new one.");
        var user = userRepo.findByEmail(tokenObj.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found."));
        user.setPassword(encoder.encode(req.getNewPassword()));
        user.setEmailVerified(true); // ensure verified if this was invite flow
        userRepo.save(user);
        tokenObj.setUsed(true);
        resetTokenRepo.save(tokenObj);
        return ApiResponse.ok("Password updated successfully. You can now sign in.");
    }

    // ── Get current user ─────────────────────────────────────────────────────
    public UserDto me(String email) {
        return mapUser(userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found")));
    }

    // ── Map User → UserDto ───────────────────────────────────────────────────
    public UserDto mapUser(User u) {
        var dto = new UserDto();
        dto.setId(u.getId());
        dto.setFullName(u.getFullName());
        dto.setEmail(u.getEmail());
        dto.setPhone(u.getPhone());
        dto.setAddressLine1(u.getAddressLine1());
        dto.setAddressLine2(u.getAddressLine2());
        dto.setCity(u.getCity());
        dto.setState(u.getState());
        dto.setCountry(u.getCountry());
        dto.setZipCode(u.getZipCode());
        dto.setRole(u.getRole().name());
        dto.setEmailVerified(u.isEmailVerified());
        dto.setActive(u.isActive());
        dto.setProfilePicture(u.getProfilePicture());
        dto.setCricketLaneMember(u.isCricketLaneMember());
        dto.setCricketLaneExpiry(u.getCricketLaneExpiry());
        dto.setCricketLaneGrantedAt(u.getCricketLaneGrantedAt());
        dto.setBoxCricketMember(u.isBoxCricketMember());
        dto.setBoxCricketExpiry(u.getBoxCricketExpiry());
        dto.setBoxCricketGrantedAt(u.getBoxCricketGrantedAt());
        dto.setPickleballMember(u.isPickleballMember());
        dto.setPickleballExpiry(u.getPickleballExpiry());
        dto.setPickleballGrantedAt(u.getPickleballGrantedAt());
        dto.setCreatedAt(u.getCreatedAt());
        // Include permissions for employees
        if (u.getRole() == User.Role.EMPLOYEE) {
            permRepo.findByUserId(u.getId()).ifPresent(p -> {
                var pd = new PermissionsDto();
                pd.setCanManageBookings(p.isCanManageBookings());
                pd.setCanManagePayments(p.isCanManagePayments());
                pd.setCanManageCourts(p.isCanManageCourts());
                pd.setCanViewReports(p.isCanViewReports());
                pd.setCanManageUsers(p.isCanManageUsers());
                dto.setPermissions(pd);
            });
        }
        return dto;
    }
}
