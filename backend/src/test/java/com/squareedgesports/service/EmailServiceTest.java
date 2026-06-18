package com.squareedgesports.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Properties;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EmailServiceTest {

    EmailService emailService;
    JavaMailSender mailSender;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        when(mailSender.createMimeMessage()).thenAnswer(invocation ->
                new MimeMessage(Session.getInstance(new Properties())));

        emailService = new EmailService(mailSender);
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:5174");
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        ReflectionTestUtils.setField(emailService, "fromEmail", "deekshithalakshmi2@gmail.com");
    }

    @Test
    void sendOtp_doesNotThrow() {
        emailService.sendOtp("test@example.com", "123456", "Test");
    }

    @Test
    void sendPasswordReset_doesNotThrow() {
        emailService.sendPasswordResetEmail("test@example.com", "Test", "token");
    }

    @Test
    void sendAdminInvite_doesNotThrow() {
        emailService.sendAdminInviteEmail("a@b.com", "Admin", "token", "EMPLOYEE");
    }

    @Test
    void sendBookingConfirmation_doesNotThrow() {
        emailService.sendBookingConfirmation("test@example.com", "Test", "BK-1", "details");
    }

    @Test
    void sendCourtAssignment_doesNotThrow() {
        emailService.sendCourtAssignment("test@example.com", "Test", "CRICKET_LANE", "2025-06-01", "09:00", 2, null,
                "BOX_A");
    }

    @Test
    void sendMembershipActivation_doesNotThrow() {
        emailService.sendMembershipActivation("test@example.com", "Test", "PICKLEBALL", "2026-01-01");
    }

    @Test
    void sendRefundConfirmation_doesNotThrow() {
        emailService.sendRefundConfirmation("test@example.com", "Test", "PICKLEBALL", "2025-06-01",
                BigDecimal.valueOf(300), "FULL");
    }

    @Test
    void sendNoRefundNotification_doesNotThrow() {
        emailService.sendNoRefundNotification("test@example.com", "Test", "BOX_CRICKET", "2025-06-01", "09:00");
    }

    @Test
    void sendContactEmail_doesNotThrow() {
        emailService.sendContactEmail("John", "john@example.com", "Hi", "msg");
    }

    @Test
    void sendEmailChangeOtp_doesNotThrow() {
        emailService.sendEmailChangeOtp("test@example.com", "Test", "654321");
    }
}
