package com.squareedgesports.repository;

import com.squareedgesports.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT f FROM Feedback f JOIN FETCH f.user ORDER BY f.createdAt DESC")
    List<Feedback> findAllWithUser();

    @Query("SELECT AVG(f.rating) FROM Feedback f")
    Double averageRating();
}
