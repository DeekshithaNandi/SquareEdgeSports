package com.squareedgesports.repository;

import com.squareedgesports.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT p FROM Payment p JOIN FETCH p.user ORDER BY p.createdAt DESC")
    List<Payment> findAllWithUser();

    Optional<Payment> findByPaymentReference(String ref);

    @Query("SELECT p FROM Payment p JOIN FETCH p.user WHERE p.booking.id = :bookingId")
    Optional<Payment> findByBookingId(@Param("bookingId") Long bookingId);
}
