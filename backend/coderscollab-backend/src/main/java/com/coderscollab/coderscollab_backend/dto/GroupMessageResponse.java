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
@NoArgsConstructor
@AllArgsConstructor
public class GroupMessageResponse {
    private Long id;
    private Long groupId;
    private Long senderId;
    private String senderUsername;
    private String senderProfilePicture;
    private String content;
    private String messageType;
    private String mediaUrl;
    private String mediaType;
    private Boolean isDeleted;
    private Boolean deletedForEveryone;
    private Boolean isEdited;
    private LocalDateTime editedAt;
    private LocalDateTime timestamp;
    private String eventType; // MESSAGE, EDIT, DELETE, READ

    // Reply
    private Long replyToId;
    private String replyToContent;
    private String replyToSenderUsername;
    private String replyToMediaType;

    // Shared post
    private Long sharedPostId;
    private String sharedPostContent;
    private String sharedPostType;
    private String sharedPostUsername;
    private List<String> sharedPostImageUrls;
}
