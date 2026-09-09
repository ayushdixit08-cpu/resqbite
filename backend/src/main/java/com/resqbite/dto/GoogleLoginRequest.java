package com.resqbite.dto;
import jakarta.validation.constraints.NotBlank;
public record GoogleLoginRequest(@NotBlank String idToken, String role) {}
