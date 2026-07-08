package com.squareedgesports.service;

import com.squareedgesports.entity.User;
import com.squareedgesports.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MembershipExpiryScheduler {

    private final UserRepository userRepo;

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void clearExpiredMemberships() {
        LocalDateTime now = LocalDateTime.now();
        List<User> toSave = new ArrayList<>();

        for (User u : userRepo.findAll()) {
            boolean changed = false;

            if (u.isCricketLaneMember() && u.getCricketLaneExpiry() != null && u.getCricketLaneExpiry().isBefore(now)) {
                u.setCricketLaneMember(false);
                u.setCricketLaneExpiry(null);
                changed = true;
            }
            if (u.isBoxCricketMember() && u.getBoxCricketExpiry() != null && u.getBoxCricketExpiry().isBefore(now)) {
                u.setBoxCricketMember(false);
                u.setBoxCricketExpiry(null);
                changed = true;
            }
            if (u.isPickleballMember() && u.getPickleballExpiry() != null && u.getPickleballExpiry().isBefore(now)) {
                u.setPickleballMember(false);
                u.setPickleballExpiry(null);
                changed = true;
            }

            if (changed)
                toSave.add(u);
        }

        if (!toSave.isEmpty())
            userRepo.saveAll(toSave);
    }
}