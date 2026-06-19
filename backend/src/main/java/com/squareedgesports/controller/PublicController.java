package com.squareedgesports.controller;

import com.squareedgesports.entity.Court;
import com.squareedgesports.repository.*;
import com.squareedgesports.service.BookingService;
import com.squareedgesports.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final CourtRepository courtRepo;
    private final PricingRuleRepository pricingRepo;
    private final CmsContentRepository cmsRepo;
    private final BookingService bookingService;
    private final EmailService emailService;

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("ok");
    }

    @GetMapping("/courts")
    public ResponseEntity<?> courts() {
        return ResponseEntity.ok(courtRepo.findByStatus(Court.CourtStatus.ACTIVE));
    }

    @GetMapping("/pricing")
    public ResponseEntity<?> pricing() {
        return ResponseEntity.ok(pricingRepo.findAll());
    }

    @GetMapping("/cms/banners")
    public ResponseEntity<?> banners() {
        return ResponseEntity.ok(cmsRepo.findByContentTypeAndActiveOrderBySortOrderAsc("BANNER", true));
    }

    @GetMapping("/cms")
    public ResponseEntity<?> cms() {
        return ResponseEntity.ok(cmsRepo.findByActiveOrderBySortOrderAsc(true));
    }

    @GetMapping("/availability")
    public ResponseEntity<?> availability(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String type,
            @RequestParam(required = false) String boxGroup) {
        return ResponseEntity.ok(bookingService.getAvailableSlots(date, type, boxGroup));
    }

    @GetMapping("/live-view")
    public ResponseEntity<?> liveView() {
        return ResponseEntity.ok(bookingService.getLiveView(LocalDate.now()));
    }

    @PostMapping("/contact")
    public ResponseEntity<?> contact(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "").trim();
        String email = body.getOrDefault("email", "").trim();
        String subject = body.getOrDefault("subject", "").trim();
        String message = body.getOrDefault("message", "").trim();

        if (name.isEmpty() || email.isEmpty() || message.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name, email and message are required."));
        }

        emailService.sendContactEmail(name, email, subject, message);
        return ResponseEntity.ok(Map.of("message", "Message sent successfully!"));
    }
}
