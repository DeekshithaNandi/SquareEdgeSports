package com.squareedgesports.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "pricing_rules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PricingRule {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String ruleKey;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
