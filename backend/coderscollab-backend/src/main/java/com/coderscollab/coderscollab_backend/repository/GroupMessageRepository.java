/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface GroupMessageRepository
        extends JpaRepository<GroupMessage, Long> {

    // Get all messages for a group ordered oldest first
    List<GroupMessage> findByGroupIdOrderByTimestampAsc(Long groupId);

    // Get last message for group preview
    @Query("""
        SELECT gm FROM GroupMessage gm
        WHERE gm.group.id = :groupId
        ORDER BY gm.timestamp DESC
        LIMIT 1
        """)
    Optional<GroupMessage> findLastMessage(
        @Param("groupId") Long groupId);

    // Count unread messages for a user in a group
    @Query("""
        SELECT COUNT(gm) FROM GroupMessage gm
        WHERE gm.group.id = :groupId
        AND gm.sender.id != :userId
        AND gm.timestamp > (
            SELECT COALESCE(MAX(gmr.lastReadAt),
                CAST('1970-01-01' AS java.time.LocalDateTime))
            FROM GroupMessageRead gmr
            WHERE gmr.group.id = :groupId
            AND gmr.user.id = :userId
        )
        AND gm.isDeleted = false
        """)
    long countUnreadMessages(
        @Param("groupId") Long groupId,
        @Param("userId") Long userId);
}
