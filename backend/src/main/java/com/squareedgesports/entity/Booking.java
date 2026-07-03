package com.squareedgesports.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity @Table(name = "bookings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Booking {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "court_id")
    private Court court;

    @Column(nullable = false)
    private LocalDate bookingDate;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    private String  bookingType;  // CRICKET_LANE | BOX_CRICKET | PICKLEBALL
    private String  boxGroup;
    private Integer laneNumber;
    private Integer courtNumber;

    @Column(precision = 10, scale = 2)
    private BigDecimal amountPaid;

    private boolean memberDiscountApplied;
    private String  paymentReference;
    private String  paymentStatus;  // PENDING | PAID | REFUNDED

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BookingStatus status = BookingStatus.CONFIRMED;

    private String cancellationReason;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean reminderSent;

    @PrePersist  protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate   protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public enum BookingStatus { CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW }
}
