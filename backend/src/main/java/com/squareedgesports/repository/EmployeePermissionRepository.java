package com.squareedgesports.repository;

import com.squareedgesports.entity.EmployeePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EmployeePermissionRepository extends JpaRepository<EmployeePermission, Long> {
    Optional<EmployeePermission> findByUserId(Long userId);
}
