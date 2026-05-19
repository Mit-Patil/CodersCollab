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

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ConversationResponse {
    private Long id;
    private Long otherUserId;
    private String otherUsername;
    private String otherFullName;
    private String otherProfilePicture;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private long unreadCount;
    private boolean isOnline;
}
