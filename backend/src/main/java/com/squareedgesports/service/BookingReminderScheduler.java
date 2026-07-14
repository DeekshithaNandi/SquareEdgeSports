package com.squareedgesports.service;

import com.squareedgesports.entity.Booking;
import com.squareedgesports.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class BookingReminderScheduler {

    private static final long POLL_INTERVAL_MINUTES = 5;

    private final BookingRepository bookingRepo;
    private final EmailService emailService;
    private final Clock clock;

    @Autowired
    public BookingReminderScheduler(BookingRepository bookingRepo, EmailService emailService) {
        this(bookingRepo, emailService, Clock.systemDefaultZone());
    }

    BookingReminderScheduler(BookingRepository bookingRepo, EmailService emailService, Clock clock) {
        this.bookingRepo = bookingRepo;
        this.emailService = emailService;
        this.clock = clock;
    }

    /**
     * Every 5 minutes: email a reminder for bookings whose slot starts in the
     * next [24h, 24h + poll interval) window. Since the window only ever looks
     * forward from "now", a booking made less than 24h before its own slot will
     * have already crossed that window before it exists, so it's naturally
     * skipped - no separate "booked far enough in advance" check is needed.
     */
    @Scheduled(fixedDelay = POLL_INTERVAL_MINUTES * 60_000)
    @Transactional
    public void sendUpcomingReminders() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime windowStart = now.plusHours(24);
        LocalDateTime windowEnd = windowStart.plusMinutes(POLL_INTERVAL_MINUTES);

        List<Booking> candidates = bookingRepo.findReminderCandidates(windowStart.toLocalDate(),
                windowEnd.toLocalDate());

        for (Booking b : candidates) {
            LocalDateTime slotStart = LocalDateTime.of(b.getBookingDate(), b.getStartTime());
            if (slotStart.isBefore(windowStart) || !slotStart.isBefore(windowEnd)) {
                continue;
            }
            emailService.sendBookingReminder(b.getUser().getEmail(), b.getUser().getFullName(), b.getBookingType(),
                    b.getBookingDate().toString(), b.getStartTime().toString().substring(0, 5));
            b.setReminderSent(true);
            bookingRepo.save(b);
        }
    }
}
