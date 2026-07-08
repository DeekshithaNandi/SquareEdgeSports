package com.squareedgesports.config;

import com.squareedgesports.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(403).body(ApiResponse.error("Access Denied"));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse> handle(RuntimeException ex) {
        String msg = ex.getMessage();
        // Sanitize Java enum errors — never expose internal class paths
        if (msg != null && msg.startsWith("No enum constant")) {
            msg = "Invalid value provided.";
        }
        return ResponseEntity.badRequest().body(ApiResponse.error(msg));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse> handleMissingParam(MissingServletRequestParameterException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error("Required parameter '" + ex.getParameterName() + "' is missing."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error("Invalid value for parameter '" + ex.getName() + "'."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .findFirst().orElse("Validation error");
        return ResponseEntity.badRequest().body(ApiResponse.error(msg));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse> handleGeneral(Exception ex) {
        return ResponseEntity.internalServerError().body(ApiResponse.error("An unexpected error occurred."));
    }
}
