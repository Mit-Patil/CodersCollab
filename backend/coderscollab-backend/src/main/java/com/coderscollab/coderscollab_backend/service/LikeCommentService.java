/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */


/**
 *
 * @author Mit
 */
package com.coderscollab.coderscollab_backend.service;

import com.coderscollab.coderscollab_backend.dto.CommentResponse;
import com.coderscollab.coderscollab_backend.entity.*;
import com.coderscollab.coderscollab_backend.repository.*;
import com.coderscollab.coderscollab_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import com.coderscollab.coderscollab_backend.entity.CommentLike;

@Service
@RequiredArgsConstructor
public class LikeCommentService {

    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final JwtUtil jwtUtil;
    private final CommentLikeRepository commentLikeRepository;
    
    private User getUserFromToken(String token) {
        String email = jwtUtil.extractEmail(token.substring(7));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Post getPost(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
    }

    // ── Likes ──────────────────────────────────────────

    public boolean toggleLike(String token, Long postId) {
        User user = getUserFromToken(token);
        Post post = getPost(postId);

        boolean alreadyLiked = likeRepository
                .existsByUserIdAndPostId(user.getId(), postId);

        if (alreadyLiked) {
            likeRepository.deleteByUserIdAndPostId(user.getId(), postId);
            post.setLikesCount(Math.max(0, post.getLikesCount() - 1));
        } else {
            Like like = Like.builder()
                    .user(user)
                    .post(post)
                    .createdAt(LocalDateTime.now())
                    .build();
            likeRepository.save(like);
            post.setLikesCount(post.getLikesCount() + 1);
        }

        postRepository.save(post);
        return !alreadyLiked;
    }

    public boolean isLiked(String token, Long postId) {
        User user = getUserFromToken(token);
        return likeRepository.existsByUserIdAndPostId(user.getId(), postId);
    }

    public long getLikeCount(Long postId) {
        return likeRepository.countByPostId(postId);
    }

    // ── Comments ───────────────────────────────────────

   public CommentResponse addComment(String token, Long postId,
        String content, Long parentId) {
        User user = getUserFromToken(token);
        Post post = getPost(postId);

        Comment parent = null;
        if (parentId != null) {
            parent = commentRepository.findById(parentId)
                    .orElse(null);
        }

        Comment comment = Comment.builder()
                .user(user)
                .post(post)
                .content(content)
                .parent(parent)
                .createdAt(LocalDateTime.now())
                .build();

        commentRepository.save(comment);
        return mapToCommentResponse(comment, user, token);
    }

    public List<CommentResponse> getComments(Long postId, String token) {
        return commentRepository
                .findByPostIdAndParentIsNullOrderByCreatedAtAsc(postId)
                .stream()
                .map(c -> mapToCommentResponse(c, c.getUser(), token))
                .collect(Collectors.toList());
    }
    
    public Map<String, Object> toggleCommentLike(String token,
        Long commentId) {
        User user = getUserFromToken(token);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() ->
                        new RuntimeException("Comment not found"));

        boolean liked = commentLikeRepository
                .existsByUserIdAndCommentId(user.getId(), commentId);

        if (liked) {
            commentLikeRepository.deleteByUserIdAndCommentId(
                    user.getId(), commentId);
        } else {
            CommentLike like = CommentLike.builder()
                    .user(user)
                    .comment(comment)
                    .createdAt(LocalDateTime.now())
                    .build();
            commentLikeRepository.save(like);
        }

        long count = commentLikeRepository.countByCommentId(commentId);
        return Map.of("liked", !liked, "likeCount", count);
    }

    public long getCommentCount(Long postId) {
        return commentRepository.countByPostId(postId);
    }

    public void deleteComment(String token, Long commentId) {
        User user = getUserFromToken(token);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() ->
                        new RuntimeException("Comment not found"));
        if (!comment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized");
        }
        commentRepository.delete(comment);
    }

    private CommentResponse mapToCommentResponse(Comment comment,
        User user, String token) {
        UserProfile profile = userProfileRepository
                .findByUserId(user.getId())
                .orElse(new UserProfile());

        boolean liked = false;
        if (token != null && !token.isEmpty()) {
            try {
                User currentUser = getUserFromToken(token);
                liked = commentLikeRepository
                        .existsByUserIdAndCommentId(
                                currentUser.getId(), comment.getId());
            } catch (Exception e) { }
        }

        long likeCount = commentLikeRepository
                .countByCommentId(comment.getId());

        List<CommentResponse> replies = comment.getReplies() != null
                ? comment.getReplies().stream()
                    .map(r -> mapToCommentResponse(r, r.getUser(), token))
                    .collect(Collectors.toList())
                : new java.util.ArrayList<>();

        return CommentResponse.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(profile.getFullName())
                .profilePictureUrl(profile.getProfilePictureUrl())
                .parentId(comment.getParent() != null
                        ? comment.getParent().getId() : null)
                .liked(liked)
                .likeCount(likeCount)
                .replies(replies)
                .build();
    }
}
