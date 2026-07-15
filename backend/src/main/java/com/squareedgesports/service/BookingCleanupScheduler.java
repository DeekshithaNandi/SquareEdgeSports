package com.squareedgesports.service;

import com.squareedgesports.entity.Booking;
import com.squareedgesports.entity.Payment;
import com.squareedgesports.repository.BookingRepository;
import com.squareedgesports.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class BookingCleanupScheduler {

    private final BookingRepository bookingRepo;
    private final PaymentRepository paymentRepo;
    private final Clock clock;

    @Autowired
    public BookingCleanupScheduler(BookingRepository bookingRepo, PaymentRepository paymentRepo) {
        this(bookingRepo, paymentRepo, Clock.systemDefaultZone());
    }

    BookingCleanupScheduler(BookingRepository bookingRepo, PaymentRepository paymentRepo, Clock clock) {
        this.bookingRepo = bookingRepo;
        this.paymentRepo = paymentRepo;
        this.clock = clock;
    }

    /**
     * Every 60 seconds: any booking still AWAITING_PAYMENT more than 10 minutes
     * after creation means the customer never completed (or abandoned) checkout.
     * Cancel it - rather than deleting it - so it correctly disappears from every
     * "active" view (it's excluded the moment status != CONFIRMED/IN_PROGRESS)
     * while remaining visible in booking/payment history for admin auditing.
     */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expireStaleBookings() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime cutoff = now.minusMinutes(10);
        List<Booking> stale = bookingRepo.findPendingOlderThan(cutoff);
        for (Booking b : stale) {
            b.setStatus(Booking.BookingStatus.CANCELLED);
            b.setCancellationReason("Payment not completed within 10 minutes");
            b.setCancelledAt(now);
            bookingRepo.save(b);

            paymentRepo.findByBookingId(b.getId()).ifPresent(p -> {
                p.setStatus(Payment.PaymentStatus.FAILED);
                paymentRepo.save(p);
            });
        }
    }
}
