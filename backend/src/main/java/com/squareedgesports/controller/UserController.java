package com.squareedgesports.controller;

import com.cloudinary.Cloudinary;
import com.squareedgesports.dto.*;
import com.squareedgesports.entity.*;
import com.squareedgesports.repository.*;
import com.squareedgesports.service.AuthService;
import com.squareedgesports.service.EmailService;
import com.squareedgesports.service.RazorpayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.transaction.annotation.Transactional;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepo;
    private final OtpRepository otpRepo;
    private final FeedbackRepository feedbackRepo;
    private final PaymentRepository paymentRepo;
    private final PricingRuleRepository pricingRepo;
    private final AuthService authService;
    private final EmailService emailService;
    private final RazorpayService razorpayService;
    private final EmployeePermissionRepository permRepo;
    private final Cloudinary cloudinary;

    @GetMapping("/profile")
    public ResponseEntity<UserDto> profile(Authentication auth) {
        return ResponseEntity.ok(authService.me(auth.getName()));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body, Authentication auth) {
        User u = userRepo.findByEmail(auth.getName()).orElseThrow();
        if (body.containsKey("fullName") && body.get("fullName") != null)
            u.setFullName(body.get("fullName"));
        if (body.containsKey("phone"))
            u.setPhone(body.get("phone"));
        if (body.containsKey("addressLine1"))
            u.setAddressLine1(body.get("addressLine1"));
        if (body.containsKey("addressLine2"))
            u.setAddressLine2(body.get("addressLine2"));
        if (body.containsKey("city"))
            u.setCity(body.get("city"));
        if (body.containsKey("state"))
            u.setState(body.get("state"));
        if (body.containsKey("country"))
            u.setCountry(body.get("country"));
        if (body.containsKey("zipCode"))
            u.setZipCode(body.get("zipCode"));
        if (body.containsKey("profilePicture"))
            u.setProfilePicture(
                    body.get("profilePicture") != null && !body.get("profilePicture").isBlank()
                            ? body.get("profilePicture")
                            : null);
        userRepo.save(u);
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", authService.mapUser(u)));
    }

    // @PostMapping("/profile/picture")
    // public ResponseEntity<?> uploadPicture(@RequestParam("file") MultipartFile
    // file, Authentication auth) {
    // if (file.isEmpty()) return
    // ResponseEntity.badRequest().body(ApiResponse.error("No file provided."));
    // String ct = file.getContentType();
    // if (ct == null || !ct.startsWith("image/"))
    // return ResponseEntity.badRequest().body(ApiResponse.error("Only image files
    // are allowed."));
    // if (file.getSize() > 5 * 1024 * 1024)
    // return ResponseEntity.badRequest().body(ApiResponse.error("File size must be
    // under 5MB."));
    // User u = userRepo.findByEmail(auth.getName()).orElseThrow();
    // try {
    // // Use absolute path so files are always found regardless of working
    // directory
    // java.nio.file.Path uploadDir =
    // java.nio.file.Paths.get("uploads/avatars").toAbsolutePath();
    // Files.createDirectories(uploadDir);
    // String ext =
    // Objects.requireNonNull(file.getOriginalFilename()).replaceAll(".*\\.", "");
    // String filename = "avatar_" + u.getId() + "_" + System.currentTimeMillis() +
    // "." + ext;
    // Files.copy(file.getInputStream(), uploadDir.resolve(filename),
    // StandardCopyOption.REPLACE_EXISTING);
    // u.setProfilePicture("/uploads/avatars/" + filename);
    // userRepo.save(u);
    // return ResponseEntity.ok(ApiResponse.ok("Picture uploaded", Map.of("url",
    // u.getProfilePicture())));
    // } catch (IOException e) {
    // return ResponseEntity.badRequest().body(ApiResponse.error("Upload failed: " +
    // e.getMessage()));
    // }
    // }

    @PostMapping("/profile/picture")
    public ResponseEntity<?> uploadPicture(@RequestParam("file") MultipartFile file, Authentication auth) {
        try {
            User u = userRepo.findByEmail(auth.getName()).orElseThrow();

            // Delete old image from Cloudinary if exists
            if (u.getProfilePicture() != null && u.getProfilePicture().contains("cloudinary")) {
                String publicId = "avatars/" + u.getEmail().replaceAll("[^a-zA-Z0-9]", "_");
                cloudinary.uploader().destroy(publicId, Map.of());
            }

            // Upload new image
            Map uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    Map.of(
                            "folder", "avatars",
                            "public_id", u.getEmail().replaceAll("[^a-zA-Z0-9]", "_"),
                            "overwrite", true,
                            "resource_type", "image"
                    // "transformation", Map.of("width", 300, "height", 300, "crop", "fill",
                    // "gravity", "face")
                    ));

            String url = (String) uploadResult.get("secure_url");
            u.setProfilePicture(url);
            userRepo.save(u);
            return ResponseEntity.ok(ApiResponse.ok("Picture uploaded", Map.of("url", url)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Upload failed: " + e.getMessage()));
        }
    }

    @DeleteMapping("/profile/picture")
    public ResponseEntity<?> removePhoto(Authentication auth) {
        User u = userRepo.findByEmail(auth.getName()).orElseThrow();
        u.setProfilePicture(null);
        userRepo.save(u);
        return ResponseEntity.ok(ApiResponse.ok("Profile photo removed", authService.mapUser(u)));
    }

    // ── Email change: step 1 – send OTP to new email ─────────────────────────
    @PostMapping("/profile/change-email/send")
    public ResponseEntity<?> sendEmailChangeOtp(@RequestBody Map<String, String> body, Authentication auth) {
        String newEmail = body.get("newEmail");
        if (newEmail == null || newEmail.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("New email is required."));
        if (userRepo.existsByEmail(newEmail))
            return ResponseEntity.badRequest().body(ApiResponse.error("This email is already in use."));
        User u = userRepo.findByEmail(auth.getName()).orElseThrow();
        otpRepo.deleteByEmail(newEmail);
        String code = String.format("%06d", new Random().nextInt(1_000_000));
        otpRepo.save(OtpVerification.builder()
                .email(newEmail).otp(code)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false).build());
        emailService.sendEmailChangeOtp(newEmail, u.getFullName(), code);
        return ResponseEntity.ok(ApiResponse.ok("Verification code sent to " + newEmail));
    }

    // ── Email change: step 2 – verify OTP and update email ───────────────────
    @Transactional
    @PostMapping("/profile/change-email/verify")
    public ResponseEntity<?> verifyEmailChange(@RequestBody Map<String, String> body, Authentication auth) {
        String newEmail = body.get("newEmail");
        String code = body.get("otp");
        if (userRepo.existsByEmail(newEmail))
            return ResponseEntity.badRequest().body(ApiResponse.error("This email is already in use."));
        var otp = otpRepo.findTopByEmailOrderByCreatedAtDesc(newEmail).orElse(null);
        if (otp == null || !otp.getOtp().equals(code))
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid verification code."));
        if (otp.isExpired())
            return ResponseEntity.badRequest().body(ApiResponse.error("Code expired. Please request a new one."));
        User u = userRepo.findByEmail(auth.getName()).orElseThrow();
        u.setEmail(newEmail);
        userRepo.save(u);
        otp.setUsed(true);
        otpRepo.save(otp);
        otpRepo.deleteByEmail(newEmail);
        return ResponseEntity.ok(ApiResponse.ok("Email updated successfully. Please log in again."));
    }

    @PostMapping("/feedback")
    public ResponseEntity<?> submitFeedback(@Valid @RequestBody FeedbackRequest req, Authentication auth) {
        User u = userRepo.findByEmail(auth.getName()).orElseThrow();
        Feedback f = Feedback.builder()
                .user(u).rating(req.getRating())
                .category(req.getCategory()).comment(req.getComment())
                .build();
        feedbackRepo.save(f);
        return ResponseEntity.ok(ApiResponse.ok("Feedback submitted. Thank you!"));
    }

    @GetMapping("/feedback")
    public ResponseEntity<?> myFeedback(Authentication auth) {
        User u = userRepo.findByEmail(auth.getName()).orElseThrow();
        return ResponseEntity.ok(feedbackRepo.findByUserIdOrderByCreatedAtDesc(u.getId()).stream()
                .map(f -> Map.of("id", f.getId(), "rating", f.getRating(),
                        "category", f.getCategory() != null ? f.getCategory() : "",
                        "comment", f.getComment(), "createdAt", f.getCreatedAt()))
                .collect(Collectors.toList()));
    }

    // ── Get own permissions (EMPLOYEE can call this) ──────────────────────────
    @GetMapping("/my-permissions")
    public ResponseEntity<?> myPermissions(Authentication auth) {
        User u = userRepo.findByEmail(auth.getName()).orElseThrow();
        var perm = permRepo.findByUserId(u.getId()).orElse(null);
        PermissionsDto dto = new PermissionsDto();
        if (perm != null) {
            dto.setCanManageBookings(perm.isCanManageBookings());
            dto.setCanManagePayments(perm.isCanManagePayments());
            dto.setCanManageCourts(perm.isCanManageCourts());
            dto.setCanViewReports(perm.isCanViewReports());
            dto.setCanManageUsers(perm.isCanManageUsers());
        }
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/payments")
    public ResponseEntity<?> myPayments(Authentication auth) {
        User u = userRepo.findByEmail(auth.getName()).orElseThrow();
        return ResponseEntity.ok(paymentRepo.findByUserIdOrderByCreatedAtDesc(u.getId()).stream().map(p -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("amount", p.getAmount());
            m.put("refundAmount", p.getRefundAmount());
            m.put("status", p.getStatus());
            m.put("method", p.getPaymentMethod() != null ? p.getPaymentMethod() : "");
            m.put("reference", p.getPaymentReference() != null ? p.getPaymentReference() : "");
            m.put("description", p.getDescription() != null ? p.getDescription() : "");
            m.put("paidAt", p.getPaidAt() != null ? p.getPaidAt().toString() : "");
            m.put("createdAt", p.getCreatedAt());
            return m;
        }).collect(Collectors.toList()));
    }

    // ── Membership: Step 1 – create Razorpay order ───────────────────────────
    @PostMapping("/membership/order")
    public ResponseEntity<?> membershipOrder(@RequestBody Map<String, String> body, Authentication auth) {
        String sportType = body.get("sportType");
        if (sportType == null || sportType.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("sportType is required"));
        String ruleKey = sportType + "_MEMBERSHIP";
        BigDecimal fee = pricingRepo.findByRuleKey(ruleKey)
                .map(r -> r.getPrice())
                .orElse(BigDecimal.valueOf(1500));
        String receipt = "MEMBERSHIP-" + sportType + "-" + System.currentTimeMillis();
        Map<String, Object> order = razorpayService.createOrder(fee, receipt);
        return ResponseEntity.ok(order);
    }

    // ── Membership: Step 2 – confirm payment and activate membership ─────────
    @PostMapping("/membership/confirm")
    public ResponseEntity<?> membershipConfirm(@RequestBody Map<String, String> body, Authentication auth) {
        String sportType = body.get("sportType");
        String orderId = body.get("razorpayOrderId");
        String paymentId = body.get("razorpayPaymentId");
        String signature = body.get("razorpaySignature");

        if (!razorpayService.verifySignature(orderId, paymentId, signature))
            return ResponseEntity.badRequest().body(ApiResponse.error("Payment verification failed"));

        User u = userRepo.findByEmail(auth.getName()).orElseThrow();

        // Activate the correct membership flag
        switch (sportType != null ? sportType : "") {
            case "CRICKET_LANE" -> u.setCricketLaneMember(true);
            case "BOX_CRICKET" -> u.setBoxCricketMember(true);
            case "PICKLEBALL" -> u.setPickleballMember(true);
            default -> {
                return ResponseEntity.badRequest().body(ApiResponse.error("Unknown sportType"));
            }
        }

        // Set/extend expiry to 30 days from now
        LocalDateTime newExpiry = LocalDateTime.now().plusDays(30);
        if (u.getMembershipExpiry() == null || u.getMembershipExpiry().isBefore(LocalDateTime.now())) {
            u.setMembershipExpiry(newExpiry);
        } else {
            u.setMembershipExpiry(u.getMembershipExpiry().plusDays(30));
        }
        userRepo.save(u);

        // Record payment
        String ruleKey = sportType + "_MEMBERSHIP";
        BigDecimal fee = pricingRepo.findByRuleKey(ruleKey)
                .map(r -> r.getPrice()).orElse(BigDecimal.valueOf(1500));
        paymentRepo.save(Payment.builder()
                .user(u).amount(fee)
                .paymentMethod("RAZORPAY")
                .paymentReference(orderId)
                .gatewayPaymentId(paymentId)
                .status(Payment.PaymentStatus.PAID)
                .description(sportType + " Membership – 30 days")
                .paidAt(LocalDateTime.now())
                .build());

        return ResponseEntity.ok(ApiResponse.ok("Membership activated!",
                Map.of("sportType", sportType, "expiresAt", u.getMembershipExpiry().toString())));
    }
}
