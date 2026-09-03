package com.resqbite.controller;

import com.resqbite.entity.Request;
import com.resqbite.entity.User;
import com.resqbite.repository.RequestRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final RequestRepository requests;
    public DashboardController(RequestRepository requests) { this.requests = requests; }

    @GetMapping
    public Map<String, Object> dashboard(@AuthenticationPrincipal User user) {
        long total = requests.countBySenderIdAndType(user.getId(), Request.RequestType.FOOD_DONATION);
        long delivered = requests.countBySenderIdAndTypeAndStatus(
                user.getId(), Request.RequestType.FOOD_DONATION, Request.RequestStatus.COMPLETED);
        long active = requests.countBySenderIdAndTypeAndStatusNotIn(
                user.getId(), Request.RequestType.FOOD_DONATION,
                List.of(Request.RequestStatus.COMPLETED, Request.RequestStatus.CANCELLED, Request.RequestStatus.REJECTED));
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("activeDonations", active); stats.put("inTransit", 0);
        stats.put("mealsDonated", total); stats.put("deliveredDonations", delivered);
        stats.put("totalDonations", total);
        stats.put("todayDonations", 0);
        return Map.of("stats", stats, "weeklyMeals", List.of(), "weeklyChange", 0);
    }
}
