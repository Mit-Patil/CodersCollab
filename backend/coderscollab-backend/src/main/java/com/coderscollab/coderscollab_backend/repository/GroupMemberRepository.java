/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository
        extends JpaRepository<GroupMember, Long> {

    Optional<GroupMember> findByGroupIdAndUserId(
        Long groupId, Long userId);

    boolean existsByGroupIdAndUserId(
        Long groupId, Long userId);

    List<GroupMember> findByGroupIdOrderByRoleDesc(
        Long groupId);

    List<GroupMember> findByUserId(Long userId);

    long countByGroupId(Long groupId);

    void deleteByGroupIdAndUserId(
        Long groupId, Long userId);

    // Check if user is admin
    @Query("""
        SELECT CASE WHEN COUNT(gm) > 0 THEN true ELSE false END
        FROM GroupMember gm
        WHERE gm.group.id = :groupId
        AND gm.user.id = :userId
        AND gm.role = 'ADMIN'
        """)
    boolean isAdmin(
        @Param("groupId") Long groupId,
        @Param("userId") Long userId);

    // Count admins in group
    long countByGroupIdAndRole(Long groupId, String role);
}
