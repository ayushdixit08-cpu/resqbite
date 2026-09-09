package com.resqbite.dto;

public record AuthResponse(String token, UserDto user, String refreshToken) {
    public AuthResponse(String token, UserDto user) { this(token, user, null); }
}
