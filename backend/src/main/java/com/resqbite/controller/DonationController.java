package com.resqbite.controller;

import com.resqbite.entity.Request;
import com.resqbite.entity.User;
import com.resqbite.repository.RequestRepository;
import com.resqbite.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class DonationController {
    private final RequestRepository requests;
    private final UserRepository users;

    public DonationController(RequestRepository requests, UserRepository users) {
        this.requests = requests;
        this.users = users;
    }

    @GetMapping("/donations")
    public List<Map<String, Object>> list(@AuthenticationPrincipal User user) {
        return requests.findBySenderIdAndTypeOrderByCreatedAtDesc(user.getId(), Request.RequestType.FOOD_DONATION)
                .stream().map(this::toDonation).toList();
    }

    @PostMapping("/donations")
    public ResponseEntity<Map<String, Object>> create(@AuthenticationPrincipal User user,
                                                       @RequestBody Map<String, Object> body) {
        User recipient = users.findAll().stream()
                .filter(u -> u.getRole() == User.UserType.ORGANIZATION).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No recipient organization is available"));
        String title = stringValue(body, "title", "food", "activityTitle");
        String message = stringValue(body, "message", "description");
        Request donation = new Request(user, recipient, Request.RequestType.FOOD_DONATION,
                message == null ? title : message, title);
        return ResponseEntity.ok(toDonation(requests.save(donation)));
    }

    @GetMapping("/donations/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id,
                                                    @AuthenticationPrincipal User user) {
        Request donation = donation(id);
        if (!donation.getSender().getId().equals(user.getId())
                && !donation.getRecipient().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("donation", toDonation(donation));
        response.put("timeline", List.of(Map.of("status", donation.getStatus().name().toLowerCase(Locale.ROOT),
                "created_at", donation.getCreatedAt(), "note", "Donation request created")));
        return ResponseEntity.ok(response);
    }

    private Request donation(Long id) {
        Request request = requests.findById(id).orElseThrow(() -> new IllegalArgumentException("Donation not found"));
        if (request.getType() != Request.RequestType.FOOD_DONATION) {
            throw new IllegalArgumentException("Request is not a donation");
        }
        return request;
    }

    private Map<String, Object> toDonation(Request request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", request.getId());
        data.put("food", request.getActivityTitle());
        data.put("title", request.getActivityTitle());
        data.put("description", request.getMessage());
        data.put("status", request.getStatus().name().toLowerCase(Locale.ROOT));
        data.put("created_at", request.getCreatedAt());
        data.put("donor", request.getSender().getName());
        data.put("organization", request.getRecipient().getName());
        return data;
    }

    private String stringValue(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object value = body.get(key);
            if (value != null && !value.toString().isBlank()) return value.toString();
        }
        throw new IllegalArgumentException("Donation title is required");
    }
}
