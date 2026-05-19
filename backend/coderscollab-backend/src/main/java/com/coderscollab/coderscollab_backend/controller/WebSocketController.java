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
import com.coderscollab.coderscollab_backend.security.JwtUtil;
import com.coderscollab.coderscollab_backend.repository.UserRepository;
import com.coderscollab.coderscollab_backend.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;


@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final SimpMessagingTemplate msg;
    private final MessagingService messagingService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final GroupService groupService;

    // ── Topic constants ────────────────────────────────────────────────────
    private static String convTopic(Long id)  { return "/topic/conversation/" + id; }
    private static String inboxTopic(Long id) { return "/topic/user/" + id + "/inbox"; }

    private String norm(String token) {
        if (token == null) throw new RuntimeException("Missing token");
        return token.startsWith("Bearer ") ? token : "Bearer " + token;
    }

    private void broadcast(Long convId, MessageResponse payload,
                           Long senderId, Long receiverId) {
        msg.convertAndSend(convTopic(convId), payload);
        if (senderId  != null) msg.convertAndSend(inboxTopic(senderId),   payload);
        if (receiverId!= null) msg.convertAndSend(inboxTopic(receiverId), payload);
    }

    // ── 1-1 Chat ───────────────────────────────────────────────────────────
    
    @MessageMapping("/chat/{conversationId}")
    public void sendMessage(@DestinationVariable Long conversationId,
                            @Payload ChatMessage chatMessage,
                            @Header("token") String token) {
        try {
            String t = norm(token);
            MessageResponse saved = messagingService.sendMessage(
                t, conversationId, chatMessage.getContent(), chatMessage.getReplyToId());
            saved.setEventType("MESSAGE");
            broadcast(conversationId, saved, saved.getSenderId(),
                messagingService.getOtherUserId(t, conversationId));
        } catch (Exception e) {
            System.err.println("[WS] sendMessage: " + e.getMessage()); 
            e.printStackTrace();
        }
    }

    @MessageMapping("/chat/{conversationId}/edit")
    public void editMessage(@DestinationVariable Long conversationId,
                            @Payload ChatMessage chatMessage,
                            @Header("token") String token) {
        try {
            String t = norm(token);
            MessageResponse updated = messagingService.editMessage(
                t, chatMessage.getMessageId(), chatMessage.getContent());
            updated.setEventType("EDIT");
            broadcast(conversationId, updated, updated.getSenderId(),
                messagingService.getOtherUserId(t, conversationId));
        } catch (Exception e) {
            System.err.println("[WS] editMessage: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @MessageMapping("/chat/{conversationId}/delete")
    public void deleteMessage(@DestinationVariable Long conversationId,
                              @Payload ChatMessage chatMessage,
                              @Header("token") String token) {
        try {
            String t = norm(token);
            boolean forAll = Boolean.TRUE.equals(chatMessage.getForEveryone());
            messagingService.deleteMessage(t, chatMessage.getMessageId(), forAll);

            MessageResponse ev = MessageResponse.builder()
                .id(chatMessage.getMessageId())
                .conversationId(conversationId)
                .eventType("DELETE")
                .deletedForEveryone(forAll)
                .build();

            Long senderId = messagingService.getSenderIdOfMessage(chatMessage.getMessageId());
            broadcast(conversationId, ev, senderId,
                messagingService.getOtherUserId(t, conversationId));
        } catch (Exception e) {
            System.err.println("[WS] deleteMessage: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @MessageMapping("/chat/{conversationId}/read")
    public void markAsRead(@DestinationVariable Long conversationId,
                           @Payload ChatMessage chatMessage,
                           @Header("token") String token) {
        try {
            String t = norm(token);
            messagingService.markAsRead(t, conversationId);

            Long messageSenderId = messagingService.getOtherUserId(t, conversationId);

            MessageResponse readEvent = MessageResponse.builder()
                .conversationId(conversationId)
                .eventType("READ")
                .build();

            msg.convertAndSend(convTopic(conversationId), readEvent);
            if (messageSenderId != null) {
                msg.convertAndSend(inboxTopic(messageSenderId), readEvent);
            }
        } catch (Exception e) {
            System.err.println("[WS] markAsRead: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @MessageMapping("/chat/{conversationId}/typing")
    public void typing(@DestinationVariable Long conversationId,
                       @Payload ChatMessage chatMessage) {
        msg.convertAndSend("/topic/conversation/" + conversationId + "/typing", chatMessage);
    }
    
    
    // ── Group Chat ─────────────────────────────────────────────────────────
    
    @MessageMapping("/group/{groupId}")
    public void sendGroupMessage(
            @DestinationVariable Long groupId,
            @Payload ChatMessage chatMessage,
            @Header("token") String token) {
        try {
            System.out.println("[WS] group msg received: groupId=" + groupId 
                + " content=" + chatMessage.getContent() 
                + " replyToId=" + chatMessage.getReplyToId());
            
            String t = norm(token);
            GroupMessageResponse saved = groupService.sendMessage(
                t, groupId,
                chatMessage.getContent(),
                chatMessage.getReplyToId());
            saved.setEventType("MESSAGE");

            System.out.println("[WS] Broadcasting MESSAGE to group " + groupId);
            
            // Broadcast to group topic
            msg.convertAndSend("/topic/group/" + groupId, saved);

            // Notify ALL members' inboxes
            groupService.getMemberIds(groupId).forEach(memberId ->
                msg.convertAndSend(inboxTopic(memberId), saved));

        } catch (Exception e) {
            System.err.println("[WS] group msg ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @MessageMapping("/group/{groupId}/typing")
    public void groupTyping(
            @DestinationVariable Long groupId,
            @Payload ChatMessage chatMessage) {
        msg.convertAndSend("/topic/group/" + groupId + "/typing", chatMessage);
    }
    
    
    // ── Group EDIT ─────────────────────────────────────────────────────────
    @MessageMapping("/group/{groupId}/edit")
    public void editGroupMessage(
            @DestinationVariable Long groupId,
            @Payload ChatMessage chatMessage,
            @Header("token") String token) {
        try {
            System.out.println("[WS] group EDIT received: groupId=" + groupId 
                + " messageId=" + chatMessage.getMessageId() 
                + " content=" + chatMessage.getContent());
            
            String t = norm(token);
            GroupMessageResponse updated = groupService.editMessage(
                t, chatMessage.getMessageId(),
                chatMessage.getContent());
            updated.setEventType("EDIT");

            System.out.println("[WS] Broadcasting EDIT to group " + groupId 
                + " - id=" + updated.getId() 
                + " content=" + updated.getContent());

            // Broadcast to group topic
            msg.convertAndSend("/topic/group/" + groupId, updated);

            // Notify all members' inboxes
            groupService.getMemberIds(groupId).forEach(memberId ->
                msg.convertAndSend(inboxTopic(memberId), updated));

        } catch (Exception e) {
            System.err.println("[WS] group EDIT ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // ── Group DELETE ───────────────────────────────────────────────────────
    @MessageMapping("/group/{groupId}/delete")
    public void deleteGroupMessage(
            @DestinationVariable Long groupId,
            @Payload ChatMessage chatMessage,
            @Header("token") String token) {
        try {
            System.out.println("[WS] group DELETE received: groupId=" + groupId 
                + " messageId=" + chatMessage.getMessageId() 
                + " forEveryone=" + chatMessage.getForEveryone());
            
            String t = norm(token);
            boolean forAll = Boolean.TRUE.equals(chatMessage.getForEveryone());
            groupService.deleteMessage(t, chatMessage.getMessageId(), forAll);

            GroupMessageResponse ev = GroupMessageResponse.builder()
                .id(chatMessage.getMessageId())
                .groupId(groupId)
                .eventType("DELETE")
                .deletedForEveryone(forAll)
                .build();

            System.out.println("[WS] Broadcasting DELETE to group " + groupId);

            // Broadcast to group topic
            msg.convertAndSend("/topic/group/" + groupId, ev);

            // Notify all members' inboxes
            groupService.getMemberIds(groupId).forEach(memberId ->
                msg.convertAndSend(inboxTopic(memberId), ev));

        } catch (Exception e) {
            System.err.println("[WS] group DELETE ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    
    @MessageMapping("/group/{groupId}/broadcast")
    public void broadcastGroupMedia(
            @DestinationVariable Long groupId,
            @Payload GroupMessageResponse mediaMsg,
            @Header("token") String token) {
        try {
            mediaMsg.setEventType("MESSAGE");
            msg.convertAndSend("/topic/group/" + groupId, mediaMsg);
            groupService.getMemberIds(groupId).forEach(memberId ->
                msg.convertAndSend(inboxTopic(memberId), mediaMsg));
        } catch (Exception e) {
            System.err.println("[WS] group broadcast ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    
    
}