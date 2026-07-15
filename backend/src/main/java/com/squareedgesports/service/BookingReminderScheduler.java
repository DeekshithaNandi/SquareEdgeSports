package com.squareedgesports.service;

import com.squareedgesports.entity.Booking;
import com.squareedgesports.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
     * Every 5 minutes: email a reminder for any booking whose 24-hour mark has
     * now been crossed (slot start is under 24h away) but hasn't started yet,
     * was itself made at least 24h ahead of its own slot, and hasn't already
     * been reminded. Deliberately catch-up-friendly rather than an exact
     * sliding window: on a host that can go idle and cold-start (e.g. Render's
     * free tier), a narrow "only this exact 5-minute slice" check would
     * silently and permanently miss any reminder whose window fell during a
     * gap where the scheduler simply wasn't running. Scanning "has the 24h
     * mark already passed" instead means a late-running tick still catches
     * and sends everything it missed, rather than losing it forever.
     */
    @Scheduled(fixedDelay = POLL_INTERVAL_MINUTES * 60_000)
    @Transactional
    public void sendUpcomingReminders() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<Booking> candidates = bookingRepo.findReminderCandidates(now.toLocalDate(), now.toLocalDate().plusDays(2));

        for (Booking b : candidates) {
            LocalDateTime slotStart = LocalDateTime.of(b.getBookingDate(), b.getStartTime());
            boolean withinReminderWindow = slotStart.isAfter(now) && Duration.between(now, slotStart).toHours() < 24;
            boolean bookedFarEnoughAhead = Duration.between(b.getCreatedAt(), slotStart).toHours() >= 24;
            if (!withinReminderWindow || !bookedFarEnoughAhead) {
                continue;
            }
            emailService.sendBookingReminder(b.getUser().getEmail(), b.getUser().getFullName(), b.getBookingType(),
                    b.getBookingDate().toString(), b.getStartTime().format(DateTimeFormatter.ofPattern("h:mm a")));
            b.setReminderSent(true);
            bookingRepo.save(b);
        }
    }
}
