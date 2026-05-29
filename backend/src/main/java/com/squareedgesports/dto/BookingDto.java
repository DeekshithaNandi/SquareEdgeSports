package com.squareedgesports.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BookingDto {
    private Long      id;
    private String    userName;
    private String    userEmail;
    private Long      userId;
    private String    courtName;
    private String    courtType;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String    bookingType;
    private String    boxGroup;
    private Integer   laneNumber;
    private Integer   courtNumber;
    private BigDecimal amountPaid;
    private String    paymentReference;
    private String    paymentStatus;
    private String    status;
    private String    cancellationReason;
    private LocalDateTime createdAt;
    private LocalDateTime cancelledAt;
    private boolean   memberDiscountApplied;
    private boolean   courtAssigned;
    /** FULL | HALF | NONE — calculated from cancellation timing */
    private String    refundPolicy;
    /** Calculated refund amount based on policy */
    private BigDecimal refundAmount;
}
