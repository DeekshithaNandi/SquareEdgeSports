package com.squareedgesports.config;

import com.squareedgesports.entity.*;
import com.squareedgesports.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepo;
    private final PricingRuleRepository pricingRepo;
    private final CourtRepository courtRepo;
    private final PasswordEncoder encoder;

    @Override
    public void run(String... args) {
        seedAdmins();
        seedPricingRules();
        seedCourts();
    }

    private void seedAdmins() {
        upsertUser("Super Admin", "admin@squareedgesports.com", "Admin@2024!", User.Role.SUPER_ADMIN);
        upsertUser("Administrator", "manager@squareedgesports.com", "Manager@2024!", User.Role.ADMINISTRATOR);
        upsertUser("Player", "player@squareedgesports.com", "Player@2024!", User.Role.PLAYER);
    }

    private void upsertUser(String name, String email, String pass, User.Role role) {
        if (!userRepo.existsByEmail(email)) {
            userRepo.save(User.builder()
                    .fullName(name).email(email)
                    .password(encoder.encode(pass))
                    .role(role).emailVerified(true).active(true).build());
            log.info("Seeded user: {}", email);
        }
    }

    /**
     * Always upserts — so prices update on every restart without manual DB edits
     */
    private void seedPricingRules() {
        upsertPricing("CRICKET_LANE", "Cricket Lane – Non Member", "500.00");
        upsertPricing("CRICKET_LANE_MEMBER", "Cricket Lane – Member", "400.00");
        upsertPricing("BOX_CRICKET", "Box Cricket – Non Member", "1500.00");
        upsertPricing("BOX_CRICKET_MEMBER", "Box Cricket – Member", "1200.00");
        upsertPricing("PICKLEBALL", "Pickleball – Non Member", "500.00");
        upsertPricing("PICKLEBALL_MEMBER", "Pickleball – Member", "400.00");
        upsertPricing("CRICKET_LANE_MEMBERSHIP", "Cricket Lane Membership / month", "1500.00");
        upsertPricing("BOX_CRICKET_MEMBERSHIP", "Box Cricket Membership / month", "3000.00");
        upsertPricing("PICKLEBALL_MEMBERSHIP", "Pickleball Membership / month", "1500.00");
        log.info("Pricing rules updated (INR)");
    }

    private void upsertPricing(String key, String desc, String price) {
        PricingRule rule = pricingRepo.findByRuleKey(key)
                .orElse(PricingRule.builder().ruleKey(key).build());
        rule.setDescription(desc);
        rule.setPrice(new BigDecimal(price));
        pricingRepo.save(rule);
    }

    private void seedCourts() {
        if (courtRepo.count() == 0) {
            // Cricket lanes 1-4 → Box A
            for (int i = 1; i <= 4; i++)
                courtRepo.save(Court.builder()
                        .name("Cricket Lane " + i).type(Court.CourtType.CRICKET_LANE)
                        .boxGroup("BOX_A").laneNumber(i).location("Indoor Hall A")
                        .pricePerSlot(new BigDecimal("500")).memberPricePerSlot(new BigDecimal("400"))
                        .capacity(6).status(Court.CourtStatus.ACTIVE).build());
            // Cricket lanes 5-8 → Box B
            for (int i = 5; i <= 8; i++)
                courtRepo.save(Court.builder()
                        .name("Cricket Lane " + i).type(Court.CourtType.CRICKET_LANE)
                        .boxGroup("BOX_B").laneNumber(i).location("Indoor Hall A")
                        .pricePerSlot(new BigDecimal("500")).memberPricePerSlot(new BigDecimal("400"))
                        .capacity(6).status(Court.CourtStatus.ACTIVE).build());
            // Pickleball courts 1-3
            for (int i = 1; i <= 3; i++)
                courtRepo.save(Court.builder()
                        .name("Pickleball Court " + i).type(Court.CourtType.PICKLEBALL)
                        .location("Outdoor Area").laneNumber(i)
                        .pricePerSlot(new BigDecimal("500")).memberPricePerSlot(new BigDecimal("400"))
                        .capacity(4).status(Court.CourtStatus.ACTIVE).build());
            log.info("Courts seeded");
        } else {
            // Always update existing court prices to reflect current INR values
            courtRepo.findAll().forEach(c -> {
                if (c.getType() == Court.CourtType.CRICKET_LANE) {
                    c.setPricePerSlot(new BigDecimal("500"));
                    c.setMemberPricePerSlot(new BigDecimal("400"));
                } else if (c.getType() == Court.CourtType.PICKLEBALL) {
                    c.setPricePerSlot(new BigDecimal("500"));
                    c.setMemberPricePerSlot(new BigDecimal("400"));
                }
                courtRepo.save(c);
            });
            log.info("Court prices updated (INR)");
        }
    }
}
