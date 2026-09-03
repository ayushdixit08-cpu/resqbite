package com.resqbite.controller;

import com.resqbite.entity.Request;
import com.resqbite.entity.User;
import com.resqbite.repository.RequestRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/volunteer")
public class VolunteerController {
    private final RequestRepository requests;

    public VolunteerController(RequestRepository requests) {
        this.requests = requests;
    }

    @GetMapping("/pickups/available")
    public List<Map<String, Object>> available(@AuthenticationPrincipal User user) {
        requireVolunteer(user);
        return requests.findByTypeAndStatusInOrderByCreatedAtDesc(
                        Request.RequestType.FOOD_DONATION,
                        List.of(Request.RequestStatus.AVAILABLE, Request.RequestStatus.PENDING,
                                Request.RequestStatus.ACCEPTED)).stream()
                .filter(request -> request.getVolunteer() == null)
                .map(this::toTask)
                .toList();
    }

    @GetMapping("/tasks")
    public List<Map<String, Object>> tasks(@AuthenticationPrincipal User user) {
        requireVolunteer(user);
        return requests.findByTypeOrderByCreatedAtDesc(Request.RequestType.FOOD_DONATION).stream()
                .filter(request -> request.getVolunteer() != null
                        && request.getVolunteer().getId().equals(user.getId()))
                .map(this::toTask)
                .toList();
    }

    @PostMapping("/pickups/{id}/accept")
    public ResponseEntity<Map<String, Object>> accept(@PathVariable Long id,
                                                       @AuthenticationPrincipal User user) {
        requireVolunteer(user);
        Request request = donation(id);
        if (request.getStatus() != Request.RequestStatus.AVAILABLE
                && request.getStatus() != Request.RequestStatus.PENDING
                && request.getStatus() != Request.RequestStatus.ACCEPTED) {
            return ResponseEntity.status(409).build();
        }
        request.setVolunteer(user);
        request.setStatus(Request.RequestStatus.ACCEPTED);
        return ResponseEntity.ok(toTask(requests.save(request)));
    }

    @PatchMapping("/tasks/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable Long id,
                                                             @AuthenticationPrincipal User user,
                                                             @RequestBody Map<String, Object> body) {
        requireVolunteer(user);
        Request request = donation(id);
        if (request.getVolunteer() == null || !request.getVolunteer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }
        String rawStatus = String.valueOf(body.getOrDefault("status", ""));
        Request.RequestStatus current = request.getStatus();
        Request.RequestStatus status = switch (rawStatus.toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_')) {
            case "ASSIGNED", "PICKUP_STARTED" -> Request.RequestStatus.PICKUP_SCHEDULED;
            case "PICKED_UP" -> Request.RequestStatus.PICKED_UP;
            case "IN_TRANSIT" -> Request.RequestStatus.IN_TRANSIT;
            case "DELIVERED" -> Request.RequestStatus.DELIVERED;
            case "COMPLETED" -> Request.RequestStatus.COMPLETED;
            default -> throw new IllegalArgumentException("Unsupported task status");
        };
        if (!isValidTransition(current, status)) {
            return ResponseEntity.status(409).build();
        }
        request.setStatus(status);
        return ResponseEntity.ok(toTask(requests.save(request)));
    }

    private boolean isValidTransition(Request.RequestStatus current, Request.RequestStatus next) {
        return switch (current) {
            case ACCEPTED -> next == Request.RequestStatus.PICKUP_SCHEDULED;
            case PICKUP_SCHEDULED -> next == Request.RequestStatus.PICKED_UP;
            case PICKED_UP -> next == Request.RequestStatus.IN_TRANSIT;
            case IN_TRANSIT -> next == Request.RequestStatus.DELIVERED;
            case DELIVERED -> next == Request.RequestStatus.COMPLETED;
            default -> false;
        };
    }

    private Request donation(Long id) {
        Request request = requests.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Donation not found"));
        if (request.getType() != Request.RequestType.FOOD_DONATION) {
            throw new IllegalArgumentException("Request is not a donation");
        }
        return request;
    }

    private void requireVolunteer(User user) {
        if (user == null || user.getRole() != User.UserType.VOLUNTEER) {
            throw new IllegalArgumentException("Only volunteers can manage pickup tasks");
        }
    }

    private Map<String, Object> toTask(Request request) {
        Map<String, Object> task = new LinkedHashMap<>();
        task.put("id", request.getId());
        task.put("food", request.getActivityTitle());
        task.put("quantity", "");
        task.put("status", request.getStatus().name().toLowerCase(Locale.ROOT));
        task.put("pickupTime", request.getCreatedAt());
        task.put("provider", Map.of("name", request.getSender().getName(), "address",
                request.getSender().getLocation() == null ? "" : request.getSender().getLocation()));
        task.put("receivingOrg", Map.of("name", request.getRecipient().getName(), "address",
                request.getRecipient().getLocation() == null ? "" : request.getRecipient().getLocation()));
        return task;
    }
}
