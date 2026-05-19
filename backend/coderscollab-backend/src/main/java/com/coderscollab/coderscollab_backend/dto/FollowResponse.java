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
@AllArgsConstructor
@NoArgsConstructor
public class FollowResponse {
    private Long userId;
    private String username;
    private String fullName;
    private String profilePictureUrl;
    private boolean following;
    private long followerCount;
    private long followingCount;
    private boolean pending;
    private boolean privateAccount;
}
