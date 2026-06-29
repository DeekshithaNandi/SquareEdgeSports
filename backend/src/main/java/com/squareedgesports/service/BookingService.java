package com.squareedgesports.service;

import com.squareedgesports.dto.*;
import com.squareedgesports.entity.*;
import com.squareedgesports.repository.*;
import com.squareedgesports.service.NotificationService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepo;
    private final UserRepository userRepo;
    private final PricingRuleRepository pricingRepo;
    private final PaymentRepository paymentRepo;
    private final CmsContentRepository cmsRepo;
    private final EmailService emailService;
    private final RazorpayService razorpayService;
    private final NotificationService notificationService;
    private final CourtRepository courtRepo;

    /* ── Create booking ── */
    @Transactional
    public BookingDto create(Long userId, CreateBookingRequest req) {
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (req.getStartTime() == null || req.getStartTime().isBlank())
            throw new IllegalArgumentException("startTime is required");
        LocalTime start;
        try {
            start = LocalTime.parse(req.getStartTime());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid startTime format. Expected HH:MM (e.g. 09:00)");
        }
        LocalTime end = start.plusMinutes(55);

        BigDecimal price = calculatePrice(req.getBookingType(), user, req.getBookingDate(), start);

        // boolean isMember = switch (req.getBookingType()) {
        // case "CRICKET_LANE" -> user.isCricketLaneMember();
        // case "BOX_CRICKET" -> user.isBoxCricketMember();
        // case "PICKLEBALL" -> user.isPickleballMember();
        // default -> false;
        // };
        boolean membershipActive = user.getMembershipExpiry() == null
                || user.getMembershipExpiry().isAfter(LocalDateTime.now());
        boolean isMember = membershipActive && switch (req.getBookingType()) {
            case "CRICKET_LANE" -> user.isCricketLaneMember();
            case "BOX_CRICKET" -> user.isBoxCricketMember();
            case "PICKLEBALL" -> user.isPickleballMember();
            default -> false;
        };

        Booking b = Booking.builder()
                .user(user)
                .bookingDate(req.getBookingDate())
                .startTime(start).endTime(end)
                .bookingType(req.getBookingType())
                .boxGroup(req.getBoxGroup())
                // laneNumber and courtNumber are NOT set by user — admin assigns later
                .amountPaid(price)
                .memberDiscountApplied(isMember)
                .paymentStatus(Payment.PaymentStatus.PENDING.name())
                .paymentReference("BK-" + System.currentTimeMillis())
                .status(Booking.BookingStatus.CONFIRMED)
                .build();
        bookingRepo.save(b);

        // create payment record
        paymentRepo.save(Payment.builder()
                .user(user).booking(b)
                .amount(price).paymentMethod("PENDING")
                .paymentReference(b.getPaymentReference())
                .status(Payment.PaymentStatus.PENDING)
                .description(req.getBookingType() + " booking " + req.getBookingDate())
                .build());
        notificationService.notifyUser(user.getId(), "BOOKING_CONFIRMED",
                "Your " + label(req.getBookingType()) + " slot on " + req.getBookingDate() + " at "
                        + start.toString().substring(0, 5) + " is booked successfully.",
                b.getId());
        return toDto(b);
    }

    /* ── Confirm payment ── */
    @Transactional
    public BookingDto confirmPayment(Long bookingId, String paymentRef, String method) {
        Booking b = bookingRepo.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        b.setPaymentStatus(Payment.PaymentStatus.PAID.name());
        b.setPaymentReference(paymentRef != null ? paymentRef : b.getPaymentReference());
        bookingRepo.save(b);

        paymentRepo.findByBookingId(bookingId).ifPresent(p -> {
            p.setStatus(Payment.PaymentStatus.PAID);
            p.setPaymentMethod(method != null ? method : "ONLINE");
            p.setGatewayPaymentId(paymentRef);
            p.setPaidAt(LocalDateTime.now());
            paymentRepo.save(p);
        });
        return toDto(b);
    }

    /* ── Cancel booking ── */
    @Transactional
    public BookingDto cancel(Long bookingId, Long userId, String reason) {
        Booking b = bookingRepo.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        if (userId != null && !b.getUser().getId().equals(userId))
            throw new RuntimeException("Not authorized to cancel this booking");
        b.setStatus(Booking.BookingStatus.CANCELLED);
        b.setCancellationReason(reason);
        b.setCancelledAt(LocalDateTime.now());
        bookingRepo.save(b);

        String policy = calcRefundPolicy(b);
        BigDecimal refundAmount = calcRefundAmount(b, policy);
        String userMsg = switch (policy) {
            case "FULL" -> "Your " + label(b.getBookingType()) + " booking on " + b.getBookingDate()
                    + " was cancelled — full refund of ₹" + refundAmount + " will be processed.";
            case "HALF" -> "Your " + label(b.getBookingType()) + " booking on " + b.getBookingDate()
                    + " was cancelled — 50% refund of ₹" + refundAmount + " will be processed.";
            default -> "Your " + label(b.getBookingType()) + " booking on " + b.getBookingDate()
                    + " was cancelled less than 1 hour before the session — no refund is applicable.";
        };
        notificationService.notifyUser(b.getUser().getId(), "BOOKING_CANCELLED", userMsg, b.getId());

        notificationService.notifyAdmins("BOOKING_CANCELLED",
                b.getUser().getFullName() + " cancelled a " + label(b.getBookingType()) + " booking (#" + b.getId()
                        + ") on " + b.getBookingDate() + " — refund: " + policy
                        + (refundAmount.compareTo(BigDecimal.ZERO) > 0 ? " (₹" + refundAmount + ")" : ""),
                b.getId());

        return toDto(b);
    }

    public List<BookingDto> getByUser(Long userId) {
        return bookingRepo.findByUserId(userId).stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<BookingDto> getByDate(LocalDate d) {
        return bookingRepo.findActiveByDate(d).stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<BookingDto> getAll() {
        return bookingRepo.findAllWithUser().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<BookingDto> getCancelled() {
        return bookingRepo.findCancelled().stream().map(this::toDto).collect(Collectors.toList());
    }

    public Optional<BookingDto> getById(Long id) {
        return bookingRepo.findById(id).map(this::toDto);
    }

    /* ── Revenue stats ── */
    public Map<String, Object> getRevenueStats() {
        LocalDate today = LocalDate.now();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalRevenue", bookingRepo.sumTotalRevenue());
        m.put("todayRevenue", bookingRepo.sumRevenueByDate(today));
        m.put("monthlyRevenue", bookingRepo.sumRevenueByMonth(today.getMonthValue(), today.getYear()));
        m.put("todayBookings", bookingRepo.countByDate(today));
        m.put("totalBookings", bookingRepo.count());
        m.put("revenueByDay", bookingRepo.revenueByDay().stream()
                .filter(r -> r[0] != null)
                .map(r -> Map.of("date", r[0].toString(), "revenue", r[1] != null ? r[1] : BigDecimal.ZERO))
                .collect(Collectors.toList()));
        return m;
    }

    /* ── Available slots ─────────────────────────────────────────────────────── */
    public Map<String, Object> getAvailableSlots(LocalDate date, String type, String boxGroup) {
        LocalTime openTime = LocalTime.of(7, 0);
        LocalTime closeTime = LocalTime.of(22, 0);
        List<Map<String, Object>> slots = new ArrayList<>();
        LocalTime current = openTime;

        LocalDateTime pendingCutoff = LocalDateTime.now().minusMinutes(10);
        int capacity = courtRepo
                .findByTypeAndStatus(Court.CourtType.valueOf(type), Court.CourtStatus.ACTIVE)
                .size();
        if (capacity < 1)
            capacity = 1;
        while (!current.plusMinutes(55).isAfter(closeTime)) {
            LocalTime slotEnd = current.plusMinutes(55);
            List<Booking> conflicts = bookingRepo.findConflicting(date, current, slotEnd, pendingCutoff);
            Map<String, Object> slot = buildSlot(type, boxGroup, current, slotEnd, conflicts, capacity);
            slots.add(slot);
            current = current.plusMinutes(60); // 55 min session + 5 min buffer
        }
        return Map.of("date", date.toString(), "type", type, "slots", slots);
    }

    /* ── Create Razorpay order for a single booking ─────────────────────────── */
    public Map<String, Object> createRazorpayOrder(Long bookingId) {
        Booking b = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        return razorpayService.createOrder(b.getAmountPaid(), b.getPaymentReference());
    }

    /* ── Create ONE Razorpay order for multiple bookings (combined total) ───── */
    public Map<String, Object> createBatchRazorpayOrder(List<Long> bookingIds) {
        BigDecimal total = bookingIds.stream()
                .map(id -> bookingRepo.findById(id).orElseThrow(() -> new RuntimeException("Booking not found: " + id))
                        .getAmountPaid())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        String receipt = "BATCH-" + bookingIds.get(0) + "-" + System.currentTimeMillis();
        return razorpayService.createOrder(total, receipt);
    }

    /* ── Confirm payment for multiple bookings with a single payment ─────────── */
    @Transactional
    public List<BookingDto> confirmBatchPayment(List<Long> bookingIds, String paymentId, String method) {
        return bookingIds.stream()
                .map(id -> confirmPayment(id, paymentId, method))
                .collect(Collectors.toList());
    }

    /* ── Refund payment by booking ID ───────────────────────────────────────── */
    @Transactional
    public Map<String, Object> refundByBookingId(Long bookingId) {
        Booking b = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        // Calculate policy-based refund amount
        String policy = calcRefundPolicy(b);
        BigDecimal refundAmount = calcRefundAmount(b, policy);

        boolean gatewayRefundProcessed = false;
        String gatewayNote = null;

        // Process Razorpay refund and update payment record
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            Payment p = paymentRepo.findByBookingId(bookingId)
                    .orElseThrow(() -> new RuntimeException("Payment record not found for booking"));
            String gwId = p.getGatewayPaymentId();
            if (gwId != null && !gwId.isBlank()) {
                try {
                    razorpayService.refund(gwId, refundAmount);
                    gatewayRefundProcessed = true;
                } catch (Exception e) {
                    // Gateway refund failed (e.g. test-mode limitation, network issue).
                    // Log it, store a note, but still mark the booking as refunded in DB
                    // so the admin can process the gateway side manually if needed.
                    gatewayNote = "Gateway refund pending manual processing: " + e.getMessage();
                }
            } else {
                // No gateway ID means payment was cash/offline — no gateway call needed.
                gatewayRefundProcessed = true;
            }
            p.setStatus("FULL".equals(policy) ? Payment.PaymentStatus.REFUNDED : Payment.PaymentStatus.PARTIAL_REFUND);
            p.setRefundAmount(refundAmount);
            p.setRefundedAt(LocalDateTime.now());
            if (gatewayNote != null)
                p.setRefundReference(gatewayNote);
            paymentRepo.save(p);
        }

        // Booking payment status mirrors the policy
        b.setPaymentStatus("FULL".equals(policy)
                ? Payment.PaymentStatus.REFUNDED.name()
                : Payment.PaymentStatus.PARTIAL_REFUND.name());
        bookingRepo.save(b);

        // Send refund confirmation email
        emailService.sendRefundConfirmation(
                b.getUser().getEmail(), b.getUser().getFullName(),
                b.getBookingType(), b.getBookingDate().toString(),
                refundAmount, policy);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("message", gatewayRefundProcessed ? "Refund processed" : "Refund recorded — gateway pending");
        result.put("refundPolicy", policy);
        result.put("refundAmount", refundAmount);
        if (gatewayNote != null)
            result.put("gatewayNote", gatewayNote);
        return result;
    }

    /* ── Notify player of no-refund (admin action for <1hr cancellations) ───── */
    public Map<String, Object> sendNoRefundNotification(Long bookingId) {
        Booking b = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        emailService.sendNoRefundNotification(
                b.getUser().getEmail(), b.getUser().getFullName(),
                b.getBookingType(), b.getBookingDate().toString(),
                b.getStartTime().toString().substring(0, 5));
        return Map.of("message", "No-refund notification sent to " + b.getUser().getEmail());
    }

    /* ── Assign court/lane (admin action) ───────────────────────────────────── */
    @Transactional
    public BookingDto assignCourt(Long bookingId, Integer laneNumber, Integer courtNumber, String boxGroup) {
        Booking b = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        // ── Conflict check ─────────────────────────────────────────────────────
        if (courtNumber != null) {
            List<Booking> conflicts = bookingRepo.findCourtConflicts(
                    b.getBookingDate(), courtNumber, b.getStartTime(), b.getEndTime(), bookingId);
            if (!conflicts.isEmpty()) {
                Booking clash = conflicts.get(0);
                throw new RuntimeException(
                        "Court " + courtNumber + " is already assigned to booking #" + clash.getId() +
                                " (" + clash.getUser().getFullName() + ") at " +
                                clash.getStartTime().toString().substring(0, 5) + " – " +
                                clash.getEndTime().toString().substring(0, 5) + ". Choose a different court.");
            }
        }
        if (laneNumber != null) {
            List<Booking> conflicts = bookingRepo.findLaneConflicts(
                    b.getBookingDate(), laneNumber, b.getStartTime(), b.getEndTime(), bookingId);
            if (!conflicts.isEmpty()) {
                Booking clash = conflicts.get(0);
                throw new RuntimeException(
                        "Lane " + laneNumber + " is already assigned to booking #" + clash.getId() +
                                " (" + clash.getUser().getFullName() + ") at " +
                                clash.getStartTime().toString().substring(0, 5) + " – " +
                                clash.getEndTime().toString().substring(0, 5) + ". Choose a different lane.");
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        if (laneNumber != null)
            b.setLaneNumber(laneNumber);
        if (courtNumber != null)
            b.setCourtNumber(courtNumber);
        if (boxGroup != null)
            b.setBoxGroup(boxGroup);
        bookingRepo.save(b);
        emailService.sendCourtAssignment(
                b.getUser().getEmail(), b.getUser().getFullName(),
                b.getBookingType(), b.getBookingDate().toString(),
                b.getStartTime().toString(), laneNumber, courtNumber, b.getBoxGroup());

        notificationService.notifyUser(b.getUser().getId(), "COURT_ASSIGNED",
                "Your court/lane for the " + label(b.getBookingType()) + " session on " + b.getBookingDate()
                        + " has been assigned.",
                b.getId());

        return toDto(b);
    }

    private String label(String type) {
        if (type == null)
            return "session";
        return switch (type) {
            case "CRICKET_LANE" -> "Cricket Lane";
            case "BOX_CRICKET" -> "Box Cricket";
            case "PICKLEBALL" -> "Pickleball";
            default -> type.replace("_", " ");
        };
    }

    /* ── Refund policy helpers ───────────────────────────────────────────────── */

    /**
     * Returns FULL / HALF / NONE based on how far in advance cancellation occurred
     * relative to the booked session start time.
     */
    private String calcRefundPolicy(Booking b) {
        LocalDateTime sessionStart = LocalDateTime.of(b.getBookingDate(), b.getStartTime());
        LocalDateTime cancelledAt = b.getCancelledAt() != null ? b.getCancelledAt() : LocalDateTime.now();
        long hours = Duration.between(cancelledAt, sessionStart).toHours();
        if (hours >= 24)
            return "FULL";
        if (hours >= 1)
            return "HALF";
        return "NONE";
    }

    private BigDecimal calcRefundAmount(Booking b, String policy) {
        return switch (policy) {
            case "FULL" -> b.getAmountPaid();
            case "HALF" -> b.getAmountPaid().divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            default -> BigDecimal.ZERO;
        };
    }

    private Map<String, Object> buildSlot(String type, String boxGroup, LocalTime start, LocalTime end,
            List<Booking> conflicts, int capacity) {
        Map<String, Object> slot = new LinkedHashMap<>();
        slot.put("startTime", start.toString());
        slot.put("endTime", end.toString());

        long count = conflicts.stream()
                .filter(b -> type.equals(b.getBookingType()))
                .count();
        slot.put("available", count < capacity);
        slot.put("remaining", (int) Math.max(0, capacity - count));
        return slot;
    }

    /* ── Live court view ─────────────────────────────────────────────────────── */
    public List<BookingDto> getLiveView(LocalDate date) {
        return bookingRepo.findActiveByDate(date).stream().map(this::toDto).collect(Collectors.toList());
    }

    private BigDecimal calculatePrice(String type, User user, LocalDate bookingDate, LocalTime slotTime) {
        String key = switch (type) {
            case "CRICKET_LANE" -> user.isCricketLaneMember() ? "CRICKET_LANE_MEMBER" : "CRICKET_LANE";
            case "BOX_CRICKET" -> user.isBoxCricketMember() ? "BOX_CRICKET_MEMBER" : "BOX_CRICKET";
            case "PICKLEBALL" -> user.isPickleballMember() ? "PICKLEBALL_MEMBER" : "PICKLEBALL";
            default -> "CRICKET_LANE";
        };
        BigDecimal base = pricingRepo.findByRuleKey(key).map(PricingRule::getPrice).orElse(BigDecimal.valueOf(500));

        // Find the best applicable CMS discount respecting day + time restrictions
        int maxDiscount = cmsRepo.findByActiveOrderBySortOrderAsc(true).stream()
                .filter(c -> c.getDiscountPercent() != null && c.getDiscountPercent() > 0)
                .filter(c -> {
                    // Day restriction check
                    String dr = c.getDayRestriction();
                    if (dr != null && !dr.equals("ALL_DAYS")) {
                        DayOfWeek dow = bookingDate.getDayOfWeek();
                        boolean isWeekend = dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
                        if ("WEEKDAYS".equals(dr) && isWeekend)
                            return false;
                        if ("WEEKENDS".equals(dr) && !isWeekend)
                            return false;
                    }
                    // Time restriction check
                    String fromTime = c.getDiscountTimeFrom();
                    String toTime = c.getDiscountTimeTo();
                    if ((fromTime != null && !fromTime.isBlank()) || (toTime != null && !toTime.isBlank())) {
                        try {
                            LocalTime from = (fromTime != null && !fromTime.isBlank()) ? LocalTime.parse(fromTime)
                                    : null;
                            LocalTime to = (toTime != null && !toTime.isBlank()) ? LocalTime.parse(toTime) : null;
                            if (from != null && to != null) {
                                if (from.isBefore(to) || from.equals(to)) {
                                    if (slotTime.isBefore(from) || slotTime.isAfter(to))
                                        return false;
                                } else {
                                    if (slotTime.isBefore(from) && slotTime.isAfter(to))
                                        return false;
                                }
                            } else if (from != null) {
                                if (slotTime.isBefore(from))
                                    return false;
                            } else if (to != null) {
                                if (slotTime.isAfter(to))
                                    return false;
                            }
                        } catch (Exception ignored) {
                        }
                    }
                    return true;
                })
                .mapToInt(c -> c.getDiscountPercent())
                .max().orElse(0);

        if (maxDiscount > 0 && maxDiscount <= 100) {
            BigDecimal factor = BigDecimal.ONE.subtract(
                    BigDecimal.valueOf(maxDiscount).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
            base = base.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        }
        return base;
    }

    public BookingDto toDto(Booking b) {
        String policy = (b.getStatus() == Booking.BookingStatus.CANCELLED) ? calcRefundPolicy(b) : null;
        BigDecimal refAmt = (policy != null) ? calcRefundAmount(b, policy) : null;

        return BookingDto.builder()
                .id(b.getId())
                .userId(b.getUser().getId())
                .userName(b.getUser().getFullName())
                .userEmail(b.getUser().getEmail())
                .courtName(b.getCourt() != null ? b.getCourt().getName() : null)
                .courtType(b.getBookingType())
                .bookingDate(b.getBookingDate())
                .startTime(b.getStartTime())
                .endTime(b.getEndTime())
                .bookingType(b.getBookingType())
                .boxGroup(b.getBoxGroup())
                .laneNumber(b.getLaneNumber())
                .courtNumber(b.getCourtNumber())
                .amountPaid(b.getAmountPaid())
                .paymentReference(b.getPaymentReference())
                .paymentStatus(b.getPaymentStatus())
                .status(b.getStatus().name())
                .cancellationReason(b.getCancellationReason())
                .createdAt(b.getCreatedAt())
                .cancelledAt(b.getCancelledAt())
                .memberDiscountApplied(b.isMemberDiscountApplied())
                .courtAssigned(b.getLaneNumber() != null || b.getCourtNumber() != null)
                .refundPolicy(policy)
                .refundAmount(refAmt)
                .build();
    }
}
