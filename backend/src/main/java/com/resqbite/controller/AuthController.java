package com.resqbite.controller;

import com.resqbite.dto.AuthResponse;
import com.resqbite.dto.LoginRequest;
import com.resqbite.dto.RegisterRequest;
import com.resqbite.dto.UserDto;
import com.resqbite.dto.RefreshTokenRequest;
import com.resqbite.entity.User;
import com.resqbite.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody com.resqbite.dto.GoogleLoginRequest request) {
        return ResponseEntity.ok(authService.googleLogin(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(UserDto.from(currentUser));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<java.util.Map<String,String>> forgot(@RequestBody com.resqbite.dto.EmailRequest request) {
        authService.forgotPassword(request.email());
        return ResponseEntity.ok(java.util.Map.of("message", "If the account exists, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<java.util.Map<String,String>> reset(@Valid @RequestBody com.resqbite.dto.ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.password());
        return ResponseEntity.ok(java.util.Map.of("message", "Password reset successfully."));
    }
}
