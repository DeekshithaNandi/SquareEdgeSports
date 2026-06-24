package com.squareedgesports.controller;

import com.squareedgesports.dto.*;
import com.squareedgesports.entity.*;
import com.squareedgesports.repository.*;
import com.squareedgesports.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','EMPLOYEE')") // base: any staff can hit this controller
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepo;
    private final CourtRepository courtRepo;
    private final PricingRuleRepository pricingRepo;
    private final FeedbackRepository feedbackRepo;
    private final PaymentRepository paymentRepo;
    private final CmsContentRepository cmsRepo;
    private final EmployeePermissionRepository permRepo;
    private final PasswordResetTokenRepository resetTokenRepo;
    private final OtpRepository otpRepo;
    private final BookingRepository bookingRepo;
    private final AuthService authService;
    private final EmailService emailService;
    private final PasswordEncoder encoder;

    // ── Users ─────────────────────────────────────────────────────────────────
    // READ: employee with canManageUsers OR admin
    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageUsers(authentication)")
    public ResponseEntity<?> getUsers() {
        return ResponseEntity.ok(userRepo.findAll().stream()
                .map(authService::mapUser).collect(Collectors.toList()));
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageUsers(authentication)")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return userRepo.findById(id)
                .map(u -> ResponseEntity.ok(authService.mapUser(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    // WRITE: admin only
    @PutMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User u = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        if (body.containsKey("fullName"))
            u.setFullName((String) body.get("fullName"));
        if (body.containsKey("phone"))
            u.setPhone((String) body.get("phone"));
        if (body.containsKey("addressLine1"))
            u.setAddressLine1((String) body.get("addressLine1"));
        if (body.containsKey("addressLine2"))
            u.setAddressLine2((String) body.get("addressLine2"));
        if (body.containsKey("city"))
            u.setCity((String) body.get("city"));
        if (body.containsKey("state"))
            u.setState((String) body.get("state"));
        if (body.containsKey("country"))
            u.setCountry((String) body.get("country"));
        if (body.containsKey("zipCode"))
            u.setZipCode((String) body.get("zipCode"));
        if (body.get("active") instanceof Boolean b)
            u.setActive(b);
        if (body.containsKey("role")) {
            User.Role newRole = User.Role.valueOf((String) body.get("role"));
            User.Role oldRole = u.getRole();
            u.setRole(newRole);
            // When a user is promoted to EMPLOYEE, ensure a permissions record exists
            if (newRole == User.Role.EMPLOYEE && oldRole != User.Role.EMPLOYEE) {
                if (permRepo.findByUserId(u.getId()).isEmpty()) {
                    permRepo.save(EmployeePermission.builder().user(u).build());
                }
            }
        }
        if (body.containsKey("password") && body.get("password") != null
                && !body.get("password").toString().isBlank())
            u.setPassword(encoder.encode((String) body.get("password")));
        userRepo.save(u);
        return ResponseEntity.ok(ApiResponse.ok("User updated", authService.mapUser(u)));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        String email = user.getEmail();
        // Remove related records in FK order before deleting user
        otpRepo.deleteByEmail(email);
        resetTokenRepo.deleteByEmail(email);
        permRepo.findByUserId(id).ifPresent(permRepo::delete);
        feedbackRepo.findByUserIdOrderByCreatedAtDesc(id).forEach(feedbackRepo::delete);
        paymentRepo.findByUserIdOrderByCreatedAtDesc(id).forEach(paymentRepo::delete);
        bookingRepo.findByUserId(id).forEach(bookingRepo::delete);
        userRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("User deleted"));
    }

    @PostMapping("/users/invite")
    // @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageUsers(authentication) or @permCheck.canManageBookings(authentication)")
    public ResponseEntity<?> inviteUser(@RequestBody AdminCreateUserRequest req) {
        if (userRepo.existsByEmail(req.getEmail()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Email already exists."));
        User.Role role;
        try {
            role = User.Role.valueOf(req.getRole());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid role."));
        }

        User user = userRepo.save(User.builder()
                .fullName(req.getFullName()).email(req.getEmail())
                .password(encoder.encode(UUID.randomUUID().toString()))
                .phone(req.getPhone()).role(role)
                .emailVerified(false).active(true).build());

        if (role == User.Role.EMPLOYEE) {
            permRepo.save(EmployeePermission.builder().user(user).build());
        }

        resetTokenRepo.deleteByEmail(req.getEmail());
        String token = UUID.randomUUID().toString();
        resetTokenRepo.save(PasswordResetToken.builder()
                .token(token).email(req.getEmail())
                .expiresAt(LocalDateTime.now().plusHours(24))
                .used(false).build());
        emailService.sendAdminInviteEmail(req.getEmail(), req.getFullName(), token, role.name().replace("_", " "));

        return ResponseEntity.ok(ApiResponse.ok("Invitation sent to " + req.getEmail(), authService.mapUser(user)));
    }

    // ── Employee permissions ──────────────────────────────────────────────────
    @GetMapping("/users/{id}/permissions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> getPermissions(@PathVariable Long id) {
        var perm = permRepo.findByUserId(id).orElse(EmployeePermission.builder().build());
        return ResponseEntity.ok(toDto(perm));
    }

    @PutMapping("/users/{id}/permissions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> updatePermissions(@PathVariable Long id, @RequestBody PermissionsDto req) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        EmployeePermission perm = permRepo.findByUserId(id)
                .orElse(EmployeePermission.builder().user(user).build());
        perm.setCanManageBookings(req.isCanManageBookings());
        perm.setCanManagePayments(req.isCanManagePayments());
        perm.setCanManageCourts(req.isCanManageCourts());
        perm.setCanViewReports(req.isCanViewReports());
        perm.setCanManageUsers(req.isCanManageUsers());
        permRepo.save(perm);
        return ResponseEntity.ok(ApiResponse.ok("Permissions updated", toDto(perm)));
    }

    @PatchMapping("/users/{id}/membership")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> updateMembership(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User u = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));

        // Track which sports were newly activated
        java.util.List<String> newlyActivated = new java.util.ArrayList<>();
        if (body.containsKey("cricketLaneMember")) {
            boolean val = Boolean.TRUE.equals(body.get("cricketLaneMember"));
            if (val && !u.isCricketLaneMember())
                newlyActivated.add("CRICKET_LANE");
            u.setCricketLaneMember(val);
        }
        if (body.containsKey("boxCricketMember")) {
            boolean val = Boolean.TRUE.equals(body.get("boxCricketMember"));
            if (val && !u.isBoxCricketMember())
                newlyActivated.add("BOX_CRICKET");
            u.setBoxCricketMember(val);
        }
        if (body.containsKey("pickleballMember")) {
            boolean val = Boolean.TRUE.equals(body.get("pickleballMember"));
            if (val && !u.isPickleballMember())
                newlyActivated.add("PICKLEBALL");
            u.setPickleballMember(val);
        }
        // Set/extend expiry if anything newly activated
        if (!newlyActivated.isEmpty()) {
            LocalDateTime newExpiry = LocalDateTime.now().plusDays(30);
            u.setMembershipExpiry(
                    u.getMembershipExpiry() != null && u.getMembershipExpiry().isAfter(LocalDateTime.now())
                            ? u.getMembershipExpiry().plusDays(30)
                            : newExpiry);
        }
        userRepo.save(u);

        // Send activation email for each newly activated sport
        String expiresAt = u.getMembershipExpiry() != null
                ? u.getMembershipExpiry().toLocalDate().toString()
                : "30 days";
        for (String sport : newlyActivated) {
            emailService.sendMembershipActivation(u.getEmail(), u.getFullName(), sport, expiresAt);
        }

        return ResponseEntity.ok(ApiResponse.ok("Membership updated", authService.mapUser(u)));
    }

    // ── Courts ────────────────────────────────────────────────────────────────
    // READ: employee with canManageCourts OR admin
    @GetMapping("/courts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageCourts(authentication)")
    public ResponseEntity<?> getCourts() {
        return ResponseEntity.ok(courtRepo.findAll());
    }

    // WRITE: admin only
    @PostMapping("/courts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> createCourt(@RequestBody Court court) {
        return ResponseEntity.ok(courtRepo.save(court));
    }

    @PutMapping("/courts/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> updateCourt(@PathVariable Long id, @RequestBody Court body) {
        Court c = courtRepo.findById(id).orElseThrow(() -> new RuntimeException("Court not found"));
        c.setName(body.getName());
        c.setType(body.getType());
        c.setLocation(body.getLocation());
        c.setDescription(body.getDescription());
        c.setPricePerSlot(body.getPricePerSlot());
        c.setMemberPricePerSlot(body.getMemberPricePerSlot());
        c.setCapacity(body.getCapacity());
        c.setStatus(body.getStatus());
        return ResponseEntity.ok(courtRepo.save(c));
    }

    @DeleteMapping("/courts/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> deleteCourt(@PathVariable Long id) {
        courtRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Court deleted"));
    }

    // ── Pricing ───────────────────────────────────────────────────────────────
    @GetMapping("/pricing")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> getPricing() {
        return ResponseEntity.ok(pricingRepo.findAll());
    }

    @PutMapping("/pricing/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> updatePrice(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        PricingRule rule = pricingRepo.findById(id).orElseThrow(() -> new RuntimeException("Rule not found"));
        if (body.containsKey("price")) {
            Object pv = body.get("price");
            if (pv == null)
                return ResponseEntity.badRequest().body(ApiResponse.error("price must not be null"));
            try {
                rule.setPrice(new BigDecimal(pv.toString()));
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Invalid price format"));
            }
        }
        if (body.containsKey("description"))
            rule.setDescription((String) body.get("description"));
        return ResponseEntity.ok(pricingRepo.save(rule));
    }

    // ── Feedback ──────────────────────────────────────────────────────────────
    @GetMapping("/feedback")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> getFeedback() {
        return ResponseEntity.ok(feedbackRepo.findAllWithUser().stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.getId());
            m.put("rating", f.getRating());
            m.put("category", f.getCategory());
            m.put("comment", f.getComment());
            m.put("userName", f.getUser().getFullName());
            m.put("userEmail", f.getUser().getEmail());
            m.put("reviewed", f.isReviewed());
            m.put("createdAt", f.getCreatedAt());
            return m;
        }).collect(Collectors.toList()));
    }

    @PatchMapping("/feedback/{id}/reviewed")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> markReviewed(@PathVariable Long id) {
        feedbackRepo.findById(id).ifPresent(f -> {
            f.setReviewed(true);
            feedbackRepo.save(f);
        });
        return ResponseEntity.ok(ApiResponse.ok("Marked as reviewed"));
    }

    // ── Payments ──────────────────────────────────────────────────────────────
    // READ: employee with canManagePayments OR admin
    @GetMapping("/payments")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManagePayments(authentication)")
    public ResponseEntity<?> getPayments() {
        return ResponseEntity.ok(paymentRepo.findAllWithUser().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("userName", p.getUser().getFullName());
            m.put("userEmail", p.getUser().getEmail());
            m.put("amount", p.getAmount());
            m.put("status", p.getStatus());
            m.put("method", p.getPaymentMethod());
            m.put("reference", p.getPaymentReference());
            m.put("description", p.getDescription());
            m.put("paidAt", p.getPaidAt());
            m.put("createdAt", p.getCreatedAt());
            m.put("refundAmount", p.getRefundAmount());
            m.put("refundedAt", p.getRefundedAt());
            // expose booking date so UI can filter payments by the session date
            if (p.getBooking() != null) {
                m.put("bookingDate", p.getBooking().getBookingDate());
                m.put("bookingStart", p.getBooking().getStartTime());
                m.put("bookingType", p.getBooking().getBookingType());
            }
            return m;
        }).collect(Collectors.toList()));
    }

    @PatchMapping("/payments/{id}/refund")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> refundPayment(@PathVariable Long id) {
        paymentRepo.findById(id).ifPresent(p -> {
            p.setStatus(Payment.PaymentStatus.REFUNDED);
            p.setRefundedAt(LocalDateTime.now());
            paymentRepo.save(p);
        });
        return ResponseEntity.ok(ApiResponse.ok("Payment marked as refunded"));
    }

    // ── CMS ───────────────────────────────────────────────────────────────────
    @GetMapping("/cms")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> getCms() {
        return ResponseEntity.ok(cmsRepo.findAll());
    }

    @PostMapping("/cms")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> createCms(@RequestBody CmsContent content) {
        return ResponseEntity.ok(cmsRepo.save(content));
    }

    @PutMapping("/cms/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> updateCms(@PathVariable Long id, @RequestBody CmsContent body) {
        CmsContent c = cmsRepo.findById(id).orElseThrow(() -> new RuntimeException("Content not found"));
        c.setTitle(body.getTitle());
        c.setBody(body.getBody());
        c.setImageUrl(body.getImageUrl());
        c.setContentType(body.getContentType());
        c.setActive(body.isActive());
        c.setSortOrder(body.getSortOrder());
        c.setDiscountPercent(body.getDiscountPercent() != null ? body.getDiscountPercent() : 0);
        c.setDayRestriction(body.getDayRestriction() != null ? body.getDayRestriction() : "ALL_DAYS");
        c.setDiscountTimeFrom(body.getDiscountTimeFrom());
        c.setDiscountTimeTo(body.getDiscountTimeTo());
        return ResponseEntity.ok(cmsRepo.save(c));
    }

    @DeleteMapping("/cms/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    public ResponseEntity<?> deleteCms(@PathVariable Long id) {
        cmsRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Content deleted"));
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','EMPLOYEE')")
    public ResponseEntity<?> stats() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalUsers", userRepo.count());
        m.put("totalCourts", courtRepo.count());
        m.put("activeCourts", courtRepo.findByStatus(Court.CourtStatus.ACTIVE).size());
        m.put("avgRating", feedbackRepo.averageRating());
        m.put("totalEmployees", userRepo.findAll().stream().filter(u -> u.getRole() == User.Role.EMPLOYEE).count());
        m.put("totalAdmins", userRepo.findAll().stream()
                .filter(u -> u.getRole() == User.Role.SUPER_ADMIN || u.getRole() == User.Role.ADMINISTRATOR).count());
        return ResponseEntity.ok(m);
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private PermissionsDto toDto(EmployeePermission p) {
        PermissionsDto d = new PermissionsDto();
        d.setCanManageBookings(p.isCanManageBookings());
        d.setCanManagePayments(p.isCanManagePayments());
        d.setCanManageCourts(p.isCanManageCourts());
        d.setCanViewReports(p.isCanViewReports());
        d.setCanManageUsers(p.isCanManageUsers());
        return d;
    }
}
