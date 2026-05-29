package com.squareedgesports.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class CreateBookingRequest {
    @NotNull  private LocalDate   bookingDate;
    @NotBlank private String      startTime;
    @NotBlank private String      bookingType;
    private String      boxGroup;
    private Integer     laneNumber;
    private Integer     courtNumber;
    private BigDecimal  totalAmount;
    private java.util.List<String> players;
}
