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
import com.coderscollab.coderscollab_backend.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping
    public ResponseEntity<PostResponse> createPost(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody PostRequest request) {
        return ResponseEntity.ok(postService.createPost(token, request));
    }

    @PostMapping("/image")
    public ResponseEntity<PostResponse> createImagePost(
            @RequestHeader("Authorization") String token,
            @RequestParam("content") String content,
            @RequestParam("visibility") String visibility,
            @RequestParam("files") List<MultipartFile> files) throws Exception {
        return ResponseEntity.ok(
                postService.createImagePost(token, content, visibility, files));
    }

    @GetMapping
    public ResponseEntity<List<PostResponse>> getAllPosts(
            @RequestHeader(value = "Authorization",
                required = false) String token) {
        return ResponseEntity.ok(postService.getAllPosts(token));
    }

    @GetMapping("/user")
    public ResponseEntity<List<PostResponse>> getUserPosts(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(postService.getUserPosts(token));
    }

    @GetMapping("/user/count")
    public ResponseEntity<Long> getUserPostCount(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(postService.getUserPostCount(token));
    }
    
    @GetMapping("/user/{username}")
    public ResponseEntity<List<PostResponse>> getPostsByUsername(
        @RequestHeader(value = "Authorization",
            required = false) String token,
        @PathVariable String username) {
    return ResponseEntity.ok(
            postService.getPostsByUsername(token, username));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(
            @RequestHeader("Authorization") String token,
            @PathVariable Long postId) {
        postService.deletePost(token, postId);
        return ResponseEntity.ok().build();
    }

    @PutMapping(value = "/{postId}",
        consumes = {"multipart/form-data", "application/json"})
    public ResponseEntity<PostResponse> editPost(
            @RequestHeader("Authorization") String token,
            @PathVariable Long postId,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) List<Long> removeImageIds,
            @RequestParam(required = false) List<MultipartFile> newImages,
            @RequestParam(required = false) List<Long> imageOrderIds)
                    throws Exception {
                return ResponseEntity.ok(
                        postService.editPost(token, postId, content,
                                removeImageIds, newImages, imageOrderIds));
            }
    
    @PutMapping("/{postId}/images/reorder")
    public ResponseEntity<Void> reorderImage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long postId,
            @RequestBody Map<String, Object> body) {
        Long imageId = Long.valueOf(body.get("imageId").toString());
        String direction = (String) body.get("direction");
        postService.reorderImage(token, postId, imageId, direction);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/{postId}")
    public ResponseEntity<PostResponse> getPostById(
            @RequestHeader(value = "Authorization",
                required = false) String token,
            @PathVariable Long postId) {
        return ResponseEntity.ok(
                postService.getPostById(token, postId));
    }
}