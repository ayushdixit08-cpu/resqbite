package com.resqbite.controller;

import com.resqbite.entity.User;
import com.resqbite.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

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
        long activeVolunteers = userRepository.findAll().stream().filter(u -> u.getRole() == User.UserType.VOLUNTEER).count();
        long activeNgos = userRepository.findAll().stream().filter(u -> u.getRole() == User.UserType.NGO).count();
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
        payload.put("ngos", userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.UserType.NGO)
                .limit(5)
                .toList());
        return ResponseEntity.ok(payload);
    }
}
