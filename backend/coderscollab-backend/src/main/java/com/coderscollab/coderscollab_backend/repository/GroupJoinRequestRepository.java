/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.GroupJoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GroupJoinRequestRepository
        extends JpaRepository<GroupJoinRequest, Long> {

    Optional<GroupJoinRequest> findByGroupIdAndUserId(
        Long groupId, Long userId);

    boolean existsByGroupIdAndUserId(
        Long groupId, Long userId);

    // All pending requests for a group (admin view)
    List<GroupJoinRequest> findByGroupIdAndStatus(
        Long groupId, String status);

    void deleteByGroupIdAndUserId(
        Long groupId, Long userId);
    

}
