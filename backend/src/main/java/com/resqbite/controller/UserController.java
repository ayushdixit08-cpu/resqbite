package com.resqbite.controller;

import com.resqbite.dto.UserDto;
import com.resqbite.entity.User;
import com.resqbite.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping({"/me", "/profile"})
    public ResponseEntity<UserDto> profile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserDto.from(user));
    }

    @PutMapping({"/me", "/profile"})
    public ResponseEntity<UserDto> update(@AuthenticationPrincipal User user,
                                           @RequestBody Map<String, Object> body) {
        if (body.containsKey("name") && body.get("name") != null) {
            user.setName(body.get("name").toString().trim());
        }
        if (body.containsKey("location")) {
            user.setLocation(value(body.get("location")));
        }
        if (body.containsKey("bio")) {
            user.setBio(value(body.get("bio")));
        }
        return ResponseEntity.ok(UserDto.from(users.save(user)));
    }

    private String value(Object value) {
        return value == null ? null : value.toString();
    }
}
