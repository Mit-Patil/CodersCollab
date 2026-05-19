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
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessagingService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MessageDeleteRepository messageDeleteRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PostRepository postRepository;
    private final PostImageRepository postImageRepository;
    private final JwtUtil jwtUtil;

    private static final String UPLOAD_DIR =
        "D:/CodersCollab/backend/coderscollab-backend/uploads/chat-media/";

    private User getUserFromToken(String token) {
        String email = jwtUtil.extractEmail(token.substring(7));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ── Helper methods for controllers ────────────────────────────────────

    /** Returns the ID of the OTHER user in a conversation (not the token owner) */
    public Long getOtherUserId(String token, Long conversationId) {
        try {
            User currentUser = getUserFromToken(token);
            Conversation conv = conversationRepository.findById(conversationId).orElse(null);
            if (conv == null) return null;
            return conv.getUser1().getId().equals(currentUser.getId())
                ? conv.getUser2().getId()
                : conv.getUser1().getId();
        } catch (Exception e) { return null; }
    }

    /** Returns the sender's user ID for a given message */
    public Long getSenderIdOfMessage(Long messageId) {
        try {
            return messageRepository.findById(messageId)
                .map(m -> m.getSender().getId())
                .orElse(null);
        } catch (Exception e) { return null; }
    }

    /** Returns the conversationId for a given message */
    public Long getConversationIdOfMessage(Long messageId) {
        try {
            return messageRepository.findById(messageId)
                .map(m -> m.getConversation().getId())
                .orElse(null);
        } catch (Exception e) { return null; }
    }

    // ── Conversations ──────────────────────────────────────────────────────

    public ConversationResponse getOrCreateConversation(String token, Long otherUserId) {
        User currentUser = getUserFromToken(token);
        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Conversation conversation = conversationRepository
                .findByUsers(currentUser.getId(), otherUserId)
                .orElseGet(() -> {
                    Conversation newConv = Conversation.builder()
                            .user1(currentUser).user2(otherUser)
                            .createdAt(LocalDateTime.now()).build();
                    return conversationRepository.save(newConv);
                });
        return mapToConversationResponse(conversation, currentUser);
    }

    public List<ConversationResponse> getAllConversations(String token) {
        User currentUser = getUserFromToken(token);
        return conversationRepository.findAllByUserId(currentUser.getId())
                .stream()
                .map(conv -> mapToConversationResponse(conv, currentUser))
                .collect(Collectors.toList());
    }

    // ── Messages ───────────────────────────────────────────────────────────

    public List<MessageResponse> getMessages(String token, Long conversationId) {
        User currentUser = getUserFromToken(token);
        // REMOVED: messageRepository.markAllAsRead(conversationId, currentUser.getId());
        return messageRepository
                .findByConversationIdOrderByTimestampAsc(conversationId)
                .stream()
                .filter(m -> {
                    if (Boolean.TRUE.equals(m.getIsDeleted())
                            && !Boolean.TRUE.equals(m.getDeletedForEveryone())) {
                        return !messageDeleteRepository
                                .existsByMessageIdAndUserId(m.getId(), currentUser.getId());
                    }
                    return true;
                })
                .map(m -> mapToMessageResponse(m, currentUser))
                .collect(Collectors.toList());
    }

    public MessageResponse sendMessage(String token, Long conversationId,
            String content, Long replyToId) {
        User currentUser = getUserFromToken(token);
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        Message replyTo = replyToId != null
                ? messageRepository.findById(replyToId).orElse(null) : null;
        Message message = Message.builder()
                .conversation(conversation).sender(currentUser)
                .content(content).messageType("TEXT").replyTo(replyTo)
                .isRead(false).isDeleted(false).isEdited(false)
                .timestamp(LocalDateTime.now()).build();
        messageRepository.save(message);
        return mapToMessageResponse(message, currentUser);
    }

    public MessageResponse sendSharedPost(String token, Long conversationId, Long postId) {
        User currentUser = getUserFromToken(token);
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        Message message = Message.builder()
                .conversation(conversation).sender(currentUser)
                .content("Shared a post").messageType("POST").sharedPost(post)
                .isRead(false).isDeleted(false).isEdited(false)
                .timestamp(LocalDateTime.now()).build();
        messageRepository.save(message);
        return mapToMessageResponse(message, currentUser);
    }

    public MessageResponse sendMedia(String token, Long conversationId,
            MultipartFile file, Long replyToId) throws IOException {
        User currentUser = getUserFromToken(token);
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        String originalName = file.getOriginalFilename();
        String fileName = UUID.randomUUID() + "_" + originalName;
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
        Files.copy(file.getInputStream(), uploadPath.resolve(fileName),
                StandardCopyOption.REPLACE_EXISTING);
        String mediaUrl = "/uploads/chat-media/" + fileName;
        String contentType = file.getContentType();
        String mediaType = "FILE";
        if (contentType != null) {
            if (contentType.startsWith("image")) mediaType = "IMAGE";
            else if (contentType.startsWith("video")) mediaType = "VIDEO";
        }
        Message replyTo = replyToId != null
                ? messageRepository.findById(replyToId).orElse(null) : null;
        Message message = Message.builder()
                .conversation(conversation).sender(currentUser)
                .content(originalName).messageType(mediaType)
                .mediaUrl(mediaUrl).mediaType(mediaType).replyTo(replyTo)
                .isRead(false).isDeleted(false).isEdited(false)
                .timestamp(LocalDateTime.now()).build();
        messageRepository.save(message);
        return mapToMessageResponse(message, currentUser);
    }

    public MessageResponse forwardMessage(String token, Long messageId, Long targetConvId) {
        User currentUser = getUserFromToken(token);
        Message original = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        Conversation conversation = conversationRepository.findById(targetConvId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        Message forwarded = Message.builder()
                .conversation(conversation).sender(currentUser)
                .content(original.getContent()).messageType(original.getMessageType())
                .mediaUrl(original.getMediaUrl()).mediaType(original.getMediaType())
                .sharedPost(original.getSharedPost())
                .isRead(false).isDeleted(false).isEdited(false)
                .timestamp(LocalDateTime.now()).build();
        messageRepository.save(forwarded);
        return mapToMessageResponse(forwarded, currentUser);
    }

    public MessageResponse editMessage(String token, Long messageId, String newContent) {
        User currentUser = getUserFromToken(token);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        if (!message.getSender().getId().equals(currentUser.getId()))
            throw new RuntimeException("Not authorized");
        message.setContent(newContent);
        message.setIsEdited(true);
        message.setEditedAt(LocalDateTime.now());
        messageRepository.save(message);
        return mapToMessageResponse(message, currentUser);
    }

    public void deleteMessage(String token, Long messageId, boolean forEveryone) {
        User currentUser = getUserFromToken(token);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        if (forEveryone) {
            if (!message.getSender().getId().equals(currentUser.getId()))
                throw new RuntimeException("Not authorized");
            message.setIsDeleted(true);
            message.setDeletedForEveryone(true);
            messageRepository.save(message);
        } else {
            messageDeleteRepository.save(MessageDelete.builder()
                .message(message).user(currentUser)
                .createdAt(LocalDateTime.now()).build());
        }
    }

    public void markAsRead(String token, Long conversationId) {
        User currentUser = getUserFromToken(token);
        messageRepository.markAllAsRead(conversationId, currentUser.getId());
    }

    // ── Mappers ────────────────────────────────────────────────────────────

    private ConversationResponse mapToConversationResponse(Conversation conv, User currentUser) {
        User otherUser = conv.getUser1().getId().equals(currentUser.getId())
                ? conv.getUser2() : conv.getUser1();
        UserProfile otherProfile = userProfileRepository
                .findByUserId(otherUser.getId()).orElse(new UserProfile());
        String lastMessage = messageRepository.findLastMessage(conv.getId())
                .map(m -> {
                    if (Boolean.TRUE.equals(m.getDeletedForEveryone())) return "This message was deleted";
                    if ("POST".equals(m.getMessageType()))   return "Shared a post";
                    if ("IMAGE".equals(m.getMessageType()))  return "📷 Image";
                    if ("VIDEO".equals(m.getMessageType()))  return "🎥 Video";
                    if ("FILE".equals(m.getMessageType()))   return "📎 " + m.getContent();
                    return m.getContent();
                }).orElse("No messages yet");
        LocalDateTime lastMessageTime = messageRepository.findLastMessage(conv.getId())
                .map(Message::getTimestamp).orElse(conv.getCreatedAt());
        long unreadCount = messageRepository
                .countByConversationIdAndIsReadFalseAndSenderIdNot(conv.getId(), currentUser.getId());
        return ConversationResponse.builder()
                .id(conv.getId()).otherUserId(otherUser.getId())
                .otherUsername(otherUser.getUsername())
                .otherFullName(otherProfile.getFullName())
                .otherProfilePicture(otherProfile.getProfilePictureUrl())
                .lastMessage(lastMessage).lastMessageTime(lastMessageTime)
                .unreadCount(unreadCount).build();
    }

    private MessageResponse mapToMessageResponse(Message message, User currentUser) {
        UserProfile senderProfile = userProfileRepository
                .findByUserId(message.getSender().getId()).orElse(new UserProfile());
        MessageResponse.MessageResponseBuilder builder = MessageResponse.builder()
                .id(message.getId())
                .content(Boolean.TRUE.equals(message.getDeletedForEveryone())
                        ? "This message was deleted" : message.getContent())
                .isRead(message.getIsRead())
                .timestamp(message.getTimestamp())
                .senderId(message.getSender().getId())
                .senderUsername(message.getSender().getUsername())
                .senderProfilePicture(senderProfile.getProfilePictureUrl())
                .conversationId(message.getConversation().getId())
                .messageType(message.getMessageType() != null ? message.getMessageType() : "TEXT")
                .isDeleted(message.getIsDeleted())
                .deletedForEveryone(message.getDeletedForEveryone())
                .isEdited(message.getIsEdited())
                .editedAt(message.getEditedAt())
                .mediaUrl(message.getMediaUrl())
                .mediaType(message.getMediaType());

        if (message.getReplyTo() != null) {
            Message r = message.getReplyTo();
            builder.replyToId(r.getId())
                    .replyToSenderUsername(r.getSender().getUsername())
                    .replyToContent(Boolean.TRUE.equals(r.getDeletedForEveryone())
                        ? "This message was deleted"
                        : "IMAGE".equals(r.getMessageType()) ? "📷 Image"
                        : "VIDEO".equals(r.getMessageType()) ? "🎥 Video"
                        : "FILE".equals(r.getMessageType())  ? "📎 " + r.getContent()
                        : r.getContent())
                    .replyToMediaUrl(r.getMediaUrl())
                    .replyToMediaType(r.getMediaType());
        }

        if ("POST".equals(message.getMessageType()) && message.getSharedPost() != null) {
            Post post = message.getSharedPost();
            UserProfile postOwnerProfile = userProfileRepository
                    .findByUserId(post.getUser().getId()).orElse(new UserProfile());
            List<String> imageUrls = postImageRepository
                    .findByPostIdOrderByDisplayOrderAsc(post.getId())
                    .stream().map(PostImage::getImageUrl).collect(Collectors.toList());
            builder.sharedPostId(post.getId())
                    .sharedPostContent(post.getContent())
                    .sharedPostType(post.getPostType())
                    .sharedPostUsername(post.getUser().getUsername())
                    .sharedPostProfilePicture(postOwnerProfile.getProfilePictureUrl())
                    .sharedPostImageUrls(imageUrls);
        }

        return builder.build();
    }
}