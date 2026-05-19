/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */


/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.repository;

import com.coderscollab.coderscollab_backend.entity.Follower;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface FollowerRepository extends JpaRepository<Follower, Long> {

    Optional<Follower> findByFollowerIdAndFollowingId(
            Long followerId, Long followingId);

    List<Follower> findByFollowingId(Long followingId);

    List<Follower> findByFollowerId(Long followerId);
    List<Follower> findByFollowingIdAndStatus(Long followingId, String status);

    long countByFollowingId(Long followingId);

    long countByFollowerId(Long followerId);

    boolean existsByFollowerIdAndFollowingId(
            Long followerId, Long followingId);

    @Transactional
    void deleteByFollowerIdAndFollowingId(
            Long followerId, Long followingId);
    
    long countByFollowerIdAndStatus(Long followerId, String status);
    long countByFollowingIdAndStatus(Long followingId, String status);
    
    
}
