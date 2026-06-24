package com.squareedgesports.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {
    private Long id;
    private String message;
    private String type;
    private Long bookingId;
    private boolean read;
    private LocalDateTime createdAt;
}