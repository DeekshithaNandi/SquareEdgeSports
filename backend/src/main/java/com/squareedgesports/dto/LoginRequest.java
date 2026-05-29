package com.squareedgesports.dto;
import jakarta.validation.constraints.*;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor
public class LoginRequest {
    @Email @NotBlank private String email;
    @NotBlank         private String password;
}
