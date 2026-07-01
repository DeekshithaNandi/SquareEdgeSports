package com.squareedgesports.service;

// import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
// import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
// @RequiredArgsConstructor
public class EmailService {

    // private final JavaMailSender mailSender;
    private final org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();

    @Value("${app.email.enabled:true}")
    private boolean emailEnabled;

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:5174}")
    private String frontendUrl;

    @Async
    public void sendOtp(String to, String otp, String name) {
        if (!emailEnabled) {
            log.info("=== OTP for {} : {} ===", to, otp);
            return;
        }
        sendHtml(to, "SquareEdgeSports - Email Verification Code", buildOtpHtml(name, otp));
    }

    @Async
    public void sendPasswordResetEmail(String to, String name, String token) {
        if (!emailEnabled) {
            log.info("=== PASSWORD RESET token for {} : {} ===", to, token);
            return;
        }
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        sendHtml(to, "SquareEdgeSports - Password Reset Request", buildPasswordResetHtml(name, resetLink));
    }

    @Async
    public void sendAdminInviteEmail(String to, String name, String token, String role) {
        if (!emailEnabled) {
            log.info("=== INVITE token for {} : {} ===", to, token);
            return;
        }
        String setupLink = frontendUrl + "/reset-password?token=" + token + "&invite=true";
        sendHtml(to, "SquareEdgeSports - You've Been Invited", buildInviteHtml(name, role, setupLink));
    }

    @Async
    public void sendEmailChangeOtp(String to, String name, String otp) {
        if (!emailEnabled) {
            log.info("=== EMAIL CHANGE OTP for {} : {} ===", to, otp);
            return;
        }
        sendHtml(to, "SquareEdgeSports - Verify Your New Email", buildOtpHtml(name, otp));
    }

    @Async
    public void sendBookingConfirmation(String to, String name, String bookingRef, String details) {
        if (!emailEnabled) {
            log.info("Email disabled - booking confirmation for {}: ref={}", to, bookingRef);
            return;
        }
        sendHtml(to, "SquareEdgeSports - Booking Confirmed #" + bookingRef,
                buildBookingHtml(name, bookingRef, details));
    }

    @Async
    public void sendCourtAssignment(String to, String name, String sportType, String date,
            String startTime, Integer laneNumber, Integer courtNumber, String boxGroup) {
        if (!emailEnabled) {
            log.info("Email disabled - court assignment for {}: lane={} court={}", to, laneNumber, courtNumber);
            return;
        }
        String assignment = laneNumber != null ? "Lane " + laneNumber
                : courtNumber != null ? "Court " + courtNumber
                        : boxGroup != null ? boxGroup.replace("_", " ")
                                : "TBD";
        String html = header("Court Assigned")
                + "<p>Hi " + escape(name) + ",</p>"
                + "<p>Your " + escape(label(sportType)) + " booking has been assigned.</p>"
                + "<p><strong>Date:</strong> " + escape(date) + "<br/>"
                + "<strong>Time:</strong> " + escape(startTime) + "<br/>"
                + "<strong>Assigned:</strong> " + escape(assignment) + "</p>"
                + footer();
        sendHtml(to, "SquareEdgeSports - Court Assigned for " + date, html);
    }

    @Async
    public void sendMembershipActivation(String to, String name, String sportType, String expiresAt) {
        if (!emailEnabled) {
            log.info("Email disabled - membership activation for {}: sport={}", to, sportType);
            return;
        }
        String html = header("Membership Activated")
                + "<p>Hi " + escape(name) + ",</p>"
                + "<p>Your <strong>" + escape(label(sportType)) + "</strong> membership has been activated.</p>"
                + "<p><strong>Valid until:</strong> " + escape(expiresAt) + "</p>"
                + footer();
        sendHtml(to, "SquareEdgeSports - Membership Activated", html);
    }

    @Async
    public void sendRefundConfirmation(String to, String name, String sportType, String date,
            java.math.BigDecimal refundAmount, String refundPolicy) {
        if (!emailEnabled) {
            log.info("Email disabled - refund confirmation for {}: policy={} amount={}", to, refundPolicy,
                    refundAmount);
            return;
        }
        String html = header("Refund Processed")
                + "<p>Hi " + escape(name) + ",</p>"
                + "<p>Your refund for " + escape(label(sportType)) + " on " + escape(date) + " has been processed.</p>"
                + "<p><strong>Refund amount:</strong> " + escape(String.valueOf(refundAmount)) + "<br/>"
                + "<strong>Policy:</strong> " + escape(refundPolicy) + "</p>"
                + footer();
        sendHtml(to, "SquareEdgeSports - Refund Processed", html);
    }

    @Async
    public void sendNoRefundNotification(String to, String name, String sportType, String date, String startTime) {
        if (!emailEnabled) {
            log.info("Email disabled - no-refund notification for {}: sport={} date={}", to, sportType, date);
            return;
        }
        String html = header("Cancellation Notice")
                + "<p>Hi " + escape(name) + ",</p>"
                + "<p>Your " + escape(label(sportType)) + " session on " + escape(date) + " at "
                + escape(startTime) + " is not eligible for a refund based on the cancellation policy.</p>"
                + footer();
        sendHtml(to, "SquareEdgeSports - Cancellation Notice", html);
    }

    @Async
    public void sendContactEmail(String senderName, String senderEmail, String subject, String message) {
        if (!emailEnabled) {
            log.info("Email disabled - contact from {} ({}): {}", senderName, senderEmail, subject);
            return;
        }
        String html = header("New Contact Message")
                + "<p><strong>Name:</strong> " + escape(senderName) + "</p>"
                + "<p><strong>Email:</strong> " + escape(senderEmail) + "</p>"
                + "<p><strong>Subject:</strong> " + escape(subject) + "</p>"
                + "<p>" + escape(message).replace("\n", "<br/>") + "</p>"
                + footer();
        sendHtml(fromEmail, "SquareEdgeSports - Contact: " + safeSubject(subject), html, senderEmail);
    }

    private void sendHtml(String to, String subject, String html) {
        sendHtml(to, subject, html, null);
    }

    private void sendHtml(String to, String subject, String html, String replyTo) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            String replyToJson = replyTo != null && !replyTo.isBlank()
                    ? ",\"replyTo\":{\"email\":\"" + replyTo + "\"}"
                    : "";

            String body = "{"
                    + "\"sender\":{\"email\":\"" + fromEmail + "\"},"
                    + "\"to\":[{\"email\":\"" + to + "\"}],"
                    + "\"subject\":\"" + subject.replace("\"", "\\\"") + "\","
                    + "\"htmlContent\":\""
                    + html.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "") + "\""
                    + replyToJson
                    + "}";

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("api-key", brevoApiKey);
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            restTemplate.postForEntity(url,
                    new org.springframework.http.HttpEntity<>(body, headers), String.class);
            log.info("Email sent to {} - {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {} - {}: {}", to, subject, e.getMessage(), e);
        }
    }

    private String buildOtpHtml(String name, String otp) {
        return header("Email Verification Code")
                + "<p>Hi " + escape(name != null && !name.isBlank() ? name : "User") + ",</p>"
                + "<p>Your SquareEdgeSports verification code is:</p>"
                + "<div style='font-size:28px;font-weight:700;letter-spacing:6px;margin:24px 0;color:#111827;'>"
                + escape(otp) + "</div>"
                + "<p>This code expires in 10 minutes.</p>"
                + footer();
    }

    private String buildPasswordResetHtml(String name, String resetLink) {
        return header("Password Reset")
                + "<p>Hi " + escape(name != null && !name.isBlank() ? name : "User") + ",</p>"
                + "<p>Use the link below to reset your password. It expires in 30 minutes.</p>"
                + "<p><a href='" + escape(resetLink) + "'>Reset password</a></p>"
                + footer();
    }

    private String buildInviteHtml(String name, String role, String setupLink) {
        return header("You're Invited")
                + "<p>Hi " + escape(name != null && !name.isBlank() ? name : "User") + ",</p>"
                + "<p>You have been invited to SquareEdgeSports as " + escape(role) + ".</p>"
                + "<p><a href='" + escape(setupLink) + "'>Set up your account</a></p>"
                + footer();
    }

    private String buildBookingHtml(String name, String ref, String details) {
        return header("Booking Confirmed")
                + "<p>Hi " + escape(name) + ",</p>"
                + "<p>Your booking is confirmed.</p>"
                + "<p><strong>Reference:</strong> " + escape(ref) + "</p>"
                + "<p>" + escape(details).replace("\n", "<br/>") + "</p>"
                + footer();
    }

    private String header(String title) {
        return "<div style='font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;'>"
                + "<h2 style='margin:0 0 16px;color:#111827;'>" + escape(title) + "</h2>";
    }

    private String footer() {
        return "<p style='margin-top:28px;color:#6b7280;font-size:12px;'>SquareEdgeSports</p></div>";
    }

    private String label(String sportType) {
        if (sportType == null) {
            return "session";
        }
        return switch (sportType) {
            case "CRICKET_LANE" -> "Cricket Lane";
            case "BOX_CRICKET" -> "Box Cricket";
            case "PICKLEBALL" -> "Pickleball";
            default -> sportType.replace("_", " ");
        };
    }

    private String safeSubject(String subject) {
        return subject != null && !subject.isBlank() ? subject : "Website Message";
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
