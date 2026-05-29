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
    private boolean boxCricketMember;
    private boolean pickleballMember;
    private LocalDateTime membershipExpiry;
    private LocalDateTime createdAt;
    private PermissionsDto permissions;
}
