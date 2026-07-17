package com.squareedgesports.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackRequest {
    private Long bookingId;
    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;
    private String category;
    @NotBlank
    @Size(max = 300)
    private String comment;
}
