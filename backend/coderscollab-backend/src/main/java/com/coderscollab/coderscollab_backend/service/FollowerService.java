/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */



/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.service;

import com.coderscollab.coderscollab_backend.dto.FollowResponse;
import com.coderscollab.coderscollab_backend.entity.*;
import com.coderscollab.coderscollab_backend.repository.*;
import com.coderscollab.coderscollab_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowerService {

    private final FollowerRepository followerRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final JwtUtil jwtUtil;

    private User getUserFromToken(String token) {
        String email = jwtUtil.extractEmail(token.substring(7));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public FollowResponse follow(String token, Long targetUserId) {
    User currentUser = getUserFromToken(token);

    if (currentUser.getId().equals(targetUserId)) {
        throw new RuntimeException("You cannot follow yourself");
    }

    User targetUser = userRepository.findById(targetUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));

    boolean alreadyFollowing = followerRepository
            .existsByFollowerIdAndFollowingId(
                    currentUser.getId(), targetUserId);

    if (!alreadyFollowing) {
        String status = Boolean.TRUE.equals(targetUser.getIsPrivate())
                ? "PENDING" : "ACCEPTED";

        Follower follower = Follower.builder()
                .follower(currentUser)
                .following(targetUser)
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();
        followerRepository.save(follower);
    }

    return buildFollowResponse(currentUser, targetUser);
}

    public FollowResponse unfollow(String token, Long targetUserId) {
        User currentUser = getUserFromToken(token);

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        followerRepository.deleteByFollowerIdAndFollowingId(
                currentUser.getId(), targetUserId);

        return buildFollowResponse(currentUser, targetUser);
    }

    public FollowResponse getFollowStatus(String token, Long targetUserId) {
        User currentUser = getUserFromToken(token);
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return buildFollowResponse(currentUser, targetUser);
    }

    public long getFollowerCount(Long userId) {
        return followerRepository
            .countByFollowingIdAndStatus(userId, "ACCEPTED");
    }

    public long getFollowingCount(Long userId) {
        return followerRepository
            .countByFollowerIdAndStatus(userId, "ACCEPTED");
    }
    
    public List<FollowResponse> getFollowers(Long userId, Long viewerUserId) {
       return followerRepository.findByFollowingId(userId)
               .stream()
               .filter(f -> "ACCEPTED".equals(f.getStatus()))
               .map(f -> {
                   User follower = f.getFollower();
                   UserProfile profile = userProfileRepository
                           .findByUserId(follower.getId())
                           .orElse(new UserProfile());

                   // Check if viewer follows this person
                   boolean isFollowing = false;
                   boolean isPending = false;
                   if (viewerUserId != null) {
                       followerRepository
                           .findByFollowerIdAndFollowingId(
                               viewerUserId, follower.getId())
                           .ifPresent(rel -> {});
                       var rel = followerRepository
                           .findByFollowerIdAndFollowingId(
                               viewerUserId, follower.getId());
                       if (rel.isPresent()) {
                           isFollowing = "ACCEPTED"
                               .equals(rel.get().getStatus());
                           isPending = "PENDING"
                               .equals(rel.get().getStatus());
                       }
                   }

                   return FollowResponse.builder()
                           .userId(follower.getId())
                           .username(follower.getUsername())
                           .fullName(profile.getFullName())
                           .profilePictureUrl(
                               profile.getProfilePictureUrl())
                           .following(isFollowing)
                           .pending(isPending)
                           .build();
               })
               .collect(Collectors.toList());
   }

   public List<FollowResponse> getFollowing(Long userId, Long viewerUserId) {
       return followerRepository.findByFollowerId(userId)
               .stream()
               .filter(f -> "ACCEPTED".equals(f.getStatus()))
               .map(f -> {
                   User following = f.getFollowing();
                   UserProfile profile = userProfileRepository
                           .findByUserId(following.getId())
                           .orElse(new UserProfile());

                   boolean isFollowing = false;
                   boolean isPending = false;
                   if (viewerUserId != null) {
                       var rel = followerRepository
                           .findByFollowerIdAndFollowingId(
                               viewerUserId, following.getId());
                       if (rel.isPresent()) {
                           isFollowing = "ACCEPTED"
                               .equals(rel.get().getStatus());
                           isPending = "PENDING"
                               .equals(rel.get().getStatus());
                       }
                   }

                   return FollowResponse.builder()
                           .userId(following.getId())
                           .username(following.getUsername())
                           .fullName(profile.getFullName())
                           .profilePictureUrl(
                               profile.getProfilePictureUrl())
                           .following(isFollowing)
                           .pending(isPending)
                           .build();
               })
               .collect(Collectors.toList());
   }

public List<FollowResponse> getFollowRequests(String token) {
    User currentUser = getUserFromToken(token);
    return followerRepository.findByFollowingId(currentUser.getId())
            .stream()
            .filter(f -> "PENDING".equals(f.getStatus()))
            .map(f -> {
                User requester = f.getFollower();
                UserProfile profile = userProfileRepository
                        .findByUserId(requester.getId())
                        .orElse(new UserProfile());
                return FollowResponse.builder()
                        .userId(requester.getId())
                        .username(requester.getUsername())
                        .fullName(profile.getFullName())
                        .profilePictureUrl(profile.getProfilePictureUrl())
                        .following(false)
                        .pending(true)
                        .privateAccount(false)
                        .followerCount(followerRepository
                                .countByFollowingId(requester.getId()))
                        .followingCount(followerRepository
                                .countByFollowerId(requester.getId()))
                        .build();
            })
            .collect(Collectors.toList());
}

public Long getViewerIdFromToken(String token) {
    try {
        return getUserFromToken(token).getId();
    } catch (Exception e) { return null; }
}

public FollowResponse acceptRequest(String token, Long followerId) {
    User currentUser = getUserFromToken(token);

    Follower follower = followerRepository
            .findByFollowerIdAndFollowingId(
                    followerId, currentUser.getId())
            .orElseThrow(() ->
                    new RuntimeException("Request not found"));

    follower.setStatus("ACCEPTED");
    followerRepository.save(follower);

    User requester = userRepository.findById(followerId)
            .orElseThrow(() ->
                    new RuntimeException("User not found"));

    return buildFollowResponse(requester, currentUser);
}
public void rejectRequest(String token, Long followerId) {
    User currentUser = getUserFromToken(token);
    followerRepository.deleteByFollowerIdAndFollowingId(
            followerId, currentUser.getId());
}

public long getPendingRequestCount(String token) {
    User currentUser = getUserFromToken(token);
    return followerRepository.findByFollowingId(currentUser.getId())
            .stream()
            .filter(f -> "PENDING".equals(f.getStatus()))
            .count();
}
    
    private FollowResponse buildFollowResponse(User currentUser,
        User targetUser) {
    UserProfile profile = userProfileRepository
            .findByUserId(targetUser.getId())
            .orElse(new UserProfile());

    boolean isFollowing = false;
    boolean isPending = false;

    java.util.Optional<Follower> followerOpt = followerRepository
            .findByFollowerIdAndFollowingId(
                    currentUser.getId(), targetUser.getId());

    if (followerOpt.isPresent()) {
        String status = followerOpt.get().getStatus();
        isFollowing = "ACCEPTED".equals(status);
        isPending = "PENDING".equals(status);
    }

    return FollowResponse.builder()
            .userId(targetUser.getId())
            .username(targetUser.getUsername())
            .fullName(profile.getFullName())
            .profilePictureUrl(profile.getProfilePictureUrl())
            .following(isFollowing)
            .pending(isPending)
            .privateAccount(Boolean.TRUE.equals(targetUser.getIsPrivate()))
            .followerCount(followerRepository
                    .countByFollowingId(targetUser.getId()))
            .followingCount(followerRepository
                .countByFollowerIdAndStatus(targetUser.getId(), "ACCEPTED"))
            .build();
}
}
