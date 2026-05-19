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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private String type;            // MESSAGE, TYPING, READ, DELETE, EDIT
    private Long conversationId;
    private Long messageId;         // for EDIT / DELETE
    private String content;
    private String senderUsername;
    private Long senderId;
    private Long replyToId;
    private Boolean forEveryone;    // for DELETE — true = delete for everyone
}