package com.resqbite.controller;

import com.resqbite.entity.Request;
import com.resqbite.entity.User;
import com.resqbite.repository.RequestRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final RequestRepository requests;
    public DashboardController(RequestRepository requests) { this.requests = requests; }

    @GetMapping
    public Map<String, Object> dashboard(@AuthenticationPrincipal User user) {
        List<Request> donations = requests.findBySenderIdAndTypeOrderByCreatedAtDesc(
                user.getId(), Request.RequestType.FOOD_DONATION);
        long delivered = donations.stream().filter(r -> r.getStatus() == Request.RequestStatus.COMPLETED).count();
        long active = donations.stream().filter(r -> r.getStatus() != Request.RequestStatus.COMPLETED
                && r.getStatus() != Request.RequestStatus.CANCELLED
                && r.getStatus() != Request.RequestStatus.REJECTED).count();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("activeDonations", active); stats.put("inTransit", 0);
        stats.put("mealsDonated", donations.size()); stats.put("deliveredDonations", delivered);
        stats.put("totalDonations", donations.size());
        stats.put("todayDonations", donations.stream().filter(r -> r.getCreatedAt().isAfter(Instant.now().minus(1, ChronoUnit.DAYS))).count());
        return Map.of("stats", stats, "weeklyMeals", List.of(), "weeklyChange", 0);
    }
}
