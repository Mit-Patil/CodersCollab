/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MessageResponse {
    private Long id;
    private String content;
    private Boolean isRead;
    private LocalDateTime timestamp;
    private Long senderId;
    private String senderUsername;
    private String senderProfilePicture;
    private Long conversationId;
    private String messageType;

    // Shared post fields
    private Long sharedPostId;
    private String sharedPostContent;
    private String sharedPostType;
    private String sharedPostUsername;
    private String sharedPostProfilePicture;
    private List<String> sharedPostImageUrls;

    // State flags
    private Boolean isDeleted;
    private Boolean deletedForEveryone;
    private Boolean isEdited;
    private LocalDateTime editedAt;

    // Media
    private String mediaUrl;
    private String mediaType;

    // Reply-to
    private Long replyToId;
    private String replyToContent;
    private String replyToSenderUsername;
    private String replyToMediaUrl;
    private String replyToMediaType;

    /**
     * NEW FIELD: tells the frontend what kind of WS event this is.
     * Values: "MESSAGE" | "EDIT" | "DELETE" | "READ"
     * Not persisted — only used in WS broadcasts.
     */
    private String eventType;
}