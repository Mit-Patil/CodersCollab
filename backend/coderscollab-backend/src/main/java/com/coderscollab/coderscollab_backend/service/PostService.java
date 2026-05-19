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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PostImageRepository postImageRepository;
    private final JwtUtil jwtUtil;
    private final FollowerRepository followerRepository;

    private static final String UPLOAD_DIR =
        "D:/CodersCollab/backend/coderscollab-backend/uploads/post-images/";

    private User getUserFromToken(String token) {
        String email = jwtUtil.extractEmail(token.substring(7));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public PostResponse createPost(String token, PostRequest request) {
        User user = getUserFromToken(token);

        Post post = Post.builder()
                .user(user)
                .content(request.getContent())
                .postType(request.getPostType() != null
                        ? request.getPostType() : "TEXT")
                .language(request.getLanguage())
                .visibility(request.getVisibility() != null
                        ? request.getVisibility() : "PUBLIC")
                .likesCount(0)
                .createdAt(LocalDateTime.now())
                .build();

        postRepository.save(post);
        return mapToResponse(post, user);
    }

    public PostResponse createImagePost(String token, String content,
            String visibility, List<MultipartFile> files) throws IOException {
        User user = getUserFromToken(token);

        Post post = Post.builder()
                .user(user)
                .content(content)
                .postType("IMAGE")
                .visibility(visibility != null ? visibility : "PUBLIC")
                .likesCount(0)
                .createdAt(LocalDateTime.now())
                .build();

        postRepository.save(post);

        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            String fileName = UUID.randomUUID() + "_"
                    + file.getOriginalFilename();
            Files.copy(file.getInputStream(),
                    uploadPath.resolve(fileName),
                    StandardCopyOption.REPLACE_EXISTING);

            PostImage image = PostImage.builder()
                    .post(post)
                    .imageUrl("/uploads/post-images/" + fileName)
                    .displayOrder(i)
                    .createdAt(LocalDateTime.now())
                    .build();

            postImageRepository.save(image);
        }

        return mapToResponse(post, user);
    }

  public List<PostResponse> getAllPosts(String token) {
    User currentUser = getUserFromToken(token);

    List<Long> followingIds = followerRepository
            .findByFollowerId(currentUser.getId())
            .stream()
            .filter(f -> "ACCEPTED".equals(f.getStatus()))
            .map(f -> f.getFollowing().getId())
            .collect(Collectors.toList());

    return postRepository.findAllByOrderByCreatedAtDesc()
            .stream()
            .filter(post -> {
                User postOwner = post.getUser();
                boolean isOwn = postOwner.getId()
                        .equals(currentUser.getId());
                boolean isFollowing = followingIds
                        .contains(postOwner.getId());
                boolean isPrivate = Boolean.TRUE
                        .equals(postOwner.getIsPrivate());

                if (isOwn) return true;
                if (isPrivate && !isFollowing) return false;
                if (post.getVisibility().equals("PUBLIC")) return true;
                return isFollowing;
            })
            .map(post -> mapToResponse(post, post.getUser()))
            .collect(Collectors.toList());
}
  
    public List<PostResponse> getUserPosts(String token) {
        User user = getUserFromToken(token);
        return postRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(post -> mapToResponse(post, user))
                .collect(Collectors.toList());
    }

    public long getUserPostCount(String token) {
        User user = getUserFromToken(token);
        return postRepository.countByUserId(user.getId());
    }

    public void deletePost(String token, Long postId) {
        User user = getUserFromToken(token);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Not authorized");
        postImageRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    public PostResponse editPost(String token, Long postId,
        String content, List<Long> removeImageIds,
        List<MultipartFile> newImages,
        List<Long> imageOrderIds) throws IOException {
        User user = getUserFromToken(token);
        Post post = postRepository.findById(postId)
                .orElseThrow(() ->
                        new RuntimeException("Post not found"));
        if (!post.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized");
        }

        if (content != null) post.setContent(content);

        // Remove images
        if (removeImageIds != null && !removeImageIds.isEmpty()) {
            removeImageIds.forEach(imageId ->
                postImageRepository.findById(imageId)
                    .ifPresent(img -> {
                        try {
                            Path filePath = Paths.get(
                                "D:/CodersCollab/backend/" +
                                "coderscollab-backend" +
                                img.getImageUrl());
                            Files.deleteIfExists(filePath);
                        } catch (Exception e) { }
                        postImageRepository.delete(img);
                    })
            );
        }

        // Reorder existing images
        if (imageOrderIds != null && !imageOrderIds.isEmpty()) {
            for (int i = 0; i < imageOrderIds.size(); i++) {
                Long imgId = imageOrderIds.get(i);
                postImageRepository.findById(imgId).ifPresent(img -> {
                    img.setDisplayOrder(
                        imageOrderIds.indexOf(imgId));
                    postImageRepository.save(img);
                });
            }
        }
        
        // Add new images
        if (newImages != null && !newImages.isEmpty()) {
            Path uploadPath = Paths.get(
                "D:/CodersCollab/backend/coderscollab-backend/" +
                "uploads/post-images/");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            int currentMax = postImageRepository
                    .findByPostIdOrderByDisplayOrderAsc(postId)
                    .stream()
                    .mapToInt(PostImage::getDisplayOrder)
                    .max().orElse(-1);

            for (int i = 0; i < newImages.size(); i++) {
                MultipartFile file = newImages.get(i);
                String fileName = UUID.randomUUID() + "_"
                        + file.getOriginalFilename();
                Files.copy(file.getInputStream(),
                        uploadPath.resolve(fileName),
                        StandardCopyOption.REPLACE_EXISTING);

                PostImage image = PostImage.builder()
                        .post(post)
                        .imageUrl("/uploads/post-images/" + fileName)
                        .displayOrder(currentMax + 1 + i)
                        .createdAt(java.time.LocalDateTime.now())
                        .build();
                postImageRepository.save(image);
            }
        }

        postRepository.save(post);
        return mapToResponse(post, user);
    }
    
    public void reorderImage(String token, Long postId,
        Long imageId, String direction) {
        User user = getUserFromToken(token);
        Post post = postRepository.findById(postId)
                .orElseThrow(() ->
                        new RuntimeException("Post not found"));
        if (!post.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized");
        }

        List<PostImage> images = postImageRepository
                .findByPostIdOrderByDisplayOrderAsc(postId);

        int idx = -1;
        for (int i = 0; i < images.size(); i++) {
            if (images.get(i).getId().equals(imageId)) {
                idx = i;
                break;
            }
        }

        if (idx == -1) return;

        int swapIdx = "UP".equals(direction) ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= images.size()) return;

        PostImage a = images.get(idx);
        PostImage b = images.get(swapIdx);
        int tempOrder = a.getDisplayOrder();
        a.setDisplayOrder(b.getDisplayOrder());
        b.setDisplayOrder(tempOrder);

        postImageRepository.save(a);
        postImageRepository.save(b);
    }

    private PostResponse mapToResponse(Post post, User user) {
        UserProfile profile = userProfileRepository
                .findByUserId(user.getId())
                .orElse(new UserProfile());

        List<String> imageUrls = postImageRepository
                .findByPostIdOrderByDisplayOrderAsc(post.getId())
                .stream()
                .map(PostImage::getImageUrl)
                .collect(Collectors.toList());

        List<Long> imageIds = postImageRepository
        .findByPostIdOrderByDisplayOrderAsc(post.getId())
        .stream()
        .map(PostImage::getId)
        .collect(Collectors.toList());
        
        return PostResponse.builder()
                .id(post.getId())
                .content(post.getContent())
                .postType(post.getPostType())
                .language(post.getLanguage())
                .visibility(post.getVisibility())
                .likesCount(post.getLikesCount())
                .createdAt(post.getCreatedAt())
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(profile.getFullName())
                .profilePictureUrl(profile.getProfilePictureUrl())
                .imageUrls(imageUrls)
                .imageIds(imageIds)
                .build();
    }
    
    public List<PostResponse> getPostsByUsername(String token,
        String username) {
    User targetUser = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

    Long currentUserId = null;
    List<Long> followingIds = new java.util.ArrayList<>();

    if (token != null && !token.isEmpty()) {
        try {
            User currentUser = getUserFromToken(token);
            currentUserId = currentUser.getId();
            followingIds = followerRepository
                    .findByFollowerId(currentUserId)
                    .stream()
                    .map(f -> f.getFollowing().getId())
                    .collect(Collectors.toList());
        } catch (Exception e) { }
    }

    final Long finalCurrentUserId = currentUserId;
    final List<Long> finalFollowingIds = followingIds;

    return postRepository
            .findByUserIdOrderByCreatedAtDesc(targetUser.getId())
            .stream()
            .filter(post -> {
                if (post.getVisibility().equals("PUBLIC")) return true;
                if (finalCurrentUserId != null &&
                    post.getUser().getId().equals(finalCurrentUserId))
                    return true;
                return finalFollowingIds.contains(
                    post.getUser().getId());
            })
            .map(post -> mapToResponse(post, post.getUser()))
            .collect(Collectors.toList());
    }
    
    public PostResponse getPostById(String token, Long postId) {
    Post post = postRepository.findById(postId)
            .orElseThrow(() ->
                    new RuntimeException("Post not found"));

    if ("FOLLOWERS".equals(post.getVisibility()) && token != null) {
        try {
            User currentUser = getUserFromToken(token);
            boolean isOwn = post.getUser().getId()
                    .equals(currentUser.getId());
            boolean isFollowing = followerRepository
                    .existsByFollowerIdAndFollowingId(
                            currentUser.getId(),
                            post.getUser().getId());
            if (!isOwn && !isFollowing) {
                throw new RuntimeException("Access denied");
            }
        } catch (RuntimeException e) {
            throw e;
        }
    }

    return mapToResponse(post, post.getUser());
}
}