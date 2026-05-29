package com.squareedgesports.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "employee_permissions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EmployeePermission {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private boolean canManageBookings  = false;
    private boolean canManagePayments  = false;
    private boolean canManageCourts    = false;
    private boolean canViewReports     = false;
    private boolean canManageUsers     = false;
}
