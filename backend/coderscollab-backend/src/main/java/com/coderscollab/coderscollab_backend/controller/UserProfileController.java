/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */



/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.controller;

import com.coderscollab.coderscollab_backend.dto.*;
import com.coderscollab.coderscollab_backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping
    public ResponseEntity<UserProfileResponse> getProfile(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(userProfileService.getProfile(token));
    }

    @PutMapping
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestHeader("Authorization") String token,
            @RequestBody UserProfileRequest request) {
        return ResponseEntity.ok(
                userProfileService.updateProfile(token, request));
    }

    @PostMapping("/picture")
    public ResponseEntity<UserProfileResponse> uploadPicture(
            @RequestHeader("Authorization") String token,
            @RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.ok(
                userProfileService.uploadPicture(token, file));
    }

    @GetMapping("/explore")
    public ResponseEntity<List<UserProfileResponse>> exploreUsers(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String stack,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) Boolean availableForCollab) {
        return ResponseEntity.ok(userProfileService.exploreUsers(
                token, search, stack, skill, availableForCollab));
    }
    
    @GetMapping("/{username}")
    public ResponseEntity<UserProfileResponse> getUserProfile(
        @RequestHeader(value = "Authorization",
            required = false) String token,
        @PathVariable String username) {
    return ResponseEntity.ok(
            userProfileService.getUserProfile(token, username));
    }
    
        @GetMapping("/search")
    public ResponseEntity<List<UserProfileResponse>> searchUsers(
            @RequestParam String q,
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(
            userProfileService.searchUsers(token, q));
    }
    
    
}