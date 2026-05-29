package com.squareedgesports.dto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminCreateUserRequest {
    @NotBlank
    private String fullName;
    @NotBlank @Email
    private String email;
    @NotBlank
    private String role;  // ADMINISTRATOR, EMPLOYEE, PLAYER
    private String phone;
}
