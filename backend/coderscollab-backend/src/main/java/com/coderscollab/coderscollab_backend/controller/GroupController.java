/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.controller;

import com.coderscollab.coderscollab_backend.dto.*;
import com.coderscollab.coderscollab_backend.entity.Group;
import com.coderscollab.coderscollab_backend.entity.User;
import com.coderscollab.coderscollab_backend.filter.JwtFilter;
import com.coderscollab.coderscollab_backend.repository.GroupRepository;
import com.coderscollab.coderscollab_backend.repository.UserRepository;
import com.coderscollab.coderscollab_backend.security.JwtUtil;
import com.coderscollab.coderscollab_backend.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final JwtUtil jwtUtil;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

    // ── Create group ───────────────────────────────────
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<GroupResponse> createGroup(
            @RequestHeader("Authorization") String token,
            @RequestPart("data") CreateGroupRequest req,
            @RequestPart(value = "avatar",
                required = false) MultipartFile avatar)
            throws Exception {
        return ResponseEntity.ok(
            groupService.createGroup(token, req, avatar));
    }

    // ── Get my groups ──────────────────────────────────
    @GetMapping("/my")
    public ResponseEntity<List<GroupResponse>> getMyGroups(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(
            groupService.getMyGroups(token));
    }

    // ── Get group by id ────────────────────────────────
    @GetMapping("/{groupId}")
    public ResponseEntity<GroupResponse> getGroup(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId) {
        return ResponseEntity.ok(
            groupService.getGroup(token, groupId));
    }

    // ── Search public groups ───────────────────────────
    @GetMapping("/search")
    public ResponseEntity<List<GroupResponse>> searchGroups(
            @RequestHeader("Authorization") String token,
            @RequestParam String query) {
        return ResponseEntity.ok(
            groupService.searchGroups(token, query));
    }

    // ── Update group (admin only) ──────────────────────
    @PutMapping(value = "/{groupId}",
        consumes = "multipart/form-data")
    public ResponseEntity<GroupResponse> updateGroup(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @RequestPart("data") CreateGroupRequest req,
            @RequestPart(value = "avatar",
                required = false) MultipartFile avatar)
            throws Exception {
        return ResponseEntity.ok(
            groupService.updateGroup(token, groupId, req, avatar));
    }

    // ── Delete group (admin only) ──────────────────────
    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId) {
        groupService.deleteGroup(token, groupId);
        return ResponseEntity.ok().build();
    }

    // ── Join group ─────────────────────────────────────
    @PostMapping("/{groupId}/join")
    public ResponseEntity<?> joinGroup(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId) {
        try {
            return ResponseEntity.ok(
                groupService.joinGroup(token, groupId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", e.getMessage()));
        }
    }

    // ── Leave group ────────────────────────────────────
    @PostMapping("/{groupId}/leave")
    public ResponseEntity<Void> leaveGroup(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId) {
        groupService.leaveGroup(token, groupId);
        return ResponseEntity.ok().build();
    }

    // ── Get members ────────────────────────────────────
    @GetMapping("/{groupId}/members")
    public ResponseEntity<List<GroupMemberResponse>> getMembers(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId) {
        return ResponseEntity.ok(
            groupService.getMembers(token, groupId));
    }

    // ── Add member ─────────────────────────────────────
    @PostMapping("/{groupId}/members/{userId}")
    public ResponseEntity<GroupMemberResponse> addMember(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(
            groupService.addMember(token, groupId, userId));
    }

    // ── Remove member (admin only) ─────────────────────
    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @PathVariable Long userId) {
        groupService.removeMember(token, groupId, userId);
        return ResponseEntity.ok().build();
    }

    // ── Update member role (admin only) ───────────────
    @PutMapping("/{groupId}/members/{userId}/role")
    public ResponseEntity<GroupMemberResponse> updateRole(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            groupService.updateMemberRole(
                token, groupId, userId, body.get("role")));
    }

    // ── Join requests (admin only) ─────────────────────
    @GetMapping("/{groupId}/requests")
    public ResponseEntity<List<GroupJoinRequestResponse>>
            getJoinRequests(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId) {
        return ResponseEntity.ok(
            groupService.getJoinRequests(token, groupId));
    }

    @PostMapping("/{groupId}/requests/{userId}/accept")
    public ResponseEntity<Void> acceptRequest(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @PathVariable Long userId) {
        groupService.handleJoinRequest(
            token, groupId, userId, true);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{groupId}/requests/{userId}/reject")
    public ResponseEntity<Void> rejectRequest(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @PathVariable Long userId) {
        groupService.handleJoinRequest(
            token, groupId, userId, false);
        return ResponseEntity.ok().build();
    }

    // ── Messages ───────────────────────────────────────
    @GetMapping("/{groupId}/messages")
    public ResponseEntity<List<GroupMessageResponse>>
            getMessages(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId) {
        return ResponseEntity.ok(
            groupService.getMessages(token, groupId));
    }

    @PostMapping("/{groupId}/messages")
    public ResponseEntity<GroupMessageResponse> sendMessage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @RequestBody Map<String, Object> body) {
        String content = (String) body.get("content");
        Long replyToId = body.get("replyToId") != null
            ? Long.valueOf(body.get("replyToId").toString())
            : null;
        return ResponseEntity.ok(
            groupService.sendMessage(
                token, groupId, content, replyToId));
    }

    @PostMapping("/{groupId}/messages/media")
    public ResponseEntity<GroupMessageResponse> sendMedia(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long replyToId)
            throws Exception {
        return ResponseEntity.ok(
            groupService.sendMedia(
                token, groupId, file, replyToId));
    }

    @PutMapping("/messages/{messageId}")
    public ResponseEntity<GroupMessageResponse> editMessage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long messageId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            groupService.editMessage(
                token, messageId, body.get("content")));
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long messageId,
            @RequestParam(defaultValue = "false")
                boolean forEveryone) {
        groupService.deleteMessage(
            token, messageId, forEveryone);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{groupId}/read")
    public ResponseEntity<Void> markAsRead(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId) {
        groupService.markAsRead(token, groupId);
        return ResponseEntity.ok().build();
    }
    
    
@PostMapping("/invite/{inviteCode}")
public ResponseEntity<?> joinByInvite(
        @RequestHeader("Authorization") String token,
        @PathVariable String inviteCode) {
    try {
        GroupResponse response = groupService
            .joinGroupByInviteCode(token, inviteCode);
        return ResponseEntity.ok(response);
    } catch (RuntimeException e) {
        System.err.println("[joinByInvite] ERROR: " + e.getMessage());
        e.printStackTrace();
        return ResponseEntity.badRequest()
            .body(Map.of("message", e.getMessage()));
    }
}
    
    @PostMapping("/{groupId}/share/{postId}")
    public ResponseEntity<?> sharePostToGroup(
            @PathVariable Long groupId,
            @PathVariable Long postId,
            @RequestHeader("Authorization") String token) {
        try {
            GroupMessageResponse saved = groupService.sharePost(
                token, groupId, postId);
            return ResponseEntity.ok(saved);  // ← return saved msg for frontend WS
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", e.getMessage()));
        }
    }
    
    @PostMapping("/{groupId}/broadcast")
    public ResponseEntity<?> broadcastToGroup(
            @PathVariable Long groupId,
            @RequestBody GroupMessageResponse msgResponse,
            @RequestHeader("Authorization") String token) {
        try {
            msgResponse.setEventType("MESSAGE");
            // reuse the WS broadcast logic via a service call
            groupService.broadcastMessage(token, groupId, msgResponse);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", e.getMessage()));
        }
    }
    
    
    // ── Get group info by invite code (no join) ───────────
    @GetMapping("/invite-info/{inviteCode}")
    public ResponseEntity<?> getGroupByInviteCode(
            @RequestHeader("Authorization") String token,
            @PathVariable String inviteCode) {
        try {
            String email = jwtUtil.extractEmail(
                token.substring(7));
            User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                    new RuntimeException("User not found"));
            Group group = groupRepository
                .findByInviteCode(inviteCode)
                .orElseThrow(() ->
                    new RuntimeException("Invalid invite code"));
            GroupResponse response = groupService
                .getGroupForInvite(token, group.getId());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", e.getMessage()));
        }
    }
    
}
