package com.squareedgesports.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String phone;
    private String profilePicture;

    // ── Address fields ──────────────────────────────────────────────────────
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String country;
    private String zipCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.PLAYER;

    @Column(nullable = false)
    private boolean emailVerified = false;

    @Column(nullable = false)
    private boolean active = true;

    private boolean cricketLaneMember = false;
    private LocalDateTime cricketLaneExpiry;
    private LocalDateTime cricketLaneGrantedAt;

    private boolean boxCricketMember = false;
    private LocalDateTime boxCricketExpiry;
    private LocalDateTime boxCricketGrantedAt;

    private boolean pickleballMember = false;
    private LocalDateTime pickleballExpiry;
    private LocalDateTime pickleballGrantedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Role {
        SUPER_ADMIN, ADMINISTRATOR, EMPLOYEE, PLAYER
    }
}
