package com.squareedgesports.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor
public class UserDto {
    private Long    id;
    private String  fullName;
    private String  email;
    private String  phone;
    private String  profilePicture;
    // structured address
    private String  addressLine1;
    private String  addressLine2;
    private String  city;
    private String  state;
    private String  country;
    private String  zipCode;
    private String  role;
    private boolean emailVerified;
    private boolean active;
    private boolean cricketLaneMember;
    private LocalDateTime cricketLaneExpiry;
    private LocalDateTime cricketLaneGrantedAt;
    private boolean boxCricketMember;
    private LocalDateTime boxCricketExpiry;
    private LocalDateTime boxCricketGrantedAt;
    private boolean pickleballMember;
    private LocalDateTime pickleballExpiry;
    private LocalDateTime pickleballGrantedAt;
    private LocalDateTime createdAt;
    private PermissionsDto permissions;
}
