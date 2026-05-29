package com.squareedgesports.repository;

import com.squareedgesports.entity.CmsContent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CmsContentRepository extends JpaRepository<CmsContent, Long> {
    List<CmsContent> findByActiveOrderBySortOrderAsc(boolean active);
    List<CmsContent> findByContentTypeAndActiveOrderBySortOrderAsc(String type, boolean active);
    Optional<CmsContent> findByContentKey(String key);
}
