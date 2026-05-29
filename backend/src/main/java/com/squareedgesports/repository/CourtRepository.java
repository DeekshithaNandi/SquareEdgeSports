package com.squareedgesports.repository;

import com.squareedgesports.entity.Court;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CourtRepository extends JpaRepository<Court, Long> {
    List<Court> findByTypeAndStatus(Court.CourtType type, Court.CourtStatus status);
    List<Court> findByStatus(Court.CourtStatus status);
}
