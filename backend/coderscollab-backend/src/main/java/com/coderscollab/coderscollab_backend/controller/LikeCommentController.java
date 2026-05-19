/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */


/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.controller;

import com.coderscollab.coderscollab_backend.dto.CommentResponse;
import com.coderscollab.coderscollab_backend.service.LikeCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class LikeCommentController {

    private final LikeCommentService likeCommentService;

    // ── Likes ──────────────────────────────────────────

    @PostMapping("/{postId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @RequestHeader("Authorization") String token,
            @PathVariable Long postId) {
        boolean liked = likeCommentService.toggleLike(token, postId);
        long count = likeCommentService.getLikeCount(postId);
        return ResponseEntity.ok(Map.of(
                "liked", liked,
                "likesCount", count));
    }

    @GetMapping("/{postId}/like/status")
    public ResponseEntity<Map<String, Object>> getLikeStatus(
            @RequestHeader("Authorization") String token,
            @PathVariable Long postId) {
        boolean liked = likeCommentService.isLiked(token, postId);
        long count = likeCommentService.getLikeCount(postId);
        return ResponseEntity.ok(Map.of(
                "liked", liked,
                "likesCount", count));
    }

    // ── Comments ───────────────────────────────────────

    @PostMapping("/{postId}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @RequestHeader("Authorization") String token,
            @PathVariable Long postId,
            @RequestBody Map<String, Object> body) {
        String content = (String) body.get("content");
        Long parentId = body.get("parentId") != null
                ? Long.valueOf(body.get("parentId").toString()) : null;
        return ResponseEntity.ok(likeCommentService.addComment(
                token, postId, content, parentId));
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(
            @RequestHeader(value = "Authorization",
                required = false) String token,
            @PathVariable Long postId) {
        return ResponseEntity.ok(
                likeCommentService.getComments(postId, token));
    }

    @PostMapping("/comments/{commentId}/like")
    public ResponseEntity<Map<String, Object>> toggleCommentLike(
            @RequestHeader("Authorization") String token,
            @PathVariable Long commentId) {
        return ResponseEntity.ok(
                likeCommentService.toggleCommentLike(token, commentId));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @RequestHeader("Authorization") String token,
            @PathVariable Long commentId) {
        likeCommentService.deleteComment(token, commentId);
        return ResponseEntity.ok().build();
    }
}
