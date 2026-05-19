/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupResponse {
    private Long id;
    private String name;
    private String description;
    private String avatarUrl;
    private Long creatorId;
    private String creatorUsername;
    private Integer maxMembers;
    private Boolean isPrivate;
    private Boolean onlyAdminsCanSend;
    private Boolean onlyAdminsCanAdd;
    private LocalDateTime createdAt;
    
    private String inviteCode;  // ← ADD THIS
    
    // Current user context
    @JsonProperty("isMember")
    private boolean isMember;
    
    @JsonProperty("isAdmin")
    private boolean isAdmin;
    
    private String currentUserRole;
    
    @JsonProperty("hasPendingRequest")
    private boolean hasPendingRequest;
    
    @JsonProperty("isRejected")
    private boolean isRejected;
    
    // Stats
    private long memberCount;
    private long unreadCount;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
}