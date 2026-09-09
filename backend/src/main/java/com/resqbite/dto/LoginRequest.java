package com.resqbite.dto;

import jakarta.validation.constraints.*;
public record LoginRequest(@NotBlank @Email String email, @NotBlank String password,
                           boolean rememberMe) {
    public LoginRequest(String email, String password) { this(email, password, false); }
}
