package com.squareedgesports.service;

import com.squareedgesports.entity.Booking;
import com.squareedgesports.repository.BookingRepository;
import com.squareedgesports.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class BookingCleanupScheduler {

    private final BookingRepository bookingRepo;
    private final PaymentRepository paymentRepo;

    /** Every 60 seconds: delete PENDING bookings older than 10 minutes */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expireStaleBookings() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(10);
        List<Booking> stale = bookingRepo.findPendingOlderThan(cutoff);
        for (Booking b : stale) {
            paymentRepo.deleteByBookingId(b.getId());
            bookingRepo.delete(b);
        }
    }
}
