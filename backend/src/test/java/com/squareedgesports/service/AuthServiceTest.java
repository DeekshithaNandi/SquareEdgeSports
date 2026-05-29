package com.squareedgesports.service;

import com.squareedgesports.dto.*;
import com.squareedgesports.entity.*;
import com.squareedgesports.repository.*;
import com.squareedgesports.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository               userRepo;
    @Mock OtpRepository                otpRepo;
    @Mock PasswordResetTokenRepository resetTokenRepo;
    @Mock EmployeePermissionRepository permRepo;
    @Mock EmailService                 emailService;
    @Mock PasswordEncoder              encoder;
    @Mock JwtUtil                      jwtUtil;

    @InjectMocks AuthService authService;

    private User activeVerifiedUser;
    private User unverifiedUser;
    private User deactivatedUser;

    private ResetPasswordRequest resetReq(String token, String newPassword) {
        ResetPasswordRequest r = new ResetPasswordRequest();
        r.setToken(token);
        r.setNewPassword(newPassword);
        return r;
    }

    @BeforeEach
    void setUp() {
        activeVerifiedUser = User.builder()
                .id(1L).fullName("Alice Smith").email("alice@example.com")
                .password("$2a$10$hashed").phone("9999999999")
                .role(User.Role.PLAYER).emailVerified(true).active(true).build();

        unverifiedUser = User.builder()
                .id(2L).fullName("Bob Jones").email("bob@example.com")
                .password("$2a$10$hashed").role(User.Role.PLAYER)
                .emailVerified(false).active(true).build();

        deactivatedUser = User.builder()
                .id(3L).fullName("Carol Lee").email("carol@example.com")
                .password("$2a$10$hashed").role(User.Role.PLAYER)
                .emailVerified(true).active(false).build();
    }

    // ─── sendOtp() ────────────────────────────────────────────────────────────

    @Test
    void sendOtp_emailAlreadyRegistered_returnsError() {
        when(userRepo.existsByEmail("alice@example.com")).thenReturn(true);

        ApiResponse response = authService.sendOtp("alice@example.com", "Alice");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("already exists");
        verify(otpRepo, never()).save(any());
    }

    @Test
    void sendOtp_newEmail_savesOtpAndSendsEmail() {
        when(userRepo.existsByEmail("new@example.com")).thenReturn(false);

        ApiResponse response = authService.sendOtp("new@example.com", "New User");

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).contains("OTP sent");

        ArgumentCaptor<OtpVerification> captor = ArgumentCaptor.forClass(OtpVerification.class);
        verify(otpRepo).save(captor.capture());
        OtpVerification saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("new@example.com");
        assertThat(saved.getOtp()).hasSize(6).matches("\\d{6}");
        assertThat(saved.isUsed()).isFalse();
        assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now());

        verify(emailService).sendOtp(eq("new@example.com"), any(), eq("New User"));
    }

    @Test
    void sendOtp_nullName_usesDefaultName() {
        when(userRepo.existsByEmail("new@example.com")).thenReturn(false);

        authService.sendOtp("new@example.com", null);

        verify(emailService).sendOtp(eq("new@example.com"), any(), eq("User"));
    }

    @Test
    void sendOtp_deletesExistingOtpsBeforeSaving() {
        when(userRepo.existsByEmail("new@example.com")).thenReturn(false);

        authService.sendOtp("new@example.com", "User");

        InOrder order = inOrder(otpRepo);
        order.verify(otpRepo).deleteByEmail("new@example.com");
        order.verify(otpRepo).save(any());
    }

    @Test
    void sendOtp_otpExpiresIn10Minutes() {
        when(userRepo.existsByEmail("new@example.com")).thenReturn(false);

        LocalDateTime before = LocalDateTime.now().plusMinutes(9).plusSeconds(55);
        authService.sendOtp("new@example.com", "User");
        LocalDateTime after  = LocalDateTime.now().plusMinutes(10).plusSeconds(5);

        ArgumentCaptor<OtpVerification> captor = ArgumentCaptor.forClass(OtpVerification.class);
        verify(otpRepo).save(captor.capture());
        assertThat(captor.getValue().getExpiresAt()).isBetween(before, after);
    }

    // ─── verifyOtp() ──────────────────────────────────────────────────────────

    @Test
    void verifyOtp_noOtpRecord_throwsRuntimeException() {
        when(otpRepo.findTopByEmailOrderByCreatedAtDesc("nobody@example.com")).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> authService.verifyOtp("nobody@example.com", "123456"));
    }

    @Test
    void verifyOtp_otpAlreadyUsed_returnsError() {
        OtpVerification otp = OtpVerification.builder()
                .email("alice@example.com").otp("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(5)).used(true).build();
        when(otpRepo.findTopByEmailOrderByCreatedAtDesc("alice@example.com")).thenReturn(Optional.of(otp));

        ApiResponse response = authService.verifyOtp("alice@example.com", "123456");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("already used");
    }

    @Test
    void verifyOtp_otpExpired_returnsError() {
        OtpVerification otp = OtpVerification.builder()
                .email("alice@example.com").otp("123456")
                .expiresAt(LocalDateTime.now().minusMinutes(1)).used(false).build();
        when(otpRepo.findTopByEmailOrderByCreatedAtDesc("alice@example.com")).thenReturn(Optional.of(otp));

        ApiResponse response = authService.verifyOtp("alice@example.com", "123456");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("expired");
    }

    @Test
    void verifyOtp_incorrectCode_returnsError() {
        OtpVerification otp = OtpVerification.builder()
                .email("alice@example.com").otp("111111")
                .expiresAt(LocalDateTime.now().plusMinutes(5)).used(false).build();
        when(otpRepo.findTopByEmailOrderByCreatedAtDesc("alice@example.com")).thenReturn(Optional.of(otp));

        ApiResponse response = authService.verifyOtp("alice@example.com", "999999");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Incorrect OTP");
    }

    @Test
    void verifyOtp_correctCode_marksUsedAndReturnsSuccess() {
        OtpVerification otp = OtpVerification.builder()
                .email("alice@example.com").otp("654321")
                .expiresAt(LocalDateTime.now().plusMinutes(5)).used(false).build();
        when(otpRepo.findTopByEmailOrderByCreatedAtDesc("alice@example.com")).thenReturn(Optional.of(otp));

        ApiResponse response = authService.verifyOtp("alice@example.com", "654321");

        assertThat(response.isSuccess()).isTrue();
        assertThat(otp.isUsed()).isTrue();
        verify(otpRepo).save(otp);
    }

    // ─── register() ───────────────────────────────────────────────────────────

    @Test
    void register_emailAlreadyRegistered_returnsError() {
        when(userRepo.existsByEmail("alice@example.com")).thenReturn(true);
        RegisterRequest req = new RegisterRequest("Alice", "alice@example.com", "password123", "9999");

        ApiResponse response = authService.register(req);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("already registered");
    }

    @Test
    void register_noOtpRecord_returnsError() {
        when(userRepo.existsByEmail("new@example.com")).thenReturn(false);
        when(otpRepo.findTopByEmailOrderByCreatedAtDesc("new@example.com")).thenReturn(Optional.empty());

        RegisterRequest req = new RegisterRequest("New", "new@example.com", "password123", null);
        ApiResponse response = authService.register(req);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("not verified");
    }

    @Test
    void register_otpNotYetVerified_returnsError() {
        when(userRepo.existsByEmail("new@example.com")).thenReturn(false);
        OtpVerification otp = OtpVerification.builder()
                .email("new@example.com").otp("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(5)).used(false).build(); // NOT used
        when(otpRepo.findTopByEmailOrderByCreatedAtDesc("new@example.com")).thenReturn(Optional.of(otp));

        RegisterRequest req = new RegisterRequest("New", "new@example.com", "password123", null);
        ApiResponse response = authService.register(req);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("not verified");
    }

    @Test
    void register_success_savesUserWithPlayerRoleAndEncodedPassword() {
        when(userRepo.existsByEmail("new@example.com")).thenReturn(false);
        OtpVerification otp = OtpVerification.builder()
                .email("new@example.com").otp("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(5)).used(true).build();
        when(otpRepo.findTopByEmailOrderByCreatedAtDesc("new@example.com")).thenReturn(Optional.of(otp));
        when(encoder.encode("password123")).thenReturn("$2a$encoded");

        RegisterRequest req = new RegisterRequest("New User", "new@example.com", "password123", "9876543210");
        ApiResponse response = authService.register(req);

        assertThat(response.isSuccess()).isTrue();
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("new@example.com");
        assertThat(saved.getPassword()).isEqualTo("$2a$encoded");
        assertThat(saved.getRole()).isEqualTo(User.Role.PLAYER);
        assertThat(saved.isEmailVerified()).isTrue();
        assertThat(saved.isActive()).isTrue();
    }

    @Test
    void register_success_deletesOtpAfterRegistration() {
        when(userRepo.existsByEmail("new@example.com")).thenReturn(false);
        OtpVerification otp = OtpVerification.builder()
                .email("new@example.com").otp("000000")
                .expiresAt(LocalDateTime.now().plusMinutes(5)).used(true).build();
        when(otpRepo.findTopByEmailOrderByCreatedAtDesc("new@example.com")).thenReturn(Optional.of(otp));
        when(encoder.encode(any())).thenReturn("$2a$encoded");

        authService.register(new RegisterRequest("New", "new@example.com", "pass1234", null));

        verify(otpRepo).deleteByEmail("new@example.com");
    }

    // ─── login() ──────────────────────────────────────────────────────────────

    @Test
    void login_userNotRegistered_throwsException() {
        when(userRepo.findByEmail("unknown@example.com")).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class,
                () -> authService.login(new LoginRequest("unknown@example.com", "pass")));
    }

    @Test
    void login_wrongPassword_throwsException() {
        when(userRepo.findByEmail("alice@example.com")).thenReturn(Optional.of(activeVerifiedUser));
        when(encoder.matches("wrongpass", "$2a$10$hashed")).thenReturn(false);

        assertThrows(RuntimeException.class,
                () -> authService.login(new LoginRequest("alice@example.com", "wrongpass")));
    }

    @Test
    void login_emailNotVerified_throwsException() {
        when(userRepo.findByEmail("bob@example.com")).thenReturn(Optional.of(unverifiedUser));
        when(encoder.matches("pass", "$2a$10$hashed")).thenReturn(true);

        assertThrows(RuntimeException.class,
                () -> authService.login(new LoginRequest("bob@example.com", "pass")));
    }

    @Test
    void login_accountDeactivated_throwsException() {
        when(userRepo.findByEmail("carol@example.com")).thenReturn(Optional.of(deactivatedUser));
        when(encoder.matches("pass", "$2a$10$hashed")).thenReturn(true);

        assertThrows(RuntimeException.class,
                () -> authService.login(new LoginRequest("carol@example.com", "pass")));
    }

    @Test
    void login_success_returnsTokenAndUserDto() {
        when(userRepo.findByEmail("alice@example.com")).thenReturn(Optional.of(activeVerifiedUser));
        when(encoder.matches("correctpass", "$2a$10$hashed")).thenReturn(true);
        when(jwtUtil.generate("alice@example.com", "PLAYER")).thenReturn("jwt.token.here");

        AuthResponse response = authService.login(new LoginRequest("alice@example.com", "correctpass"));

        assertThat(response.getToken()).isEqualTo("jwt.token.here");
        assertThat(response.getUser().getEmail()).isEqualTo("alice@example.com");
        assertThat(response.getMessage()).contains("Welcome");
    }

    @Test
    void login_success_messageContainsUserFullName() {
        when(userRepo.findByEmail("alice@example.com")).thenReturn(Optional.of(activeVerifiedUser));
        when(encoder.matches("pass", "$2a$10$hashed")).thenReturn(true);
        when(jwtUtil.generate(any(), any())).thenReturn("token");

        AuthResponse response = authService.login(new LoginRequest("alice@example.com", "pass"));

        assertThat(response.getMessage()).contains("Alice Smith");
    }

    // ─── forgotPassword() ─────────────────────────────────────────────────────

    @Test
    void forgotPassword_userNotRegistered_throwsException() {
        when(userRepo.findByEmail("nobody@example.com")).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> authService.forgotPassword("nobody@example.com"));
    }

    @Test
    void forgotPassword_success_savesTokenAndSendsEmail() {
        when(userRepo.findByEmail("alice@example.com")).thenReturn(Optional.of(activeVerifiedUser));

        ApiResponse response = authService.forgotPassword("alice@example.com");

        assertThat(response.isSuccess()).isTrue();

        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(resetTokenRepo).save(captor.capture());
        PasswordResetToken saved = captor.getValue();
        assertThat(saved.getToken()).isNotBlank().hasSize(36); // UUID length
        assertThat(saved.getEmail()).isEqualTo("alice@example.com");
        assertThat(saved.isUsed()).isFalse();
        assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now().plusMinutes(25));

        verify(emailService).sendPasswordResetEmail(eq("alice@example.com"), eq("Alice Smith"), any());
    }

    @Test
    void forgotPassword_deletesExistingTokenFirst() {
        when(userRepo.findByEmail("alice@example.com")).thenReturn(Optional.of(activeVerifiedUser));

        authService.forgotPassword("alice@example.com");

        InOrder order = inOrder(resetTokenRepo);
        order.verify(resetTokenRepo).deleteByEmail("alice@example.com");
        order.verify(resetTokenRepo).save(any());
    }

    // ─── resetPassword() ──────────────────────────────────────────────────────

    @Test
    void resetPassword_invalidToken_throwsException() {
        when(resetTokenRepo.findByToken("bad-token")).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class,
                () -> authService.resetPassword(resetReq("bad-token", "newpass123")));
    }

    @Test
    void resetPassword_tokenAlreadyUsed_throwsException() {
        PasswordResetToken token = PasswordResetToken.builder()
                .token("used-token").email("alice@example.com")
                .expiresAt(LocalDateTime.now().plusMinutes(20)).used(true).build();
        when(resetTokenRepo.findByToken("used-token")).thenReturn(Optional.of(token));

        assertThrows(RuntimeException.class,
                () -> authService.resetPassword(resetReq("used-token", "newpass123")));
    }

    @Test
    void resetPassword_tokenExpired_throwsException() {
        PasswordResetToken token = PasswordResetToken.builder()
                .token("expired-token").email("alice@example.com")
                .expiresAt(LocalDateTime.now().minusMinutes(1)).used(false).build();
        when(resetTokenRepo.findByToken("expired-token")).thenReturn(Optional.of(token));

        assertThrows(RuntimeException.class,
                () -> authService.resetPassword(resetReq("expired-token", "newpass123")));
    }

    @Test
    void resetPassword_success_updatesPasswordAndMarksTokenUsed() {
        PasswordResetToken token = PasswordResetToken.builder()
                .token("valid-token").email("alice@example.com")
                .expiresAt(LocalDateTime.now().plusMinutes(20)).used(false).build();
        when(resetTokenRepo.findByToken("valid-token")).thenReturn(Optional.of(token));
        when(userRepo.findByEmail("alice@example.com")).thenReturn(Optional.of(activeVerifiedUser));
        when(encoder.encode("NewPass@123")).thenReturn("$2a$newencoded");

        ApiResponse response = authService.resetPassword(resetReq("valid-token", "NewPass@123"));

        assertThat(response.isSuccess()).isTrue();
        assertThat(activeVerifiedUser.getPassword()).isEqualTo("$2a$newencoded");
        assertThat(token.isUsed()).isTrue();
        verify(userRepo).save(activeVerifiedUser);
        verify(resetTokenRepo).save(token);
    }

    @Test
    void resetPassword_userNotFound_throwsException() {
        PasswordResetToken token = PasswordResetToken.builder()
                .token("orphan-token").email("ghost@example.com")
                .expiresAt(LocalDateTime.now().plusMinutes(20)).used(false).build();
        when(resetTokenRepo.findByToken("orphan-token")).thenReturn(Optional.of(token));
        when(userRepo.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> authService.resetPassword(resetReq("orphan-token", "newpass123")));
    }

    // ─── me() ─────────────────────────────────────────────────────────────────

    @Test
    void me_existingEmail_returnsUserDto() {
        when(userRepo.findByEmail("alice@example.com")).thenReturn(Optional.of(activeVerifiedUser));

        UserDto dto = authService.me("alice@example.com");

        assertThat(dto.getEmail()).isEqualTo("alice@example.com");
        assertThat(dto.getFullName()).isEqualTo("Alice Smith");
        assertThat(dto.getRole()).isEqualTo("PLAYER");
    }

    @Test
    void me_unknownEmail_throwsRuntimeException() {
        when(userRepo.findByEmail("ghost@example.com")).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> authService.me("ghost@example.com"));
    }

    // ─── mapUser() ────────────────────────────────────────────────────────────

    @Test
    void mapUser_employee_includesPermissions() {
        User employee = User.builder()
                .id(5L).fullName("Emp User").email("emp@example.com").password("hash")
                .role(User.Role.EMPLOYEE).emailVerified(true).active(true).build();

        EmployeePermission perms = EmployeePermission.builder()
                .user(employee).canManageBookings(true).canManagePayments(false)
                .canManageCourts(true).canViewReports(false).canManageUsers(true).build();
        when(permRepo.findByUserId(5L)).thenReturn(Optional.of(perms));

        UserDto dto = authService.mapUser(employee);

        assertThat(dto.getPermissions()).isNotNull();
        assertThat(dto.getPermissions().isCanManageBookings()).isTrue();
        assertThat(dto.getPermissions().isCanManagePayments()).isFalse();
        assertThat(dto.getPermissions().isCanManageCourts()).isTrue();
    }

    @Test
    void mapUser_player_noPermissionsIncluded() {
        UserDto dto = authService.mapUser(activeVerifiedUser);

        assertThat(dto.getPermissions()).isNull();
    }
}
