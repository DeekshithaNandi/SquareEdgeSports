package com.squareedgesports.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "courts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Court {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // VARCHAR, not a native DB enum - see Booking.status / Payment.status for why.
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(20)")
    private CourtType type;

    private String location;
    private String description;

    @Column(precision = 10, scale = 2)
    private BigDecimal pricePerSlot;

    @Column(precision = 10, scale = 2)
    private BigDecimal memberPricePerSlot;

    private Integer laneNumber;
    private String boxGroup;
    private Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(20)")
    private CourtStatus status = CourtStatus.ACTIVE;

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

    public enum CourtType {
        CRICKET_LANE, BOX_CRICKET, PICKLEBALL
    }

    public enum CourtStatus {
        ACTIVE, MAINTENANCE, INACTIVE
    }
}
