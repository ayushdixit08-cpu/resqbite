package com.resqbite.controller;

import com.resqbite.dto.*;
import com.resqbite.entity.User;
import com.resqbite.service.ConnectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ConnectionController {

    private final ConnectionService connectionService;

    public ConnectionController(ConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    @PostMapping("/api/requests")
    public ResponseEntity<RequestDto> createRequest(@AuthenticationPrincipal User currentUser,
                                                  @RequestBody CreateRequestRequest request) {
        return ResponseEntity.ok(connectionService.createRequest(currentUser.getId(), request));
    }

    @GetMapping("/api/requests")
    public ResponseEntity<List<RequestDto>> listRequests(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(connectionService.listRequestsForUser(currentUser.getId()));
    }

    @GetMapping("/api/requests/incoming")
    public ResponseEntity<List<RequestDto>> listIncomingRequests(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(connectionService.listIncomingRequests(currentUser.getId()));
    }

    @PatchMapping("/api/requests/{id}/status")
    public ResponseEntity<RequestDto> updateStatus(@AuthenticationPrincipal User currentUser,
                                                 @PathVariable Long id,
                                                 @RequestBody RequestDecisionRequest request) {
        return ResponseEntity.ok(connectionService.updateRequestStatus(id, currentUser.getId(), request.status()));
    }

    @PostMapping("/api/follows")
    public ResponseEntity<?> toggleFollow(@AuthenticationPrincipal User currentUser,
                                         @RequestBody FollowRequest request) {
        FollowDto result = connectionService.toggleFollow(currentUser.getId(), request.targetUserId());
        return result == null ? ResponseEntity.ok("unfollowed") : ResponseEntity.ok(result);
    }

    @GetMapping("/api/follows")
    public ResponseEntity<List<FollowDto>> getFollowing(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(connectionService.getFollowing(currentUser.getId()));
    }

    @GetMapping("/api/followers")
    public ResponseEntity<List<FollowDto>> getFollowers(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(connectionService.getFollowers(currentUser.getId()));
    }

    @GetMapping("/api/connections")
    public ResponseEntity<List<ConnectionDto>> getConnections(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(connectionService.getConnections(currentUser.getId()));
    }

    @PostMapping("/api/messages")
    public ResponseEntity<MessageDto> sendMessage(@AuthenticationPrincipal User currentUser,
                                                 @RequestBody SendMessageRequest request) {
        return ResponseEntity.ok(connectionService.sendMessage(currentUser.getId(), request));
    }

    @GetMapping("/api/messages/{otherUserId}")
    public ResponseEntity<List<MessageDto>> getMessages(@AuthenticationPrincipal User currentUser,
                                                       @PathVariable Long otherUserId) {
        return ResponseEntity.ok(connectionService.getMessages(currentUser.getId(), otherUserId));
    }

    @GetMapping("/api/messages/connection/{connectionId}")
    public ResponseEntity<List<MessageDto>> getMessagesForConnection(@PathVariable Long connectionId) {
        return ResponseEntity.ok(connectionService.getMessagesForConnection(connectionId));
    }

    @PostMapping("/api/opportunities")
    public ResponseEntity<OpportunityDto> createOpportunity(@AuthenticationPrincipal User currentUser,
                                                          @RequestBody OpportunityRequest request) {
        return ResponseEntity.ok(connectionService.createOpportunity(currentUser.getId(), request));
    }

    @GetMapping("/api/opportunities")
    public ResponseEntity<List<OpportunityDto>> getAllOpportunities() {
        return ResponseEntity.ok(connectionService.getAllOpportunities());
    }
}
