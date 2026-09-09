package com.resqbite.dto;
import jakarta.validation.constraints.NotBlank;
public record GoogleLoginRequest(@NotBlank String idToken, String role, boolean rememberMe) {
    public GoogleLoginRequest(String idToken, String role) {
        this(idToken, role, false);
    }
}
