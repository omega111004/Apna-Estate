package com.realestate.repository;

import com.realestate.entity.SupportMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {
    List<SupportMessage> findByStatusOrderByCreatedAtDesc(SupportMessage.Status status);
    List<SupportMessage> findAllByOrderByCreatedAtDesc();
    List<SupportMessage> findByEmailOrderByCreatedAtDesc(String email);
    Long countByStatus(SupportMessage.Status status);
}

