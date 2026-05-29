package com.squareedgesports.config;

import com.squareedgesports.repository.EmployeePermissionRepository;
import com.squareedgesports.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("permCheck")
@RequiredArgsConstructor
public class PermissionCheck {

    private final UserRepository               userRepo;
    private final EmployeePermissionRepository permRepo;

    private boolean check(Authentication auth, java.util.function.Function<com.squareedgesports.entity.EmployeePermission, Boolean> getter) {
        if (auth == null) return false;
        return userRepo.findByEmail(auth.getName())
            .flatMap(u -> permRepo.findByUserId(u.getId()))
            .map(getter::apply)
            .orElse(false);
    }

    public boolean canManageBookings(Authentication auth) { return check(auth, p -> p.isCanManageBookings()); }
    public boolean canManagePayments(Authentication auth) { return check(auth, p -> p.isCanManagePayments()); }
    public boolean canManageCourts  (Authentication auth) { return check(auth, p -> p.isCanManageCourts());   }
    public boolean canViewReports   (Authentication auth) { return check(auth, p -> p.isCanViewReports());    }
    public boolean canManageUsers   (Authentication auth) { return check(auth, p -> p.isCanManageUsers());    }
}
