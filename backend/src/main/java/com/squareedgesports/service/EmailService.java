package com.squareedgesports.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service @Slf4j @RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.enabled:true}") private boolean emailEnabled;
    @Value("${app.email.from}")         private String  fromEmail;
    @Value("${app.frontend.url:http://localhost:5173}") private String frontendUrl;

    @Async
    public void sendOtp(String to, String otp, String name) {
        if (!emailEnabled) { log.info("Email disabled – OTP for {}: {}", to, otp); return; }
        sendHtml(to, "SquareEdgeSports – Email Verification Code", buildOtpHtml(name, otp));
    }

    @Async
    public void sendPasswordResetEmail(String to, String name, String token) {
        if (!emailEnabled) { log.info("Password reset token for {}: {}", to, token); return; }
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        sendHtml(to, "SquareEdgeSports – Password Reset Request", buildPasswordResetHtml(name, resetLink));
    }

    @Async
    public void sendAdminInviteEmail(String to, String name, String token, String role) {
        if (!emailEnabled) { log.info("Admin invite token for {}: {}", to, token); return; }
        String setupLink = frontendUrl + "/reset-password?token=" + token + "&invite=true";
        sendHtml(to, "SquareEdgeSports – You've Been Invited", buildInviteHtml(name, role, setupLink));
    }

    @Async
    public void sendBookingConfirmation(String to, String name, String bookingRef, String details) {
        if (!emailEnabled) return;
        sendHtml(to, "SquareEdgeSports – Booking Confirmed #" + bookingRef, buildBookingHtml(name, bookingRef, details));
    }

    @Async
    public void sendCourtAssignment(String to, String name, String sportType, String date,
                                     String startTime, Integer laneNumber, Integer courtNumber, String boxGroup) {
        if (!emailEnabled) { log.info("Court assignment for {}: lane={} court={}", to, laneNumber, courtNumber); return; }
        String sport = switch (sportType != null ? sportType : "") {
            case "CRICKET_LANE" -> "🏏 Cricket Lane";
            case "BOX_CRICKET"  -> "📦 Box Cricket";
            case "PICKLEBALL"   -> "🏓 Pickleball";
            default -> sportType;
        };
        String assignment;
        if (laneNumber != null) assignment = "Lane " + laneNumber + (boxGroup != null ? " (" + boxGroup.replace("_", " ") + ")" : "");
        else if (courtNumber != null) assignment = "Court " + courtNumber;
        else if (boxGroup != null) assignment = boxGroup.replace("_", " ");
        else assignment = "TBD";

        String html = header("Court Assigned ✅") +
            "<h2 style='color:#eeeef8;font-size:20px;margin:0 0 8px;'>Hi " + name + " 👋</h2>" +
            "<p style='color:#9090b0;font-size:14px;line-height:1.6;'>Your " + sport + " booking has been assigned. See details below.</p>" +
            "<div style='background:#1a1a2e;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:24px;margin:20px 0;'>" +
            "<table style='width:100%;font-size:14px;'>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;'>Sport</td><td style='color:#eeeef8;font-weight:700;text-align:right;'>" + sport + "</td></tr>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;'>Date</td><td style='color:#eeeef8;font-weight:700;text-align:right;'>" + date + "</td></tr>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;'>Time</td><td style='color:#eeeef8;font-weight:700;text-align:right;'>" + startTime + "</td></tr>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);padding-top:12px;'>Assigned</td>" +
            "<td style='color:#7c5cfc;font-weight:800;font-size:18px;text-align:right;border-top:1px solid rgba(255,255,255,.07);padding-top:12px;'>" + assignment + "</td></tr>" +
            "</table></div>" +
            "<p style='color:#6b6b8a;font-size:12px;'>Please arrive 5 minutes before your session. Your assignment is also updated on your dashboard.</p>" +
            footer();
        sendHtml(to, "SquareEdgeSports – Court Assigned for " + date, html);
    }

    @Async
    public void sendMembershipActivation(String to, String name, String sportType, String expiresAt) {
        if (!emailEnabled) { log.info("Membership activation for {}: sport={}", to, sportType); return; }
        String sport = switch (sportType != null ? sportType : "") {
            case "CRICKET_LANE" -> "🏏 Cricket Lane";
            case "BOX_CRICKET"  -> "📦 Box Cricket";
            case "PICKLEBALL"   -> "🏓 Pickleball";
            default -> sportType;
        };
        String html = header("Membership Activated 🎉") +
            "<h2 style='color:#eeeef8;font-size:20px;margin:0 0 8px;'>Hi " + name + " 👋</h2>" +
            "<p style='color:#9090b0;font-size:14px;line-height:1.6;'>Your <strong style='color:#eeeef8'>" + sport + "</strong> membership has been activated! Enjoy discounted session rates.</p>" +
            "<div style='background:#1a1a2e;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:24px;margin:20px 0;'>" +
            "<table style='width:100%;font-size:14px;'>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;'>Sport</td><td style='color:#eeeef8;font-weight:700;text-align:right;'>" + sport + "</td></tr>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;'>Status</td><td style='color:#22c55e;font-weight:700;text-align:right;'>ACTIVE ✓</td></tr>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);padding-top:12px;'>Valid Until</td>" +
            "<td style='color:#7c5cfc;font-weight:800;font-size:16px;text-align:right;border-top:1px solid rgba(255,255,255,.07);padding-top:12px;'>" + expiresAt + "</td></tr>" +
            "</table></div>" +
            "<p style='color:#6b6b8a;font-size:12px;'>Your member discount will be applied automatically at checkout. Enjoy your sessions!</p>" +
            footer();
        sendHtml(to, "SquareEdgeSports – " + sport + " Membership Activated!", html);
    }

    @Async
    public void sendRefundConfirmation(String to, String name, String sportType, String date,
                                        java.math.BigDecimal refundAmount, String refundPolicy) {
        if (!emailEnabled) { log.info("Refund confirmation for {}: policy={} amount={}", to, refundPolicy, refundAmount); return; }
        String sport = switch (sportType != null ? sportType : "") {
            case "CRICKET_LANE" -> "🏏 Cricket Lane";
            case "BOX_CRICKET"  -> "📦 Box Cricket";
            case "PICKLEBALL"   -> "🏓 Pickleball";
            default -> sportType;
        };
        String policyLabel = switch (refundPolicy != null ? refundPolicy : "NONE") {
            case "FULL" -> "Full Refund (100%)";
            case "HALF" -> "50% Refund";
            default     -> "No Refund (cancelled < 1 hr before session)";
        };
        String amountStr = refundAmount != null && refundAmount.compareTo(java.math.BigDecimal.ZERO) > 0
            ? "₹" + refundAmount.toPlainString() : "₹0";

        String html = header("Refund Processed") +
            "<h2 style='color:#eeeef8;font-size:20px;margin:0 0 8px;'>Hi " + name + " 👋</h2>" +
            "<p style='color:#9090b0;font-size:14px;line-height:1.6;'>Your refund for the cancelled " + sport +
            " session on <strong style='color:#eeeef8'>" + date + "</strong> has been processed.</p>" +
            "<div style='background:#1a1a2e;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:24px;margin:20px 0;'>" +
            "<table style='width:100%;font-size:14px;'>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;'>Sport</td><td style='color:#eeeef8;font-weight:700;text-align:right;'>" + sport + "</td></tr>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;'>Date</td><td style='color:#eeeef8;font-weight:700;text-align:right;'>" + date + "</td></tr>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;'>Policy</td><td style='color:#eeeef8;font-weight:700;text-align:right;'>" + policyLabel + "</td></tr>" +
            "<tr><td style='color:#6b6b8a;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);padding-top:12px;'>Refund Amount</td>" +
            "<td style='color:#22c55e;font-weight:800;font-size:20px;text-align:right;border-top:1px solid rgba(255,255,255,.07);padding-top:12px;'>" + amountStr + "</td></tr>" +
            "</table></div>" +
            "<p style='color:#6b6b8a;font-size:12px;'>Refunds are typically reflected within 5–7 business days depending on your bank or card provider.</p>" +
            footer();
        sendHtml(to, "SquareEdgeSports – Refund Processed for " + date, html);
    }

    @Async
    public void sendNoRefundNotification(String to, String name, String sportType, String date, String startTime) {
        if (!emailEnabled) { log.info("No-refund notification for {}: sport={} date={}", to, sportType, date); return; }
        String sport = switch (sportType != null ? sportType : "") {
            case "CRICKET_LANE" -> "🏏 Cricket Lane";
            case "BOX_CRICKET"  -> "📦 Box Cricket";
            case "PICKLEBALL"   -> "🏓 Pickleball";
            default -> sportType;
        };
        String html = header("Cancellation Notice – No Refund Applicable") +
            "<h2 style='color:#eeeef8;font-size:20px;margin:0 0 8px;'>Hi " + name + " 👋</h2>" +
            "<p style='color:#9090b0;font-size:14px;line-height:1.6;'>We noticed you cancelled your " + sport +
            " session on <strong style='color:#eeeef8'>" + date + "</strong> at <strong style='color:#eeeef8'>" + startTime + "</strong>.</p>" +
            "<div style='background:#2a0a0a;border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:20px;margin:20px 0;'>" +
            "<p style='color:#fca5a5;font-size:14px;font-weight:700;margin:0 0 8px;'>⛔ No Refund Applicable</p>" +
            "<p style='color:#9090b0;font-size:13px;line-height:1.6;margin:0;'>As per our cancellation policy, bookings cancelled within <strong style='color:#eeeef8'>1 hour</strong> of the session start time are not eligible for a refund.</p>" +
            "</div>" +
            "<div style='background:#1a1a2e;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px;margin:20px 0;'>" +
            "<p style='color:#6b6b8a;font-size:13px;margin:0 0 8px;font-weight:700;'>Our Refund Policy:</p>" +
            "<p style='color:#9090b0;font-size:13px;line-height:1.6;margin:0;'>✅ <strong style='color:#eeeef8'>24+ hours</strong> before session → Full refund<br/>" +
            "⚠️ <strong style='color:#eeeef8'>1–24 hours</strong> before session → 50% refund<br/>" +
            "❌ <strong style='color:#eeeef8'>Less than 1 hour</strong> before session → No refund</p>" +
            "</div>" +
            "<p style='color:#6b6b8a;font-size:12px;'>For any queries, please contact our support team.</p>" +
            footer();
        sendHtml(to, "SquareEdgeSports – Cancellation Notice for " + date, html);
    }

    @Async
    public void sendEmailChangeOtp(String to, String name, String otp) {
        if (!emailEnabled) { log.info("Email change OTP for {}: {}", to, otp); return; }
        sendHtml(to, "SquareEdgeSports – Verify Your New Email", buildEmailChangeOtpHtml(name, otp));
    }

    private void sendHtml(String to, String subject, String html) {
        try {
            var msg    = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(msg, true);
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("Email sent to {} – {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}", to, e);
        }
    }

    // ── HTML Templates ──────────────────────────────────────────────────────

    private String buildOtpHtml(String name, String otp) {
        return header("Email Verification") +
            "<h2 style='color:#eeeef8;font-size:20px;margin:0 0 8px;'>Hi " + name + " 👋</h2>" +
            "<p style='color:#9090b0;font-size:14px;line-height:1.6;'>Use the code below to verify your email address. It expires in <strong style='color:#eeeef8'>10 minutes</strong>.</p>" +
            "<div style='background:#1a1a2e;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:24px;text-align:center;margin:24px 0;'>" +
            "<div style='font-size:36px;font-weight:800;letter-spacing:12px;color:#7c5cfc;'>" + otp + "</div></div>" +
            "<p style='color:#6b6b8a;font-size:12px;'>If you didn't request this, you can safely ignore this email.</p>" +
            footer();
    }

    private String buildPasswordResetHtml(String name, String resetLink) {
        return header("Password Reset") +
            "<h2 style='color:#eeeef8;font-size:20px;margin:0 0 8px;'>Hi " + name + ",</h2>" +
            "<p style='color:#9090b0;font-size:14px;line-height:1.6;'>We received a request to reset your password. Click the button below — this link expires in <strong style='color:#eeeef8'>30 minutes</strong>.</p>" +
            "<div style='text-align:center;margin:28px 0;'>" +
            "<a href='" + resetLink + "' style='background:linear-gradient(135deg,#7c5cfc,#4f8ef7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;'>Reset Password →</a></div>" +
            "<p style='color:#6b6b8a;font-size:12px;'>If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>" +
            footer();
    }

    private String buildInviteHtml(String name, String role, String setupLink) {
        return header("You're Invited!") +
            "<h2 style='color:#eeeef8;font-size:20px;margin:0 0 8px;'>Hi " + name + " 👋</h2>" +
            "<p style='color:#9090b0;font-size:14px;line-height:1.6;'>You've been invited to join <strong style='color:#eeeef8'>SquareEdgeSports</strong> as <strong style='color:#7c5cfc;'>" + role + "</strong>. Click below to set up your password and access your account.</p>" +
            "<div style='text-align:center;margin:28px 0;'>" +
            "<a href='" + setupLink + "' style='background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;'>Set Up My Account →</a></div>" +
            "<p style='color:#6b6b8a;font-size:12px;'>This invitation link expires in 24 hours.</p>" +
            footer();
    }

    private String buildEmailChangeOtpHtml(String name, String otp) {
        return header("Verify New Email") +
            "<h2 style='color:#eeeef8;font-size:20px;margin:0 0 8px;'>Hi " + name + ",</h2>" +
            "<p style='color:#9090b0;font-size:14px;line-height:1.6;'>Enter the code below to confirm your new email address. It expires in <strong style='color:#eeeef8'>10 minutes</strong>.</p>" +
            "<div style='background:#1a1a2e;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:24px;text-align:center;margin:24px 0;'>" +
            "<div style='font-size:36px;font-weight:800;letter-spacing:12px;color:#7c5cfc;'>" + otp + "</div></div>" +
            "<p style='color:#6b6b8a;font-size:12px;'>If you didn't request this change, please secure your account immediately.</p>" +
            footer();
    }

    private String buildBookingHtml(String name, String ref, String details) {
        return header("Booking Confirmed ✅") +
            "<h2 style='color:#eeeef8;font-size:18px;'>Hi " + name + ",</h2>" +
            "<p style='color:#9090b0;'>Your booking <strong style='color:#eeeef8'>#" + ref + "</strong> has been confirmed.</p>" +
            "<div style='background:#1a1a2e;border-radius:10px;padding:16px;margin:16px 0;color:#9090b0;font-size:13px;'>" + details + "</div>" +
            footer();
    }

    private String header(String title) {
        return "<div style=\"font-family:'DM Sans',sans-serif;max-width:520px;margin:auto;background:#0f0f1a;border-radius:16px;overflow:hidden;\">" +
            "<div style='background:linear-gradient(135deg,#7c5cfc,#4f8ef7);padding:28px 32px;'>" +
            "<h1 style='color:#fff;font-size:22px;margin:0;'>⚡ SquareEdgeSports</h1>" +
            "<p style='color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px;'>" + title + "</p></div>" +
            "<div style='padding:32px;'>";
    }

    private String footer() {
        return "<hr style='border:none;border-top:1px solid rgba(255,255,255,.07);margin:24px 0;'/>" +
            "<p style='color:#4a4a6a;font-size:11px;text-align:center;'>© SquareEdgeSports · Indoor Sports Booking Platform</p>" +
            "</div></div>";
    }
}
