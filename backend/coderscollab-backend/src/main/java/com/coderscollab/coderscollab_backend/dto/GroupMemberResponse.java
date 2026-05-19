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
@NoArgsConstructor
@AllArgsConstructor
public class GroupMemberResponse {
    private Long id;
    private Long userId;
    private String username;
    private String fullName;
    private String profilePictureUrl;
    private String role;
    private String nickname;
    private Boolean muted;
    private LocalDateTime mutedUntil;
    private LocalDateTime joinedAt;
}
