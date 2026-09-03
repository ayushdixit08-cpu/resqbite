package com.resqbite.controller;

import com.resqbite.entity.User;
import com.resqbite.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api")
public class AnalyticsController {

    private final UserRepository userRepository;

    public AnalyticsController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/analytics/overview")
    public ResponseEntity<Map<String, Object>> overview() {
        Map<String, Object> payload = new HashMap<>();
        long activeVolunteers = userRepository.countByRole(User.UserType.VOLUNTEER);
        long activeNgos = userRepository.countByRole(User.UserType.ORGANIZATION);
        payload.put("totalVolunteers", activeVolunteers);
        payload.put("totalNgos", activeNgos);
        payload.put("activeConnections", 0);
        payload.put("pendingRequests", 0);
        payload.put("totalDonations", 0);
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/analytics/top-ngos")
    public ResponseEntity<Map<String, Object>> topNgos() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("ngos", userRepository.findTop5ByRoleOrderByIdAsc(User.UserType.ORGANIZATION));
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/analytics/weekly")
    public ResponseEntity<Map<String, Object>> weekly() {
        return ResponseEntity.ok(Map.of("weekly", List.of()));
    }

    @GetMapping("/analytics/food-mix")
    public ResponseEntity<Map<String, Object>> foodMix() {
        return ResponseEntity.ok(Map.of("foodMix", List.of()));
    }

    @GetMapping("/analytics/status-breakdown")
    public ResponseEntity<Map<String, Object>> statusBreakdown() {
        return ResponseEntity.ok(Map.of("statusBreakdown", List.of()));
    }
}
