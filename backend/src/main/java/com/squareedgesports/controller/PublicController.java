package com.squareedgesports.controller;

import com.squareedgesports.entity.Court;
import com.squareedgesports.repository.*;
import com.squareedgesports.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController @RequestMapping("/api/public") @RequiredArgsConstructor
public class PublicController {

    private final CourtRepository       courtRepo;
    private final PricingRuleRepository pricingRepo;
    private final CmsContentRepository  cmsRepo;
    private final BookingService        bookingService;

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
}
