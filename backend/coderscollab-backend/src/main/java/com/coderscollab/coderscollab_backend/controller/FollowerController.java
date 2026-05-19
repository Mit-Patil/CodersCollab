/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */


/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.controller;

import com.coderscollab.coderscollab_backend.dto.FollowResponse;
import com.coderscollab.coderscollab_backend.service.FollowerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/follow")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class FollowerController {

    private final FollowerService followerService;

    @PostMapping("/{userId}")
    public ResponseEntity<FollowResponse> follow(
            @RequestHeader("Authorization") String token,
            @PathVariable Long userId) {
        return ResponseEntity.ok(followerService.follow(token, userId));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<FollowResponse> unfollow(
            @RequestHeader("Authorization") String token,
            @PathVariable Long userId) {
        return ResponseEntity.ok(followerService.unfollow(token, userId));
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<FollowResponse> getFollowStatus(
            @RequestHeader("Authorization") String token,
            @PathVariable Long userId) {
        return ResponseEntity.ok(
                followerService.getFollowStatus(token, userId));
    }

    @GetMapping("/{userId}/followers")
    public ResponseEntity<List<FollowResponse>> getFollowers(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String token) {
        Long viewerId = followerService.getViewerIdFromToken(token);
        return ResponseEntity.ok(
            followerService.getFollowers(userId, viewerId));
    }

    @GetMapping("/{userId}/following")
    public ResponseEntity<List<FollowResponse>> getFollowing(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String token) {
        Long viewerId = followerService.getViewerIdFromToken(token);
        return ResponseEntity.ok(
            followerService.getFollowing(userId, viewerId));
    }

    @GetMapping("/count/{userId}")
    public ResponseEntity<?> getCounts(@PathVariable Long userId) {
        long followers = followerService.getFollowerCount(userId);
        long following = followerService.getFollowingCount(userId);
        return ResponseEntity.ok(
            java.util.Map.of(
                "followers", followers,
                "following", following
            )
        );
    }
    
    @GetMapping("/requests")
public ResponseEntity<List<FollowResponse>> getFollowRequests(
        @RequestHeader("Authorization") String token) {
    return ResponseEntity.ok(
            followerService.getFollowRequests(token));
}

@PostMapping("/requests/{followerId}/accept")
public ResponseEntity<FollowResponse> acceptRequest(
        @RequestHeader("Authorization") String token,
        @PathVariable Long followerId) {
    return ResponseEntity.ok(
            followerService.acceptRequest(token, followerId));
}

@PostMapping("/requests/{followerId}/reject")
public ResponseEntity<Void> rejectRequest(
        @RequestHeader("Authorization") String token,
        @PathVariable Long followerId) {
    followerService.rejectRequest(token, followerId);
    return ResponseEntity.ok().build();
}

@GetMapping("/requests/count")
public ResponseEntity<Long> getRequestCount(
        @RequestHeader("Authorization") String token) {
    return ResponseEntity.ok(
            followerService.getPendingRequestCount(token));
}
}
