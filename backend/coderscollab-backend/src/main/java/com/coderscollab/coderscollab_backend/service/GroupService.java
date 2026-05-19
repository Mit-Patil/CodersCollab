/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.service;

import com.coderscollab.coderscollab_backend.dto.*;
import com.coderscollab.coderscollab_backend.entity.*;
import com.coderscollab.coderscollab_backend.repository.*;
import com.coderscollab.coderscollab_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final GroupJoinRequestRepository joinRequestRepository;
    private final GroupMessageReadRepository messageReadRepository;
    private final GroupMessageDeleteRepository messageDeleteRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PostRepository postRepository;
    private final PostImageRepository postImageRepository;
    private final JwtUtil jwtUtil;
    private final SimpMessagingTemplate messagingTemplate;

    private static final String UPLOAD_DIR =
        "D:/CodersCollab/backend/coderscollab-backend/uploads/";

    // ── Auth helper ────────────────────────────────────
    private User getUserFromToken(String token) {
        String email = jwtUtil.extractEmail(token.substring(7));
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void assertMember(Long groupId, Long userId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(
                groupId, userId))
            throw new RuntimeException("Not a member of this group");
    }

    private void assertAdmin(Long groupId, Long userId) {
        if (!groupMemberRepository.isAdmin(groupId, userId))
            throw new RuntimeException("Admin permission required");
    }
    
    private void broadcastGroupEvent(Long groupId, Map<String, Object> payload) {
    getMemberIds(groupId).forEach(memberId ->
        messagingTemplate.convertAndSend(
            "/topic/user/" + memberId + "/inbox", payload));
    }

    // ── Create group ───────────────────────────────────
    @Transactional
    public GroupResponse createGroup(String token,
            CreateGroupRequest req, MultipartFile avatar)
            throws IOException {
        User creator = getUserFromToken(token);

        // Handle avatar upload
        String avatarUrl = null;
        if (avatar != null && !avatar.isEmpty()) {
            avatarUrl = saveFile(avatar, "group-avatars");
        }
        int maxMembers = req.getMaxMembers() != null
            ? req.getMaxMembers() : 100;
        if (maxMembers < 3)
            throw new RuntimeException(
                "Group must allow at least 3 members");
        // ← ADD: Generate unique invite code
        String inviteCode = generateInviteCode();

        Group group = Group.builder()
            .name(req.getName())
            .description(req.getDescription())
            .avatarUrl(avatarUrl)
            .creator(creator)
            .maxMembers(req.getMaxMembers() != null
                ? req.getMaxMembers() : 100)
            .isPrivate(req.getIsPrivate() != null
                ? req.getIsPrivate() : false)
            .onlyAdminsCanSend(req.getOnlyAdminsCanSend() != null
                ? req.getOnlyAdminsCanSend() : false)
            .onlyAdminsCanAdd(req.getOnlyAdminsCanAdd() != null
                ? req.getOnlyAdminsCanAdd() : false)
            .inviteCode(inviteCode)  // ← ADD THIS
            .build();
        groupRepository.save(group);

        // Creator auto-becomes ADMIN
        GroupMember creatorMember = GroupMember.builder()
            .group(group).user(creator).role("ADMIN").build();
        groupMemberRepository.save(creatorMember);

        // Add initial members if provided
        if (req.getMemberIds() != null) {
            for (Long memberId : req.getMemberIds()) {
                if (!memberId.equals(creator.getId())) {
                    User member = userRepository
                        .findById(memberId).orElse(null);
                    if (member != null) {
                        groupMemberRepository.save(
                            GroupMember.builder()
                                .group(group).user(member)
                                .role("MEMBER").build());
                    }
                }
            }
        }
        

        return mapToGroupResponse(group, creator);
    }
    
    private String generateInviteCode() {
        return UUID.randomUUID().toString()
            .replace("-", "").substring(0, 10).toUpperCase();
    }

    // ── Get all groups for current user ────────────────
    public List<GroupResponse> getMyGroups(String token) {
        User user = getUserFromToken(token);
        return groupRepository.findGroupsByUserId(user.getId())
            .stream()
            .map(g -> mapToGroupResponse(g, user))
            .collect(Collectors.toList());
    }

    // ── Get group by id ────────────────────────────────
    public GroupResponse getGroup(String token, Long groupId) {
        User user = getUserFromToken(token);
        Group group = groupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Group not found"));
        return mapToGroupResponse(group, user);
    }
    
    public GroupResponse getGroupForInvite(
        String token, Long groupId) {
        User user = getUserFromToken(token);
        Group group = groupRepository.findById(groupId)
            .orElseThrow(() ->
                new RuntimeException("Group not found"));
        return mapToGroupResponse(group, user);
    }

    // ── Search public groups ───────────────────────────
    public List<GroupResponse> searchGroups(
            String token, String query) {
        User user = getUserFromToken(token);
        return groupRepository.searchPublicGroups(query)
            .stream()
            .map(g -> mapToGroupResponse(g, user))
            .collect(Collectors.toList());
    }

    // ── Join group ─────────────────────────────────────
    @Transactional
    public GroupResponse joinGroup(String token, Long groupId) {
        User user = getUserFromToken(token);
        Group group = groupRepository.findById(groupId)
            .orElseThrow(() ->
                new RuntimeException("Group not found"));

        // Already an active member
        if (groupMemberRepository.existsByGroupIdAndUserId(
                groupId, user.getId()))
            throw new RuntimeException("Already a member");

        long memberCount = groupMemberRepository
            .countByGroupId(groupId);
        if (memberCount >= group.getMaxMembers())
            throw new RuntimeException("Group is full");

        // Check existing join request
        Optional<GroupJoinRequest> existingReq =
            joinRequestRepository.findByGroupIdAndUserId(
                groupId, user.getId());

        if (Boolean.TRUE.equals(group.getIsPrivate())) {
        if (existingReq.isPresent()) {
            String status = existingReq.get().getStatus();
            if ("PENDING".equals(status)) {
                return mapToGroupResponse(group, user);
            }
            existingReq.get().setStatus("PENDING");
            joinRequestRepository.save(existingReq.get());
        } else {
            joinRequestRepository.save(GroupJoinRequest.builder()
                .group(group).user(user)
                .status("PENDING").build());
        }
    } else {
        if (existingReq.isPresent()) {
            joinRequestRepository.delete(existingReq.get());
        }
        groupMemberRepository.save(GroupMember.builder()
            .group(group).user(user).role("MEMBER").build());
    }
    return mapToGroupResponse(group, user);
    }

    // ── Leave group ────────────────────────────────────
    @Transactional
    public void leaveGroup(String token, Long groupId) {
        User user = getUserFromToken(token);
        assertMember(groupId, user.getId());

        if (groupMemberRepository.isAdmin(groupId, user.getId())) {
            long adminCount = groupMemberRepository
                .countByGroupIdAndRole(groupId, "ADMIN");
            long memberCount = groupMemberRepository
                .countByGroupId(groupId);
            if (adminCount == 1 && memberCount > 1) {
                throw new RuntimeException(
                    "Transfer admin role before leaving");
            }
        }

        groupMemberRepository.deleteByGroupIdAndUserId(
            groupId, user.getId());

        // ← ADD: also clean up their join request record
        joinRequestRepository.findByGroupIdAndUserId(
                groupId, user.getId())
            .ifPresent(joinRequestRepository::delete);

        if (groupMemberRepository.countByGroupId(groupId) == 0) {
            groupRepository.deleteById(groupId);
        }
    }

    // ── Get members ────────────────────────────────────
    public List<GroupMemberResponse> getMembers(
            String token, Long groupId) {
        User user = getUserFromToken(token);
        assertMember(groupId, user.getId());
        return groupMemberRepository
            .findByGroupIdOrderByRoleDesc(groupId)
            .stream()
            .map(this::mapToMemberResponse)
            .collect(Collectors.toList());
    }

    // ── Remove member (admin only) ─────────────────────
    @Transactional
    public void removeMember(String token,
            Long groupId, Long targetUserId) {
        User admin = getUserFromToken(token);
        assertAdmin(groupId, admin.getId());

        if (admin.getId().equals(targetUserId))
            throw new RuntimeException("Cannot remove yourself");

        if (!groupMemberRepository.existsByGroupIdAndUserId(
                groupId, targetUserId))
            throw new RuntimeException("User is not a member");

        groupMemberRepository.deleteByGroupIdAndUserId(
            groupId, targetUserId);
        broadcastGroupEvent(groupId, Map.of(
            "eventType", "MEMBER_LEFT",
            "groupId", groupId,
            "userId", targetUserId
        ));
    }

    // ── Promote/demote member (admin only) ─────────────
    @Transactional
    public GroupMemberResponse updateMemberRole(String token,
            Long groupId, Long targetUserId, String newRole) {
        User admin = getUserFromToken(token);
        assertAdmin(groupId, admin.getId());

        GroupMember member = groupMemberRepository
            .findByGroupIdAndUserId(groupId, targetUserId)
            .orElseThrow(() -> new RuntimeException("Member not found"));

        member.setRole(newRole);
        groupMemberRepository.save(member);
        broadcastGroupEvent(groupId, Map.of(
            "eventType", "MEMBER_ROLE_CHANGED",
            "groupId", groupId,
            "userId", targetUserId,
            "role", newRole
        ));
        return mapToMemberResponse(member);
    }

    // ── Add member (admin only if restricted) ──────────
    @Transactional
    public GroupMemberResponse addMember(String token,
            Long groupId, Long targetUserId) {
        User user = getUserFromToken(token);
        Group group = groupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Group not found"));

        assertMember(groupId, user.getId());

        if (Boolean.TRUE.equals(group.getOnlyAdminsCanAdd()))
            assertAdmin(groupId, user.getId());

        if (groupMemberRepository.existsByGroupIdAndUserId(
                groupId, targetUserId))
            throw new RuntimeException("Already a member");

        long count = groupMemberRepository.countByGroupId(groupId);
        if (count >= group.getMaxMembers())
            throw new RuntimeException(
                "Group is full (" + group.getMaxMembers()
                + "/" + group.getMaxMembers() + " members)");

        User target = userRepository.findById(targetUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        GroupMember member = GroupMember.builder()
            .group(group).user(target).role("MEMBER").build();
        groupMemberRepository.save(member);
        broadcastGroupEvent(groupId, Map.of(
            "eventType", "MEMBER_JOINED",
            "groupId", groupId,
            "userId", target.getId(),
            "username", target.getUsername()
        ));
        
        return mapToMemberResponse(member);
    }

    // ── Update group settings (admin only) ────────────
    @Transactional
    public GroupResponse updateGroup(String token, Long groupId,
            CreateGroupRequest req, MultipartFile avatar)
            throws IOException {
        User user = getUserFromToken(token);
        assertAdmin(groupId, user.getId());

        Group group = groupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Group not found"));

        if (req.getMaxMembers() != null) {
        if (req.getMaxMembers() < 3)
            throw new RuntimeException(
                "Group must allow at least 3 members");
        // Also check current count
        long currentCount = groupMemberRepository
            .countByGroupId(groupId);
        if (req.getMaxMembers() < currentCount)
            throw new RuntimeException(
                "Cannot set limit below current member count ("
                + currentCount + ")");
            group.setMaxMembers(req.getMaxMembers());
        }

        if (req.getName() != null)
            group.setName(req.getName());
        if (req.getDescription() != null)
            group.setDescription(req.getDescription());
        if (req.getIsPrivate() != null)
            group.setIsPrivate(req.getIsPrivate());
        if (req.getOnlyAdminsCanSend() != null)
            group.setOnlyAdminsCanSend(req.getOnlyAdminsCanSend());
        if (req.getOnlyAdminsCanAdd() != null)
            group.setOnlyAdminsCanAdd(req.getOnlyAdminsCanAdd());
        if (req.getMaxMembers() != null)
            group.setMaxMembers(req.getMaxMembers());

        if (avatar != null && !avatar.isEmpty()) {
            group.setAvatarUrl(saveFile(avatar, "group-avatars"));
        }

        groupRepository.save(group);
        return mapToGroupResponse(group, user);
    }

    // ── Delete group (admin only) ──────────────────────
    @Transactional
    public void deleteGroup(String token, Long groupId) {
        User user = getUserFromToken(token);
        assertAdmin(groupId, user.getId());
        groupRepository.deleteById(groupId);
    }

    // ── Join requests (admin only) ─────────────────────
    public List<GroupJoinRequestResponse> getJoinRequests(
            String token, Long groupId) {
        User user = getUserFromToken(token);
        assertAdmin(groupId, user.getId());
        return joinRequestRepository
            .findByGroupIdAndStatus(groupId, "PENDING")
            .stream()
            .map(this::mapToJoinRequestResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public void handleJoinRequest(String token, Long groupId,
            Long requesterId, boolean accept) {
            User admin = getUserFromToken(token);
            assertAdmin(groupId, admin.getId());

            GroupJoinRequest req = joinRequestRepository
                .findByGroupIdAndUserId(groupId, requesterId)
                .orElseThrow(() ->
                    new RuntimeException("Request not found"));

            if (accept) {
                req.setStatus("ACCEPTED");
                joinRequestRepository.save(req);
                groupMemberRepository.save(GroupMember.builder()
                    .group(req.getGroup())
                    .user(req.getUser())
                    .role("MEMBER").build());
            } else {
                req.setStatus("REJECTED");
                joinRequestRepository.save(req);
            }
        }

    @Transactional
    public GroupResponse joinGroupByInviteCode(
            String token, String inviteCode) {
        User user = getUserFromToken(token);

        Group group = groupRepository.findByInviteCode(inviteCode)
            .orElseThrow(() -> new RuntimeException(
                "Invalid invite code"));

        // Already an active member
        if (groupMemberRepository.existsByGroupIdAndUserId(
                group.getId(), user.getId()))
            throw new RuntimeException("Already a member");

        long memberCount = groupMemberRepository
            .countByGroupId(group.getId());
        if (memberCount >= group.getMaxMembers())
            throw new RuntimeException("Group is full");

        // Check existing join request
        Optional<GroupJoinRequest> existingReq =
            joinRequestRepository.findByGroupIdAndUserId(
                group.getId(), user.getId());

       if (Boolean.TRUE.equals(group.getIsPrivate())) {
            if (existingReq.isPresent()) {
                String status = existingReq.get().getStatus();
                if ("PENDING".equals(status)) {
                    // Don't throw — just return current state
                    // Frontend will see hasPendingRequest=true
                    return mapToGroupResponse(group, user);
                }
                // ACCEPTED or REJECTED — update to PENDING
                existingReq.get().setStatus("PENDING");
                joinRequestRepository.save(existingReq.get());
            } else {
                joinRequestRepository.save(GroupJoinRequest.builder()
                    .group(group).user(user)
                    .status("PENDING").build());
            }
        } else {
            if (existingReq.isPresent()) {
                joinRequestRepository.delete(existingReq.get());
            }
            groupMemberRepository.save(GroupMember.builder()
                .group(group).user(user).role("MEMBER").build());
        }
        return mapToGroupResponse(group, user);
    }
    
    public void broadcastMessage(String token, Long groupId,
        GroupMessageResponse msgResponse) {
        User user = getUserFromToken(token);
        assertMember(groupId, user.getId());
        msgResponse.setEventType("MESSAGE");
        messagingTemplate.convertAndSend(
            "/topic/group/" + groupId, msgResponse);
        getMemberIds(groupId).forEach(memberId ->
            messagingTemplate.convertAndSend(
                "/topic/user/" + memberId + "/inbox", msgResponse));
    }


    // ── Messages ───────────────────────────────────────
    public List<GroupMessageResponse> getMessages(
            String token, Long groupId) {
        User user = getUserFromToken(token);
        assertMember(groupId, user.getId());
        return groupMessageRepository
            .findByGroupIdOrderByTimestampAsc(groupId)
            .stream()
            .filter(m -> {
                if (Boolean.TRUE.equals(m.getIsDeleted())
                        && !Boolean.TRUE.equals(
                            m.getDeletedForEveryone())) {
                    return !messageDeleteRepository
                        .existsByMessageIdAndUserId(
                            m.getId(), user.getId());
                }
                return true;
            })
            .map(this::mapToMessageResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public GroupMessageResponse sendMessage(String token,
            Long groupId, String content, Long replyToId) {
        User user = getUserFromToken(token);
        Group group = groupRepository.findById(groupId)
            .orElseThrow(() ->
                new RuntimeException("Group not found"));

        assertMember(groupId, user.getId());

        // Check send permission
        if (Boolean.TRUE.equals(group.getOnlyAdminsCanSend())
                && !groupMemberRepository.isAdmin(
                    groupId, user.getId()))
            throw new RuntimeException(
                "Only admins can send messages");

        GroupMessage replyTo = replyToId != null
            ? groupMessageRepository.findById(replyToId)
                .orElse(null) : null;

        GroupMessage msg = GroupMessage.builder()
            .group(group).sender(user)
            .content(content).messageType("TEXT")
            .replyTo(replyTo)
            .isDeleted(false).isEdited(false)
            .build();
        groupMessageRepository.save(msg);
        return mapToMessageResponse(msg);
    }

    @Transactional
    public GroupMessageResponse sendMedia(String token,
            Long groupId, MultipartFile file, Long replyToId)
            throws IOException {
        User user = getUserFromToken(token);
        Group group = groupRepository.findById(groupId)
            .orElseThrow(() ->
                new RuntimeException("Group not found"));

        assertMember(groupId, user.getId());

        if (Boolean.TRUE.equals(group.getOnlyAdminsCanSend())
                && !groupMemberRepository.isAdmin(
                    groupId, user.getId()))
            throw new RuntimeException(
                "Only admins can send messages");

        String mediaUrl = saveFile(file, "chat-media");
        String contentType = file.getContentType();
        String mediaType = "FILE";
        if (contentType != null) {
            if (contentType.startsWith("image")) mediaType = "IMAGE";
            else if (contentType.startsWith("video")) mediaType = "VIDEO";
        }

        GroupMessage replyTo = replyToId != null
            ? groupMessageRepository.findById(replyToId)
                .orElse(null) : null;

        GroupMessage msg = GroupMessage.builder()
            .group(group).sender(user)
            .content(file.getOriginalFilename())
            .messageType(mediaType)
            .mediaUrl(mediaUrl).mediaType(mediaType)
            .replyTo(replyTo)
            .isDeleted(false).isEdited(false)
            .build();
        groupMessageRepository.save(msg);
        return mapToMessageResponse(msg);
    }
    
    @Transactional
    public GroupMessageResponse sharePost(String token, Long groupId, Long postId) {
        User user = getUserFromToken(token);
        assertMember(groupId, user.getId());

        Group group = groupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Group not found"));

        // ← ADD: check admin-only send permission
        if (Boolean.TRUE.equals(group.getOnlyAdminsCanSend())
                && !groupMemberRepository.isAdmin(groupId, user.getId()))
            throw new RuntimeException("Only admins can send messages");

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        GroupMessage msg = GroupMessage.builder()
            .group(group).sender(user)
            .content("Shared a post")
            .messageType("POST")
            .sharedPost(post)
            .isDeleted(false).isEdited(false)
            .build();
        groupMessageRepository.save(msg);
        return mapToMessageResponse(msg);  // ← return response for WS
    }

    @Transactional
    public GroupMessageResponse editMessage(String token,
            Long messageId, String newContent) {
        User user = getUserFromToken(token);
        GroupMessage msg = groupMessageRepository
            .findById(messageId)
            .orElseThrow(() ->
                new RuntimeException("Message not found"));

        if (!msg.getSender().getId().equals(user.getId()))
            throw new RuntimeException("Not authorized");

        msg.setContent(newContent);
        msg.setIsEdited(true);
        msg.setEditedAt(LocalDateTime.now());
        groupMessageRepository.save(msg);
        return mapToMessageResponse(msg);
    }

    @Transactional
    public void deleteMessage(String token,
            Long messageId, boolean forEveryone) {
        User user = getUserFromToken(token);
        GroupMessage msg = groupMessageRepository
            .findById(messageId)
            .orElseThrow(() ->
                new RuntimeException("Message not found"));

        boolean isOwner = msg.getSender().getId()
            .equals(user.getId());
        boolean isAdmin = groupMemberRepository.isAdmin(
            msg.getGroup().getId(), user.getId());

        if (!isOwner && !isAdmin)
            throw new RuntimeException("Not authorized");

        if (forEveryone) {
            msg.setIsDeleted(true);
            msg.setDeletedForEveryone(true);
            groupMessageRepository.save(msg);
        } else {
            messageDeleteRepository.save(
                GroupMessageDelete.builder()
                    .message(msg).user(user).build());
        }
    }

    public void markAsRead(String token, Long groupId) {
        User user = getUserFromToken(token);
        assertMember(groupId, user.getId());
        messageReadRepository.upsertLastRead(
            groupId, user.getId(), LocalDateTime.now());
    }

    // ── Helper methods for WS controller ──────────────
    public Long getGroupIdOfMessage(Long messageId) {
        return groupMessageRepository.findById(messageId)
            .map(m -> m.getGroup().getId()).orElse(null);
    }

    public List<Long> getMemberIds(Long groupId) {
        return groupMemberRepository
            .findByGroupIdOrderByRoleDesc(groupId)
            .stream()
            .map(m -> m.getUser().getId())
            .collect(Collectors.toList());
    }

    // ── File save helper ───────────────────────────────
    private String saveFile(MultipartFile file,
            String folder) throws IOException {
        String fileName = UUID.randomUUID()
            + "_" + file.getOriginalFilename();
        Path path = Paths.get(UPLOAD_DIR + folder);
        if (!Files.exists(path)) Files.createDirectories(path);
        Files.copy(file.getInputStream(),
            path.resolve(fileName),
            StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/" + folder + "/" + fileName;
    }

    // ── Mappers ────────────────────────────────────────
    
    private GroupJoinRequestResponse mapToJoinRequestResponse(
        GroupJoinRequest req) {
        UserProfile profile = userProfileRepository
            .findByUserId(req.getUser().getId())
            .orElse(new UserProfile());
        return GroupJoinRequestResponse.builder()
            .id(req.getId())
            .groupId(req.getGroup().getId())
            .groupName(req.getGroup().getName())
            .userId(req.getUser().getId())
            .username(req.getUser().getUsername())
            .fullName(profile.getFullName())
            .profilePictureUrl(profile.getProfilePictureUrl())
            .status(req.getStatus())
            .requestedAt(req.getRequestedAt())
            .build();
    }
    
    private GroupResponse mapToGroupResponse(
            Group group, User currentUser) {
        boolean isMember = groupMemberRepository
            .existsByGroupIdAndUserId(
                group.getId(), currentUser.getId());
        boolean isAdmin = isMember && groupMemberRepository
            .isAdmin(group.getId(), currentUser.getId());

        System.out.println("[mapToGroupResponse] groupId=" + group.getId()
            + " userId=" + currentUser.getId()
            + " isMember=" + isMember
            + " isAdmin=" + isAdmin);

        String role = isMember
            ? (isAdmin ? "ADMIN" : "MEMBER") : null;

        // ← Replace old hasPendingRequest with full request check
        boolean hasPendingRequest = false;
        boolean isRejected = false;

        if (!isMember) {
            Optional<GroupJoinRequest> existingReq =
                joinRequestRepository.findByGroupIdAndUserId(
                    group.getId(), currentUser.getId());
            if (existingReq.isPresent()) {
                String reqStatus = existingReq.get().getStatus();
                hasPendingRequest = "PENDING".equals(reqStatus);
                isRejected = "REJECTED".equals(reqStatus);
            }
        }

        long memberCount = groupMemberRepository
            .countByGroupId(group.getId());
        long unreadCount = isMember
            ? groupMessageRepository.countUnreadMessages(
                group.getId(), currentUser.getId()) : 0;

        Optional<GroupMessage> lastMsg = groupMessageRepository
            .findLastMessage(group.getId());

        return GroupResponse.builder()
            .id(group.getId())
            .name(group.getName())
            .description(group.getDescription())
            .avatarUrl(group.getAvatarUrl())
            .creatorId(group.getCreator() != null
                ? group.getCreator().getId() : null)
            .creatorUsername(group.getCreator() != null
                ? group.getCreator().getUsername() : null)
            .maxMembers(group.getMaxMembers())
            .isPrivate(group.getIsPrivate())
            .onlyAdminsCanSend(group.getOnlyAdminsCanSend())
            .onlyAdminsCanAdd(group.getOnlyAdminsCanAdd())
            .createdAt(group.getCreatedAt())
            .inviteCode(isMember ? group.getInviteCode() : null)
            .isMember(isMember)
            .isAdmin(isAdmin)
            .currentUserRole(role)
            .hasPendingRequest(hasPendingRequest)
            .isRejected(isRejected)          // ← ADD
            .memberCount(memberCount)
            .unreadCount(unreadCount)
            .lastMessage(lastMsg.map(m ->
                Boolean.TRUE.equals(m.getDeletedForEveryone())
                    ? "This message was deleted"
                    : "IMAGE".equals(m.getMessageType()) ? "📷 Image"
                    : "VIDEO".equals(m.getMessageType()) ? "🎥 Video"
                    : "FILE".equals(m.getMessageType()) ? "📎 File"
                    : "POST".equals(m.getMessageType())
                        ? "Shared a post"
                    : m.getContent()).orElse("No messages yet"))
            .lastMessageTime(lastMsg
                .map(GroupMessage::getTimestamp).orElse(null))
            .build();
    }

    private GroupMemberResponse mapToMemberResponse(
            GroupMember member) {
        UserProfile profile = userProfileRepository
            .findByUserId(member.getUser().getId())
            .orElse(new UserProfile());
        return GroupMemberResponse.builder()
            .id(member.getId())
            .userId(member.getUser().getId())
            .username(member.getUser().getUsername())
            .fullName(profile.getFullName())
            .profilePictureUrl(profile.getProfilePictureUrl())
            .role(member.getRole())
            .nickname(member.getNickname())
            .muted(member.getMuted())
            .mutedUntil(member.getMutedUntil())
            .joinedAt(member.getJoinedAt())
            .build();
    }

    @Transactional
    public GroupMessageResponse mapToMessageResponse(
            GroupMessage msg) {
        UserProfile senderProfile = userProfileRepository
            .findByUserId(msg.getSender().getId())
            .orElse(new UserProfile());

        GroupMessageResponse.GroupMessageResponseBuilder b =
            GroupMessageResponse.builder()
                .id(msg.getId())
                .groupId(msg.getGroup().getId())
                .senderId(msg.getSender().getId())
                .senderUsername(msg.getSender().getUsername())
                .senderProfilePicture(
                    senderProfile.getProfilePictureUrl())
                .content(Boolean.TRUE.equals(
                    msg.getDeletedForEveryone())
                    ? "This message was deleted"
                    : msg.getContent())
                .messageType(msg.getMessageType())
                .mediaUrl(msg.getMediaUrl())
                .mediaType(msg.getMediaType())
                .isDeleted(msg.getIsDeleted())
                .deletedForEveryone(msg.getDeletedForEveryone())
                .isEdited(msg.getIsEdited())
                .editedAt(msg.getEditedAt())
                .timestamp(msg.getTimestamp());

        if (msg.getReplyTo() != null) {
            GroupMessage r = msg.getReplyTo();
            b.replyToId(r.getId())
             .replyToSenderUsername(r.getSender().getUsername())
             .replyToContent(Boolean.TRUE.equals(
                 r.getDeletedForEveryone())
                 ? "This message was deleted"
                 : "IMAGE".equals(r.getMessageType())
                     ? "📷 Image"
                 : "VIDEO".equals(r.getMessageType())
                     ? "🎥 Video"
                 : "FILE".equals(r.getMessageType())
                     ? "📎 " + r.getContent()
                 : r.getContent());
        }

        if ("POST".equals(msg.getMessageType())
                && msg.getSharedPost() != null) {
            Post post = msg.getSharedPost();
            UserProfile postOwner = userProfileRepository
                .findByUserId(post.getUser().getId())
                .orElse(new UserProfile());
            List<String> imgs = postImageRepository
                .findByPostIdOrderByDisplayOrderAsc(post.getId())
                .stream().map(PostImage::getImageUrl)
                .collect(Collectors.toList());
            b.sharedPostId(post.getId())
             .sharedPostContent(post.getContent())
             .sharedPostType(post.getPostType())
             .sharedPostUsername(post.getUser().getUsername())
             .sharedPostImageUrls(imgs);
        }

        return b.build();
    }
}
