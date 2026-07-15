package com.squareedgesports.service;

import com.squareedgesports.entity.Booking;
import com.squareedgesports.entity.User;
import com.squareedgesports.repository.BookingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Verifies the 24h reminder window against the real scheduler method (not a
 * re-implementation): a booking made LESS than 24h before its own slot must
 * never receive a reminder, because the "slot start - 24h" instant has
 * already passed by the time such a booking exists. A booking made MORE than
 * 24h ahead must receive exactly one reminder, at the poll tick that first
 * observes slotStart-24h, and never a duplicate on later ticks.
 */
@ExtendWith(MockitoExtension.class)
class BookingReminderSchedulerTest {

    @Mock BookingRepository bookingRepo;
    @Mock EmailService emailService;

    private User user() {
        return User.builder().id(1L).fullName("Alice Smith").email("alice@example.com").build();
    }

    private Booking bookingFor(LocalDateTime bookedAt, LocalDateTime slotStart) {
        return Booking.builder()
                .id(1L)
                .user(user())
                .bookingDate(slotStart.toLocalDate())
                .startTime(slotStart.toLocalTime())
                .endTime(slotStart.toLocalTime().plusMinutes(55))
                .status(Booking.BookingStatus.CONFIRMED)
                .bookingType("PICKLEBALL")
                .reminderSent(false)
                .createdAt(bookedAt)
                .build();
    }

    /** Mirrors the repo's real filter: reminderSent=false, bookingDate within [from, to]. */
    private void stubCandidates(Booking booking) {
        when(bookingRepo.findReminderCandidates(any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(inv -> {
                    if (booking.isReminderSent()) return List.of();
                    LocalDate from = inv.getArgument(0);
                    LocalDate to = inv.getArgument(1);
                    LocalDate d = booking.getBookingDate();
                    return (!d.isBefore(from) && !d.isAfter(to)) ? List.of(booking) : List.<Booking>of();
                });
    }

    private Clock fixedClockAt(LocalDateTime instant) {
        return Clock.fixed(instant.atZone(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault());
    }

    @Test
    void bookingLessThan24hAhead_neverGetsReminder() {
        LocalDateTime bookedAt = LocalDateTime.now();
        LocalDateTime slotStart = bookedAt.plusHours(23).plusMinutes(30); // < 24h notice
        Booking b = bookingFor(bookedAt, slotStart);
        stubCandidates(b);

        // Simulate every 5-minute poll tick from booking time up to slot start.
        for (LocalDateTime tick = bookedAt; tick.isBefore(slotStart); tick = tick.plusMinutes(5)) {
            new BookingReminderScheduler(bookingRepo, emailService, fixedClockAt(tick)).sendUpcomingReminders();
        }

        verify(emailService, never()).sendBookingReminder(any(), any(), any(), any(), any());
        assertFalse(b.isReminderSent());
    }

    @Test
    void bookingMoreThan24hAhead_getsExactlyOneReminder() {
        LocalDateTime bookedAt = LocalDateTime.now();
        LocalDateTime slotStart = bookedAt.plusHours(30); // well over 24h notice
        Booking b = bookingFor(bookedAt, slotStart);
        stubCandidates(b);

        for (LocalDateTime tick = bookedAt; tick.isBefore(slotStart); tick = tick.plusMinutes(5)) {
            new BookingReminderScheduler(bookingRepo, emailService, fixedClockAt(tick)).sendUpcomingReminders();
        }

        verify(emailService, times(1)).sendBookingReminder(
                eq("alice@example.com"), eq("Alice Smith"), eq("PICKLEBALL"),
                eq(slotStart.toLocalDate().toString()), any());
        assertTrue(b.isReminderSent());
    }

    @Test
    void schedulerMissesSeveralTicks_stillCatchesUpOnNextRun() {
        // Simulates a Render-style cold-start gap: the app is asleep while the
        // booking's 24h-before mark passes, then wakes up 2 hours later. A
        // naive "only this exact 5-minute slice" check would miss this
        // reminder forever; the catch-up design must still send it.
        LocalDateTime bookedAt = LocalDateTime.now();
        LocalDateTime slotStart = bookedAt.plusHours(30);
        Booking b = bookingFor(bookedAt, slotStart);
        stubCandidates(b);

        // Only two ticks total: one right after booking, then a huge gap that
        // jumps straight to 2 hours past the 24h-before mark.
        new BookingReminderScheduler(bookingRepo, emailService, fixedClockAt(bookedAt)).sendUpcomingReminders();
        assertFalse(b.isReminderSent());

        LocalDateTime afterGap = slotStart.minusHours(24).plusHours(2);
        new BookingReminderScheduler(bookingRepo, emailService, fixedClockAt(afterGap)).sendUpcomingReminders();

        verify(emailService, times(1)).sendBookingReminder(
                eq("alice@example.com"), eq("Alice Smith"), eq("PICKLEBALL"),
                eq(slotStart.toLocalDate().toString()), any());
        assertTrue(b.isReminderSent());
    }

    @Test
    void slotAlreadyStarted_neverGetsALateReminder() {
        // The catch-up design must not fire for a session that's already
        // begun (or ended) by the time a late-running tick finally executes.
        LocalDateTime bookedAt = LocalDateTime.now();
        LocalDateTime slotStart = bookedAt.plusHours(30);
        Booking b = bookingFor(bookedAt, slotStart);
        stubCandidates(b);

        new BookingReminderScheduler(bookingRepo, emailService, fixedClockAt(slotStart.plusMinutes(10)))
                .sendUpcomingReminders();

        verify(emailService, never()).sendBookingReminder(any(), any(), any(), any(), any());
        assertFalse(b.isReminderSent());
    }
}
