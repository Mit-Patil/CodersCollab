/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.GroupMessageRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;

public interface GroupMessageReadRepository
        extends JpaRepository<GroupMessageRead, Long> {

    Optional<GroupMessageRead> findByGroupIdAndUserId(
        Long groupId, Long userId);

    // Upsert last read timestamp
    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO group_message_reads
            (group_id, user_id, last_read_at)
        VALUES (:groupId, :userId, :now)
        ON CONFLICT (group_id, user_id)
        DO UPDATE SET last_read_at = :now
        """, nativeQuery = true)
    void upsertLastRead(
        @Param("groupId") Long groupId,
        @Param("userId") Long userId,
        @Param("now") LocalDateTime now);
}
