package com.squareedgesports.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {
    @NotBlank private String fullName;
    @Email    @NotBlank private String email;
    @NotBlank @Size(min=8) private String password;
    private String phone;
}

// ──────────────────────────────────────────────────
