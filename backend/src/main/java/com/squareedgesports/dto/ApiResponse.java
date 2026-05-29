package com.squareedgesports.dto;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiResponse {
    private boolean success;
    private String message;
    private Object data;

    public static ApiResponse ok(String msg) {
        return new ApiResponse(true, msg, null);
    }

    public static ApiResponse ok(String msg, Object d) {
        return new ApiResponse(true, msg, d);
    }

    public static ApiResponse error(String msg) {
        return new ApiResponse(false, msg, null);
    }
}