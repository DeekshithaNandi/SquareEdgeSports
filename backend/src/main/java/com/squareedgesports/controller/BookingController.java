package com.squareedgesports.controller;

import com.squareedgesports.dto.*;
import com.squareedgesports.entity.User;
import com.squareedgesports.repository.UserRepository;
import com.squareedgesports.service.BookingService;
import com.squareedgesports.service.RazorpayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final RazorpayService razorpayService;
    private final UserRepository userRepo;

    /* ── Player endpoints ── */
    @PostMapping("/bookings")
    public ResponseEntity<?> create(@Valid @RequestBody CreateBookingRequest req, Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(bookingService.create(user.getId(), req));
    }

    @PostMapping("/bookings/{id}/razorpay-order")
    public ResponseEntity<?> createRazorpayOrder(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.createRazorpayOrder(id));
    }

    @PostMapping("/bookings/{id}/confirm-payment")
    public ResponseEntity<?> confirmPayment(@PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String orderId = body.get("razorpayOrderId");
        String paymentId = body.get("razorpayPaymentId");
        String signature = body.get("razorpaySignature");
        if (!razorpayService.verifySignature(orderId, paymentId, signature)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Payment verification failed. Please contact support."));
        }
        return ResponseEntity.ok(bookingService.confirmPayment(id, paymentId, "RAZORPAY"));
    }

    /* ── Batch: one payment for multiple bookings ── */
    @PostMapping("/bookings/razorpay-order-batch")
    public ResponseEntity<?> createBatchOrder(@RequestBody Map<String, Object> body) {
        List<Long> ids = extractBookingIds(body);
        if (ids == null || ids.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "bookingIds is required and must not be empty"));
        return ResponseEntity.ok(bookingService.createBatchRazorpayOrder(ids));
    }

    @PostMapping("/bookings/confirm-payment-batch")
    public ResponseEntity<?> confirmBatchPayment(@RequestBody Map<String, Object> body) {
        String orderId = (String) body.get("razorpayOrderId");
        String paymentId = (String) body.get("razorpayPaymentId");
        String signature = (String) body.get("razorpaySignature");
        if (!razorpayService.verifySignature(orderId, paymentId, signature)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Payment verification failed. Please contact support."));
        }
        List<Long> ids = extractBookingIds(body);
        if (ids == null || ids.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "bookingIds is required and must not be empty"));
        return ResponseEntity.ok(bookingService.confirmBatchPayment(ids, paymentId, "RAZORPAY"));
    }

    @PostMapping("/admin/bookings")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageBookings(authentication)")
    public ResponseEntity<?> createForCustomer(@Valid @RequestBody AdminCreateBookingRequest req) {
        BookingDto dto = bookingService.create(req.getUserId(), req);

        // Error: markAwaitingPayment method does not exist in BookingService
        // Solution: Either implement the markAwaitingPayment method in BookingService
        // or remove this call
        dto = req.isMarkAsPaid()
                ? bookingService.confirmPayment(dto.getId(), "DESK-" + dto.getId(), "CASH")
                : dto;

        return ResponseEntity.ok(dto);
    }

    /** Safely converts a JSON array of numbers (Integer or Long) to List<Long>. */
    @SuppressWarnings("unchecked")
    private List<Long> extractBookingIds(Map<String, Object> body) {
        Object raw = body.get("bookingIds");
        if (!(raw instanceof List))
            return null;
        return ((List<?>) raw).stream()
                .filter(v -> v instanceof Number)
                .map(v -> ((Number) v).longValue())
                .collect(Collectors.toList());
    }

    @PatchMapping("/bookings/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body, Authentication auth) {
        User user = getUser(auth);
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(bookingService.cancel(id, user.getId(), reason));
    }

    @GetMapping("/bookings/my")
    public ResponseEntity<?> myBookings(Authentication auth) {
        return ResponseEntity.ok(bookingService.getByUser(getUser(auth).getId()));
    }

    @GetMapping("/bookings/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return bookingService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /* ── Admin/Employee endpoints ── */
    @GetMapping("/admin/bookings")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageBookings(authentication)")
    public ResponseEntity<?> all() {
        return ResponseEntity.ok(bookingService.getAll());
    }

    @GetMapping("/admin/bookings/date")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageBookings(authentication)")
    public ResponseEntity<?> byDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(bookingService.getByDate(date));
    }

    @GetMapping("/admin/bookings/cancelled")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageBookings(authentication)")
    public ResponseEntity<?> cancelled() {
        return ResponseEntity.ok(bookingService.getCancelled());
    }

    @PatchMapping("/admin/bookings/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageBookings(authentication)")
    public ResponseEntity<?> adminCancel(@PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : "Cancelled by admin";
        return ResponseEntity.ok(bookingService.cancel(id, null, reason));
    }

    @PatchMapping("/admin/bookings/{id}/refund")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageBookings(authentication)")
    public ResponseEntity<?> refundByBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.refundByBookingId(id));
    }

    @PostMapping("/admin/bookings/{id}/notify-no-refund")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageBookings(authentication)")
    public ResponseEntity<?> notifyNoRefund(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.sendNoRefundNotification(id));
    }

    @PatchMapping("/admin/bookings/{id}/assign")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canManageBookings(authentication)")
    public ResponseEntity<?> assignCourt(@PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Integer laneNumber = body.get("laneNumber") != null ? Integer.parseInt(body.get("laneNumber").toString())
                : null;
        Integer courtNumber = body.get("courtNumber") != null ? Integer.parseInt(body.get("courtNumber").toString())
                : null;
        String boxGroup = body.get("boxGroup") != null ? body.get("boxGroup").toString() : null;
        return ResponseEntity.ok(bookingService.assignCourt(id, laneNumber, courtNumber, boxGroup));
    }

    @GetMapping("/admin/revenue")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR') or @permCheck.canViewReports(authentication)")
    public ResponseEntity<?> revenue() {
        return ResponseEntity.ok(bookingService.getRevenueStats());
    }

    private User getUser(Authentication auth) {
        return userRepo.findByEmail(auth.getName()).orElseThrow(() -> new RuntimeException("User not found"));
    }
}
