/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */



/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class UserProfileRequest {
    private String fullName;
    private String bio;
    private String location;
    private String websiteUrl;
    private String githubUrl;
    private String linkedinUrl;
    private String masterStack;
    private List<String> skills;
    private Integer yearsOfExperience;
    private Boolean availableForCollab;
    private Boolean isPrivate;
}
