package com.squareedgesports.dto;
import lombok.*;
@Data @AllArgsConstructor @NoArgsConstructor
public class AuthResponse {
    private String  token;
    private UserDto user;
    private String  message;
}
