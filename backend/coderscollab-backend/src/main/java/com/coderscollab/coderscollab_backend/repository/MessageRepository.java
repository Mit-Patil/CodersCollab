/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface MessageRepository
        extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByTimestampAsc(
            Long conversationId);

    @Query("SELECT m FROM Message m WHERE " +
           "m.conversation.id = :conversationId " +
           "ORDER BY m.timestamp DESC LIMIT 1")
    Optional<Message> findLastMessage(
            @Param("conversationId") Long conversationId);

    long countByConversationIdAndIsReadFalseAndSenderIdNot(
            Long conversationId, Long senderId);

    @Transactional
    @Query("UPDATE Message m SET m.isRead = true WHERE " +
           "m.conversation.id = :conversationId AND " +
           "m.sender.id != :userId AND m.isRead = false")
    @org.springframework.data.jpa.repository.Modifying
    void markAllAsRead(@Param("conversationId") Long conversationId,
                       @Param("userId") Long userId);
}
