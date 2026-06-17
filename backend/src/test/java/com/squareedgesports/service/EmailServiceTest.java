package com.squareedgesports.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.Emails;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    Resend resend;
    @Mock
    Emails emails;

    EmailService emailService;

    @BeforeEach
    void setUp() throws ResendException {
        emailService = new EmailService(resend);
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:5173");
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        when(resend.emails()).thenReturn(emails);
        CreateEmailResponse response = new CreateEmailResponse();
        when(emails.send(any(CreateEmailOptions.class))).thenReturn(response);
    }

    // ── emailEnabled = false ──────────────────────────────────────────────────

    @Test
    void sendOtp_emailDisabled_doesNotSend() throws ResendException {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);
        emailService.sendOtp("test@example.com", "123456", "Test User");
        verify(resend, never()).emails();
    }

    @Test
    void sendPasswordResetEmail_emailDisabled_doesNotSend() throws ResendException {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);
        emailService.sendPasswordResetEmail("test@example.com", "Test User", "token");
        verify(resend, never()).emails();
    }

    @Test
    void sendCourtAssignment_emailDisabled_doesNotSend() throws ResendException {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);
        emailService.sendCourtAssignment("test@example.com", "Test", "CRICKET_LANE", "2025-06-01", "09:00", 2, null,
                "BOX_A");
        verify(resend, never()).emails();
    }

    @Test
    void sendRefundConfirmation_emailDisabled_doesNotSend() throws ResendException {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);
        emailService.sendRefundConfirmation("test@example.com", "Test", "PICKLEBALL", "2025-06-01",
                BigDecimal.valueOf(300), "FULL");
        verify(resend, never()).emails();
    }

    @Test
    void sendNoRefundNotification_emailDisabled_doesNotSend() throws ResendException {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);
        emailService.sendNoRefundNotification("test@example.com", "Test", "BOX_CRICKET", "2025-06-01", "09:00");
        verify(resend, never()).emails();
    }

    @Test
    void sendMembershipActivation_emailDisabled_doesNotSend() throws ResendException {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);
        emailService.sendMembershipActivation("test@example.com", "Test", "PICKLEBALL", "2026-01-01");
        verify(resend, never()).emails();
    }

    @Test
    void sendAdminInviteEmail_emailDisabled_doesNotSend() throws ResendException {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);
        emailService.sendAdminInviteEmail("admin@example.com", "Admin", "invite-token", "EMPLOYEE");
        verify(resend, never()).emails();
    }

    @Test
    void sendEmailChangeOtp_emailDisabled_doesNotSend() throws ResendException {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);
        emailService.sendEmailChangeOtp("test@example.com", "Test", "654321");
        verify(resend, never()).emails();
    }

    // ── emailEnabled = true ───────────────────────────────────────────────────

    @Test
    void sendOtp_emailEnabled_sendsEmail() throws ResendException {
        emailService.sendOtp("test@example.com", "123456", "Test User");
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void sendPasswordResetEmail_emailEnabled_sendsEmail() throws ResendException {
        emailService.sendPasswordResetEmail("test@example.com", "Test User", "token-uuid");
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void sendCourtAssignment_emailEnabled_sendsEmail() throws ResendException {
        emailService.sendCourtAssignment("test@example.com", "Test", "PICKLEBALL", "2025-06-01", "10:00", null, 2,
                null);
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void sendRefundConfirmation_emailEnabled_sendsEmail() throws ResendException {
        emailService.sendRefundConfirmation("test@example.com", "Test", "BOX_CRICKET", "2025-06-01",
                BigDecimal.valueOf(250), "HALF");
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void sendNoRefundNotification_emailEnabled_sendsEmail() throws ResendException {
        emailService.sendNoRefundNotification("test@example.com", "Test", "CRICKET_LANE", "2025-06-01", "09:00");
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void sendMembershipActivation_emailEnabled_sendsEmail() throws ResendException {
        emailService.sendMembershipActivation("test@example.com", "Test", "CRICKET_LANE", "2026-12-31");
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void sendAdminInviteEmail_emailEnabled_sendsEmail() throws ResendException {
        emailService.sendAdminInviteEmail("admin@example.com", "Admin User", "invite-token", "ADMINISTRATOR");
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void sendBookingConfirmation_emailEnabled_sendsEmail() throws ResendException {
        emailService.sendBookingConfirmation("test@example.com", "Test", "BK-123", "CRICKET_LANE on 2025-06-01");
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void sendEmailChangeOtp_emailEnabled_sendsEmail() throws ResendException {
        emailService.sendEmailChangeOtp("newemail@example.com", "Test User", "789012");
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void sendOtp_resendThrowsException_doesNotPropagate() throws ResendException {
        when(emails.send(any(CreateEmailOptions.class))).thenThrow(new ResendException("API failure"));
        emailService.sendOtp("test@example.com", "111111", "Test");
    }
}
