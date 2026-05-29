package com.squareedgesports.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "cms_content")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CmsContent {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String contentKey;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    private String imageUrl;
    private String contentType;  // BANNER | ANNOUNCEMENT | PAGE
    private boolean active = true;
    private Integer sortOrder = 0;
    /** 0–100 discount percentage applied to bookings while this item is active */
    private Integer discountPercent = 0;
    /** ALL_DAYS | WEEKDAYS | WEEKENDS — restricts which days the discount applies */
    private String dayRestriction = "ALL_DAYS";
    /** HH:mm start of the time window when discount is active (null = no restriction) */
    private String discountTimeFrom;
    /** HH:mm end of the time window when discount is active (null = no restriction) */
    private String discountTimeTo;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist  protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate   protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
