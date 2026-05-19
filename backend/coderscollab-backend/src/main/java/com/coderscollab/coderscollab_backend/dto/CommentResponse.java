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
public class CommentResponse {
    private Long id;
    private String content;
    private LocalDateTime createdAt;
    private Long userId;
    private String username;
    private String fullName;
    private String profilePictureUrl;
    private Long parentId;
    private boolean liked;
    private long likeCount;
    private List<CommentResponse> replies;
}
