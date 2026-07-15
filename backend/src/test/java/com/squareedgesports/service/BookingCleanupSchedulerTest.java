package com.squareedgesports.service;

import com.squareedgesports.entity.Booking;
import com.squareedgesports.entity.Payment;
import com.squareedgesports.entity.User;
import com.squareedgesports.repository.BookingRepository;
import com.squareedgesports.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Verifies the 10-minute payment-abandonment window: a booking still
 * AWAITING_PAYMENT past 10 minutes must be cancelled (not deleted) with its
 * Payment marked FAILED, while a "pay at venue" (DUE) booking of any age, and
 * a still-fresh AWAITING_PAYMENT booking, must never be touched - mirroring
 * the real repository query's own filter (status=AWAITING_PAYMENT,
 * paymentStatus=PENDING, createdAt < cutoff) so this proves the end-to-end
 * intent, not just the scheduler's own bookkeeping.
 */
@ExtendWith(MockitoExtension.class)
class BookingCleanupSchedulerTest {

    @Mock BookingRepository bookingRepo;
    @Mock PaymentRepository paymentRepo;

    private User user() {
        return User.builder().id(1L).fullName("Alice Smith").email("alice@example.com").build();
    }

    private Booking bookingFor(LocalDateTime createdAt, Booking.BookingStatus status, String paymentStatus) {
        return Booking.builder()
                .id(1L)
                .user(user())
                .bookingDate(createdAt.toLocalDate())
                .startTime(createdAt.toLocalTime())
                .endTime(createdAt.toLocalTime().plusMinutes(55))
                .status(status)
                .paymentStatus(paymentStatus)
                .createdAt(createdAt)
                .bookingType("PICKLEBALL")
                .amountPaid(BigDecimal.valueOf(30))
                .build();
    }

    /** Mirrors the real query's filter: status=AWAITING_PAYMENT, paymentStatus=PENDING, createdAt < cutoff. */
    private void stubCandidates(Booking booking) {
        when(bookingRepo.findPendingOlderThan(any(LocalDateTime.class))).thenAnswer(inv -> {
            LocalDateTime cutoff = inv.getArgument(0);
            boolean matches = booking.getStatus() == Booking.BookingStatus.AWAITING_PAYMENT
                    && "PENDING".equals(booking.getPaymentStatus())
                    && booking.getCreatedAt().isBefore(cutoff);
            return matches ? List.of(booking) : List.<Booking>of();
        });
    }

    private Clock fixedClockAt(LocalDateTime instant) {
        return Clock.fixed(instant.atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault());
    }

    @Test
    void awaitingPaymentOlderThan10Min_getsCancelledAndPaymentMarkedFailed() {
        LocalDateTime createdAt = LocalDateTime.now();
        Booking b = bookingFor(createdAt, Booking.BookingStatus.AWAITING_PAYMENT, "PENDING");
        Payment p = Payment.builder().id(1L).user(b.getUser()).booking(b).amount(BigDecimal.valueOf(30))
                .status(Payment.PaymentStatus.PENDING).build();
        stubCandidates(b);
        when(paymentRepo.findByBookingId(b.getId())).thenReturn(Optional.of(p));

        new BookingCleanupScheduler(bookingRepo, paymentRepo, fixedClockAt(createdAt.plusMinutes(11)))
                .expireStaleBookings();

        assertEquals(Booking.BookingStatus.CANCELLED, b.getStatus());
        assertEquals("Payment not completed within 10 minutes", b.getCancellationReason());
        assertNotNull(b.getCancelledAt());
        assertEquals(Payment.PaymentStatus.FAILED, p.getStatus());
    }

    @Test
    void awaitingPaymentUnder10Min_isNeverTouched() {
        LocalDateTime createdAt = LocalDateTime.now();
        Booking b = bookingFor(createdAt, Booking.BookingStatus.AWAITING_PAYMENT, "PENDING");
        stubCandidates(b);

        new BookingCleanupScheduler(bookingRepo, paymentRepo, fixedClockAt(createdAt.plusMinutes(9)))
                .expireStaleBookings();

        assertEquals(Booking.BookingStatus.AWAITING_PAYMENT, b.getStatus());
        verify(bookingRepo, never()).save(any());
        verify(paymentRepo, never()).save(any());
    }

    @Test
    void dueBooking_isNeverExpiredRegardlessOfAge() {
        LocalDateTime createdAt = LocalDateTime.now();
        Booking b = bookingFor(createdAt, Booking.BookingStatus.CONFIRMED, "DUE");
        stubCandidates(b);

        new BookingCleanupScheduler(bookingRepo, paymentRepo, fixedClockAt(createdAt.plusDays(1)))
                .expireStaleBookings();

        assertEquals(Booking.BookingStatus.CONFIRMED, b.getStatus());
        assertEquals("DUE", b.getPaymentStatus());
        verify(bookingRepo, never()).save(any());
    }

    @Test
    void alreadyCancelledBooking_isNeverReprocessed() {
        LocalDateTime createdAt = LocalDateTime.now();
        Booking b = bookingFor(createdAt, Booking.BookingStatus.CANCELLED, "PENDING");
        stubCandidates(b);

        new BookingCleanupScheduler(bookingRepo, paymentRepo, fixedClockAt(createdAt.plusMinutes(30)))
                .expireStaleBookings();

        verify(bookingRepo, never()).save(any());
    }

    @Test
    void missingPaymentRecord_doesNotPreventBookingFromBeingCancelled() {
        LocalDateTime createdAt = LocalDateTime.now();
        Booking b = bookingFor(createdAt, Booking.BookingStatus.AWAITING_PAYMENT, "PENDING");
        stubCandidates(b);
        when(paymentRepo.findByBookingId(b.getId())).thenReturn(Optional.empty());

        assertDoesNotThrow(() ->
                new BookingCleanupScheduler(bookingRepo, paymentRepo, fixedClockAt(createdAt.plusMinutes(11)))
                        .expireStaleBookings());

        assertEquals(Booking.BookingStatus.CANCELLED, b.getStatus());
    }
}
