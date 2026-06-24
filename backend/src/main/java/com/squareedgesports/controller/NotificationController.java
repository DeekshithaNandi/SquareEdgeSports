package com.squareedgesports.controller;

import com.squareedgesports.entity.User;
import com.squareedgesports.repository.UserRepository;
import com.squareedgesports.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepo;

    @GetMapping("/my")
    public ResponseEntity<?> my(Authentication auth) {
        return ResponseEntity.ok(notificationService.getMy(getUser(auth).getId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(Authentication auth) {
        return ResponseEntity.ok(Map.of("count", notificationService.unreadCount(getUser(auth).getId())));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        notificationService.markRead(id);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        notificationService.markAllRead(getUser(auth).getId());
        return ResponseEntity.ok(Map.of("message", "All marked as read"));
    }

    private User getUser(Authentication auth) {
        return userRepo.findByEmail(auth.getName()).orElseThrow(() -> new RuntimeException("User not found"));
    }
}