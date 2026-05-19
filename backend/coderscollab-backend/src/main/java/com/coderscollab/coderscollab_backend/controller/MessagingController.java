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
import com.coderscollab.coderscollab_backend.service.MessagingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class MessagingController {

    private final MessagingService messagingService;
    private final SimpMessagingTemplate ws;

    // ── Topic helpers — MUST match useWebSocket.js exactly ────────────────
    private static String convTopic(Long id)  { return "/topic/conversation/" + id; }
    private static String inboxTopic(Long id) { return "/topic/user/" + id + "/inbox"; }

    // ── Conversations ──────────────────────────────────────────────────────
    @PostMapping("/conversation/{userId}")
    public ResponseEntity<ConversationResponse> getOrCreateConversation(
            @RequestHeader("Authorization") String token, @PathVariable Long userId) {
        return ResponseEntity.ok(messagingService.getOrCreateConversation(token, userId));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationResponse>> getAllConversations(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(messagingService.getAllConversations(token));
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<List<MessageResponse>> getMessages(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId) {
        return ResponseEntity.ok(messagingService.getMessages(token, conversationId));
    }

    // ── Send text (REST fallback when WS not ready) ────────────────────────
    @PostMapping("/{conversationId}")
    public ResponseEntity<MessageResponse> sendMessage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId,
            @RequestBody Map<String, Object> body) {
        String content  = (String) body.get("content");
        Long replyToId  = body.get("replyToId") != null
            ? Long.valueOf(body.get("replyToId").toString()) : null;
        MessageResponse m = messagingService.sendMessage(token, conversationId, content, replyToId);
        broadcastNew(token, conversationId, m);
        return ResponseEntity.ok(m);
    }

    // ── Send media ─────────────────────────────────────────────────────────
    @PostMapping("/{conversationId}/media")
    public ResponseEntity<MessageResponse> sendMedia(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long replyToId) throws Exception {
        MessageResponse m = messagingService.sendMedia(token, conversationId, file, replyToId);
        broadcastNew(token, conversationId, m);
        return ResponseEntity.ok(m);
    }

    // ── Share post ─────────────────────────────────────────────────────────
    @PostMapping("/{conversationId}/share/{postId}")
    public ResponseEntity<MessageResponse> sendSharedPost(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId,
            @PathVariable Long postId) {
        MessageResponse m = messagingService.sendSharedPost(token, conversationId, postId);
        broadcastNew(token, conversationId, m);
        return ResponseEntity.ok(m);
    }

    // ── Forward ────────────────────────────────────────────────────────────
    @PostMapping("/{messageId}/forward/{conversationId}")
    public ResponseEntity<MessageResponse> forwardMessage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long messageId,
            @PathVariable Long conversationId) {
        MessageResponse m = messagingService.forwardMessage(token, messageId, conversationId);
        broadcastNew(token, conversationId, m);
        return ResponseEntity.ok(m);
    }

    // ── Edit ───────────────────────────────────────────────────────────────
    @PutMapping("/{messageId}/edit")
    public ResponseEntity<MessageResponse> editMessage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long messageId,
            @RequestBody Map<String, String> body) {
        MessageResponse m = messagingService.editMessage(token, messageId, body.get("content"));
        m.setEventType("EDIT");
        broadcastBoth(token, m.getConversationId(), m);
        return ResponseEntity.ok(m);
    }

    // ── Delete ─────────────────────────────────────────────────────────────
    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long messageId,
            @RequestParam(defaultValue = "false") boolean forEveryone) {
        Long convId = messagingService.getConversationIdOfMessage(messageId);
        messagingService.deleteMessage(token, messageId, forEveryone);
        if (convId != null) {
            MessageResponse ev = MessageResponse.builder()
                .id(messageId).conversationId(convId)
                .eventType("DELETE").deletedForEveryone(forEveryone).build();
            broadcastBoth(token, convId, ev);
        }
        return ResponseEntity.ok().build();
    }

    /**
     * Mark as read — REST version.
     *
     * After marking in DB, we send a READ event to the OTHER user (message sender)
     * so their ✓✓ ticks update instantly without them needing to switch chats.
     *
     * Routes:
     *   /topic/conversation/{id}   — if sender has this conv open
     *   /topic/user/{id}/inbox     — regardless of which conv sender is in
     */
    @PutMapping("/{conversationId}/read")
    public ResponseEntity<Void> markAsRead(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId) {
        messagingService.markAsRead(token, conversationId);

        // The "other user" = the person whose messages we just read = sender
        Long messageSenderId = messagingService
            .getOtherUserId(token, conversationId);

        if (messageSenderId != null) {
            MessageResponse readEv = MessageResponse.builder()
                .conversationId(conversationId)
                .eventType("READ")
                .build();
            // Notify conv window (if sender has THIS conv open)
            ws.convertAndSend(convTopic(conversationId), readEv);
            // Notify sender inbox (regardless of which conv they have open)
            // This is the fix for read status not updating when sender is
            // in a different conversation
            ws.convertAndSend(inboxTopic(messageSenderId), readEv);
        }
        return ResponseEntity.ok().build();
    }

    // ── Broadcast helpers ──────────────────────────────────────────────────

    /** New message → conv window + both inboxes */
    private void broadcastNew(String token, Long convId, MessageResponse m) {
        m.setEventType("MESSAGE");
        ws.convertAndSend(convTopic(convId), m);
        if (m.getSenderId() != null) {
            ws.convertAndSend(inboxTopic(m.getSenderId()), m);
        }
        Long receiverId = messagingService.getOtherUserId(token, convId);
        if (receiverId != null) {
            ws.convertAndSend(inboxTopic(receiverId), m);
        }
    }

    /** Edit/Delete event → conv window + receiver inbox */
    private void broadcastBoth(String token, Long convId, MessageResponse ev) {
        ws.convertAndSend(convTopic(convId), ev);
        Long otherId = messagingService.getOtherUserId(token, convId);
        if (otherId != null) {
            ws.convertAndSend(inboxTopic(otherId), ev);
        }
    }
}