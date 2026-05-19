/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {

    // All groups a user is member of
    @Query("""
        SELECT g FROM Group g
        JOIN GroupMember gm ON gm.group.id = g.id
        WHERE gm.user.id = :userId
        ORDER BY g.createdAt DESC
        """)
    List<Group> findGroupsByUserId(@Param("userId") Long userId);

    // Search public groups by name
    @Query("""
        SELECT g FROM Group g
        WHERE LOWER(g.name) LIKE LOWER(CONCAT('%', :query, '%'))
        ORDER BY g.isPrivate ASC, g.createdAt DESC
        """)
    List<Group> searchPublicGroups(@Param("query") String query);

    Optional<Group> findByInviteCode(String inviteCode);

    // All public groups
    List<Group> findByIsPrivateFalseOrderByCreatedAtDesc();
    
}