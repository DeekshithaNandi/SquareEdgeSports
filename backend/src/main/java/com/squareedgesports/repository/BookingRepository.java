package com.squareedgesports.repository;

import com.squareedgesports.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("SELECT b FROM Booking b JOIN FETCH b.user WHERE b.user.id = :userId ORDER BY b.bookingDate DESC, b.startTime DESC")
    List<Booking> findByUserId(@Param("userId") Long userId);

    @Query("SELECT b FROM Booking b JOIN FETCH b.user WHERE b.bookingDate = :date ORDER BY b.startTime")
    List<Booking> findByDate(@Param("date") LocalDate date);

    @Query("SELECT b FROM Booking b JOIN FETCH b.user WHERE b.bookingDate >= :from AND b.bookingDate <= :to ORDER BY b.bookingDate, b.startTime")
    List<Booking> findByDateRange(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT b FROM Booking b JOIN FETCH b.user WHERE b.status = 'CANCELLED' ORDER BY b.cancelledAt DESC")
    List<Booking> findCancelled();

    @Query("SELECT b FROM Booking b JOIN FETCH b.user ORDER BY b.createdAt DESC")
    List<Booking> findAllWithUser();

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.bookingDate = :date AND b.status <> 'CANCELLED'")
    long countByDate(@Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(b.amountPaid),0) FROM Booking b WHERE b.status <> 'CANCELLED' AND b.bookingDate = :date")
    java.math.BigDecimal sumRevenueByDate(@Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(b.amountPaid),0) FROM Booking b WHERE b.status <> 'CANCELLED'")
    java.math.BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(b.amountPaid),0) FROM Booking b WHERE b.status <> 'CANCELLED' AND MONTH(b.bookingDate) = :month AND YEAR(b.bookingDate) = :year")
    java.math.BigDecimal sumRevenueByMonth(@Param("month") int month, @Param("year") int year);

    @Query("SELECT b.bookingDate, COALESCE(SUM(b.amountPaid),0) FROM Booking b WHERE b.status <> 'CANCELLED' GROUP BY b.bookingDate ORDER BY b.bookingDate")
    List<Object[]> revenueByDay();

    @Query("SELECT b FROM Booking b WHERE b.bookingDate = :date AND b.status <> 'CANCELLED' " +
           "AND NOT (b.paymentStatus = 'PENDING' AND b.createdAt < :cutoff) " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    List<Booking> findConflicting(@Param("date") java.time.LocalDate date,
                                   @Param("startTime") java.time.LocalTime startTime,
                                   @Param("endTime") java.time.LocalTime endTime,
                                   @Param("cutoff") java.time.LocalDateTime cutoff);

    @Query("SELECT b FROM Booking b JOIN FETCH b.user WHERE b.bookingDate = :date " +
           "AND b.status <> 'CANCELLED' ORDER BY b.startTime, b.bookingType")
    List<Booking> findActiveByDate(@Param("date") java.time.LocalDate date);

    /** Find bookings with PENDING payment status older than the given cutoff (for cleanup) */
    @Query("SELECT b FROM Booking b WHERE b.paymentStatus = 'PENDING' AND b.createdAt < :cutoff")
    List<Booking> findPendingOlderThan(@Param("cutoff") java.time.LocalDateTime cutoff);

    /** Court-number conflict: any non-cancelled booking (excl. self) with same courtNumber at overlapping time */
    @Query("SELECT b FROM Booking b WHERE b.bookingDate = :date AND b.status <> 'CANCELLED' " +
           "AND b.id <> :excludeId AND b.courtNumber = :courtNumber " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    List<Booking> findCourtConflicts(@Param("date") java.time.LocalDate date,
                                     @Param("courtNumber") int courtNumber,
                                     @Param("startTime") java.time.LocalTime startTime,
                                     @Param("endTime") java.time.LocalTime endTime,
                                     @Param("excludeId") Long excludeId);

    /** Lane-number conflict: any non-cancelled booking (excl. self) with same laneNumber at overlapping time */
    @Query("SELECT b FROM Booking b WHERE b.bookingDate = :date AND b.status <> 'CANCELLED' " +
           "AND b.id <> :excludeId AND b.laneNumber = :laneNumber " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    List<Booking> findLaneConflicts(@Param("date") java.time.LocalDate date,
                                    @Param("laneNumber") int laneNumber,
                                    @Param("startTime") java.time.LocalTime startTime,
                                    @Param("endTime") java.time.LocalTime endTime,
                                    @Param("excludeId") Long excludeId);
}
