/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */



/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.service;

import com.coderscollab.coderscollab_backend.dto.*;
import com.coderscollab.coderscollab_backend.entity.*;
import com.coderscollab.coderscollab_backend.repository.*;
import com.coderscollab.coderscollab_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.coderscollab.coderscollab_backend.entity.User;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final FollowerRepository followerRepository;

    private static final String UPLOAD_DIR = "D:/CodersCollab/backend/coderscollab-backend/uploads/profile-pictures/";

    private User getUserFromToken(String token) {
        String email = jwtUtil.extractEmail(token.substring(7));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public UserProfileResponse getProfile(String token) {
        User user = getUserFromToken(token);
        UserProfile profile = userProfileRepository
                .findByUserId(user.getId())
                .orElse(new UserProfile());
        return mapToResponse(user, profile);
    }

    public UserProfileResponse updateProfile(String token,
                                         UserProfileRequest request) {
    User user = getUserFromToken(token);

    UserProfile profile = userProfileRepository
            .findByUserId(user.getId())
            .orElse(UserProfile.builder().user(user).build());

    profile.setFullName(request.getFullName());
    profile.setBio(request.getBio());
    profile.setLocation(request.getLocation());
    profile.setWebsiteUrl(request.getWebsiteUrl());
    profile.setGithubUrl(request.getGithubUrl());
    profile.setLinkedinUrl(request.getLinkedinUrl());
    profile.setMasterStack(request.getMasterStack());
    profile.setSkills(request.getSkills());
    profile.setYearsOfExperience(request.getYearsOfExperience());
    profile.setAvailableForCollab(request.getAvailableForCollab());
    profile.setUpdatedAt(LocalDateTime.now());

    if (request.getIsPrivate() != null) {
        user.setIsPrivate(request.getIsPrivate());
        userRepository.save(user);
    }

    userProfileRepository.save(profile);
    return mapToResponse(user, profile);
}

    public UserProfileResponse uploadPicture(String token,
                                             MultipartFile file) throws IOException {
        User user = getUserFromToken(token);

        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path uploadPath = Paths.get(UPLOAD_DIR);

        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        Files.copy(file.getInputStream(),
                uploadPath.resolve(fileName),
                StandardCopyOption.REPLACE_EXISTING);

        String fileUrl = "/uploads/profile-pictures/" + fileName;

    UserProfile profile = userProfileRepository
            .findByUserId(user.getId())
            .orElse(UserProfile.builder().user(user).build());
    User profileUser = profile.getUser() != null
            ? profile.getUser() : user;

        profile.setProfilePictureUrl(fileUrl);
        profile.setUpdatedAt(LocalDateTime.now());
        userProfileRepository.save(profile);

        return mapToResponse(user, profile);
    }
public List<UserProfileResponse> exploreUsers(String token, String search,
        String stack, String skill, Boolean availableForCollab) {

    User currentUser = getUserFromToken(token);

    return userProfileRepository.findAll()
            .stream()
            .filter(profile -> !profile.getUser().getId()
                    .equals(currentUser.getId()))
            .filter(profile -> {
                if (search == null || search.isEmpty()) return true;
                String q = search.toLowerCase();
                String username = profile.getUser().getUsername()
                        .toLowerCase();
                String email = profile.getUser().getEmail().toLowerCase();
                String fullName = profile.getFullName() != null
                        ? profile.getFullName().toLowerCase() : "";
                return username.contains(q)
                        || email.contains(q)
                        || fullName.contains(q);
            })
            .filter(profile -> {
                if (stack == null || stack.isEmpty()) return true;
                return profile.getMasterStack() != null
                        && profile.getMasterStack().toLowerCase()
                                .contains(stack.toLowerCase());
            })
            .filter(profile -> {
                if (skill == null || skill.isEmpty()) return true;
                if (profile.getSkills() == null) return false;
                return profile.getSkills().stream()
                        .anyMatch(s -> s.toLowerCase()
                                .contains(skill.toLowerCase()));
            })
            .filter(profile -> {
                if (availableForCollab == null) return true;
                return profile.getAvailableForCollab() != null
                        && profile.getAvailableForCollab()
                                .equals(availableForCollab);
            })
            .map(profile -> mapToResponse(
                    profile.getUser(), profile))
            .collect(Collectors.toList());
}


    public List<UserProfileResponse> searchUsers(String token, String q) {
        return userRepository
            .findByUsernameContainingIgnoreCase(q)
            .stream()
            .limit(10)
            .map(u -> {
                UserProfile p = userProfileRepository
                    .findByUserId(u.getId())
                    .orElse(new UserProfile());
                return UserProfileResponse.builder()
                    .id(u.getId())
                    .username(u.getUsername())
                    .fullName(p.getFullName())
                    .profilePictureUrl(p.getProfilePictureUrl())
                    .build();
            })
            .collect(Collectors.toList());
    }

public UserProfileResponse getUserProfile(String token,
        String username) {
    User targetUser = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

    UserProfile profile = userProfileRepository
            .findByUserId(targetUser.getId())
            .orElse(new UserProfile());

    boolean isPrivate = Boolean.TRUE.equals(targetUser.getIsPrivate());
    boolean isOwnProfile = false;
    boolean isFollower = false;

    if (token != null && !token.isEmpty()) {
        try {
            String email = jwtUtil.extractEmail(token.substring(7));
            User currentUser = userRepository.findByEmail(email)
                    .orElse(null);
            if (currentUser != null) {
                isOwnProfile = currentUser.getId()
                        .equals(targetUser.getId());
                isFollower = followerRepository
                        .existsByFollowerIdAndFollowingId(
                                currentUser.getId(),
                                targetUser.getId());
            }
        } catch (Exception e) { }
    }

    if (isPrivate && !isOwnProfile && !isFollower) {
        return UserProfileResponse.builder()
                .id(targetUser.getId())
                .username(targetUser.getUsername())
                .profilePictureUrl(profile.getProfilePictureUrl())
                .isPrivate(true)
                .build();
    }

    UserProfileResponse response = mapToResponse(targetUser, profile);
    response.setIsPrivate(isPrivate);
    return response;
}
    private UserProfileResponse mapToResponse(User user, UserProfile profile) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(profile.getFullName())
                .bio(profile.getBio())
                .profilePictureUrl(profile.getProfilePictureUrl())
                .location(profile.getLocation())
                .websiteUrl(profile.getWebsiteUrl())
                .githubUrl(profile.getGithubUrl())
                .linkedinUrl(profile.getLinkedinUrl())
                .masterStack(profile.getMasterStack())
                .skills(profile.getSkills())
                .yearsOfExperience(profile.getYearsOfExperience())
                .availableForCollab(profile.getAvailableForCollab())
                .build();
    }
}
