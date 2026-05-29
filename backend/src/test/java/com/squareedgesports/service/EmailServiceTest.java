package com.squareedgesports.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    JavaMailSender mailSender;

    EmailService emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailService(mailSender);
        ReflectionTestUtils.setField(emailService, "fromEmail", "noreply@squareedgesports.com");
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:5173");
    }

    private MimeMessage mockMimeMessage() {
        MimeMessage msg = mock(MimeMessage.class, RETURNS_DEEP_STUBS);
        when(mailSender.createMimeMessage()).thenReturn(msg);
        return msg;
    }

    // ─── emailEnabled = false ─────────────────────────────────────────────────

    @Test
    void sendOtp_emailDisabled_doesNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendOtp("test@example.com", "123456", "Test User");

        verify(mailSender, never()).createMimeMessage();
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendPasswordResetEmail_emailDisabled_doesNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendPasswordResetEmail("test@example.com", "Test User", "reset-token-uuid");

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendCourtAssignment_emailDisabled_doesNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendCourtAssignment("test@example.com", "Test", "CRICKET_LANE",
                "2025-06-01", "09:00", 2, null, "BOX_A");

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendRefundConfirmation_emailDisabled_doesNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendRefundConfirmation("test@example.com", "Test", "PICKLEBALL",
                "2025-06-01", BigDecimal.valueOf(300), "FULL");

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendNoRefundNotification_emailDisabled_doesNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendNoRefundNotification("test@example.com", "Test", "BOX_CRICKET", "2025-06-01", "09:00");

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendMembershipActivation_emailDisabled_doesNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendMembershipActivation("test@example.com", "Test", "PICKLEBALL", "2026-01-01");

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendAdminInviteEmail_emailDisabled_doesNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendAdminInviteEmail("admin@example.com", "Admin", "invite-token", "EMPLOYEE");

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendEmailChangeOtp_emailDisabled_doesNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendEmailChangeOtp("test@example.com", "Test", "654321");

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    // ─── emailEnabled = true ──────────────────────────────────────────────────

    @Test
    void sendOtp_emailEnabled_createsMimeMessageAndSends() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        mockMimeMessage();

        emailService.sendOtp("test@example.com", "123456", "Test User");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendPasswordResetEmail_emailEnabled_sendsMail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        mockMimeMessage();

        emailService.sendPasswordResetEmail("test@example.com", "Test User", "token-uuid-here");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendCourtAssignment_emailEnabled_sendsMail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        mockMimeMessage();

        emailService.sendCourtAssignment("test@example.com", "Test", "PICKLEBALL",
                "2025-06-01", "10:00", null, 2, null);

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendRefundConfirmation_emailEnabled_sendsMail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        mockMimeMessage();

        emailService.sendRefundConfirmation("test@example.com", "Test", "BOX_CRICKET",
                "2025-06-01", BigDecimal.valueOf(250), "HALF");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendNoRefundNotification_emailEnabled_sendsMail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        mockMimeMessage();

        emailService.sendNoRefundNotification("test@example.com", "Test", "CRICKET_LANE", "2025-06-01", "09:00");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendMembershipActivation_emailEnabled_sendsMail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        mockMimeMessage();

        emailService.sendMembershipActivation("test@example.com", "Test", "CRICKET_LANE", "2026-12-31");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendAdminInviteEmail_emailEnabled_sendsMail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        mockMimeMessage();

        emailService.sendAdminInviteEmail("admin@example.com", "Admin User", "invite-token", "ADMINISTRATOR");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendBookingConfirmation_emailEnabled_sendsMail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        mockMimeMessage();

        emailService.sendBookingConfirmation("test@example.com", "Test", "BK-123", "CRICKET_LANE on 2025-06-01");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendEmailChangeOtp_emailEnabled_sendsMail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        mockMimeMessage();

        emailService.sendEmailChangeOtp("newemail@example.com", "Test User", "789012");

        verify(mailSender).send(any(MimeMessage.class));
    }

    // ─── sendHtml resilience — mail failure does not propagate ────────────────

    @Test
    void sendOtp_mailSenderThrowsException_doesNotPropagateException() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("SMTP failure"));

        // Should not throw — sendHtml swallows exceptions
        emailService.sendOtp("test@example.com", "111111", "Test");
    }
}
