package com.squareedgesports.service;

import com.squareedgesports.dto.NotificationDto;
import com.squareedgesports.entity.Notification;
import com.squareedgesports.entity.User;
import com.squareedgesports.repository.NotificationRepository;
import com.squareedgesports.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;

    @Transactional
    public void notifyUser(Long userId, String type, String message, Long bookingId) {
        User user = userRepo.findById(userId).orElse(null);
        if (user == null)
            return;
        notificationRepo.save(Notification.builder()
                .user(user).type(type).message(message).bookingId(bookingId).read(false).build());
    }

    /**
     * Notifies every SUPER_ADMIN / ADMINISTRATOR account — used so admins know to
     * process a refund.
     */
    @Transactional
    public void notifyAdmins(String type, String message, Long bookingId) {
        userRepo.findAll().stream()
                .filter(u -> u.getRole() == User.Role.SUPER_ADMIN || u.getRole() == User.Role.ADMINISTRATOR)
                .forEach(admin -> notificationRepo.save(Notification.builder()
                        .user(admin).type(type).message(message).bookingId(bookingId).read(false).build()));
    }

    public List<NotificationDto> getMy(Long userId) {
        return notificationRepo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    public long unreadCount(Long userId) {
        return notificationRepo.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(Long id) {
        notificationRepo.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepo.save(n);
        });
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepo.markAllRead(userId);
    }

    private NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId()).message(n.getMessage()).type(n.getType())
                .bookingId(n.getBookingId()).read(n.isRead()).createdAt(n.getCreatedAt())
                .build();
    }
}