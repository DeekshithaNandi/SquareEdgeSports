package com.squareedgesports.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AdminCreateBookingRequest extends CreateBookingRequest {
    @NotNull
    private Long userId; // the customer this booking is for
    private boolean markAsPaid = true; // front-desk booking → treat as paid (cash) immediately
}