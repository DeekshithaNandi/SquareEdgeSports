package com.squareedgesports.dto;
import lombok.Data;

@Data
public class PermissionsDto {
    private boolean canManageBookings;
    private boolean canManagePayments;
    private boolean canManageCourts;
    private boolean canViewReports;
    private boolean canManageUsers;
}
