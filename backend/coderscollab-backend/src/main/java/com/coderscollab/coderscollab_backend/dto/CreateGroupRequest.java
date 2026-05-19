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
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateGroupRequest {
    private String name;
    private String description;
    private Boolean isPrivate = false;
    private Boolean onlyAdminsCanSend = false;
    private Boolean onlyAdminsCanAdd = false;
    private Integer maxMembers = 100;
    private List<Long> memberIds; // optional initial members
}
