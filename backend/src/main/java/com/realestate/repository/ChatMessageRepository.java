package com.realestate.repository;

import com.realestate.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByInquiry_IdOrderBySentAtAsc(Long inquiryId);
    
    long countByInquiry_IdAndIsReadFalse(Long inquiryId);
    
    // Mark messages as read for a specific inquiry where the user is NOT the sender
    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage m SET m.isRead = true, m.readAt = :readAt " +
           "WHERE m.inquiry.id = :inquiryId AND m.sender.id != :userId AND m.isRead = false")
    void markMessagesAsRead(@Param("inquiryId") Long inquiryId, 
                           @Param("userId") Long userId, 
                           @Param("readAt") LocalDateTime readAt);
    
    // Count unread messages for a specific inquiry where the user is NOT the sender
    @Query("SELECT COUNT(m) FROM ChatMessage m " +
           "WHERE m.inquiry.id = :inquiryId AND m.sender.id != :userId AND m.isRead = false")
    Long countUnreadMessages(@Param("inquiryId") Long inquiryId, 
                             @Param("userId") Long userId);
    
    // Count total unread messages for a user across all inquiries
    @Query("SELECT COUNT(m) FROM ChatMessage m " +
           "WHERE (m.inquiry.client.id = :userId OR m.inquiry.owner.id = :userId) " +
           "AND m.sender.id != :userId AND m.isRead = false")
    Long countTotalUnreadMessagesForUser(@Param("userId") Long userId);
}
