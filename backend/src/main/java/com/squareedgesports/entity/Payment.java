package com.squareedgesports.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    private String paymentReference;
    private String paymentMethod; // RAZORPAY | STRIPE | TEST_MODE | CASH

    // Mapped to VARCHAR (not a native DB enum) so adding new PaymentStatus
    // constants never again requires a manual column-widening migration -
    // ddl-auto=update cannot safely alter an existing native enum's value set.
    // (This is exactly what caused DUE to be silently rejected by MySQL.)
    @Enumerated(EnumType.STRING)
    @Column(length = 20, columnDefinition = "VARCHAR(20)")
    private PaymentStatus status = PaymentStatus.PENDING;

    private String gatewayOrderId;
    private String gatewayPaymentId;
    private String description;
    private String refundReference;

    @Column(precision = 10, scale = 2)
    private BigDecimal refundAmount;

    private LocalDateTime paidAt;
    private LocalDateTime refundedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // public enum PaymentStatus { PENDING, PAID, FAILED, REFUNDED, PARTIAL_REFUND }
    public enum PaymentStatus {
        PENDING, PAID, FAILED, REFUNDED, PARTIAL_REFUND, DUE
    }
}
