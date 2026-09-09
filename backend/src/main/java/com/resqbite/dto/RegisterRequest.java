package com.resqbite.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Size(max = 120)
        String name,
        @NotBlank @Email @Size(max = 254)
        String email,
        @NotBlank @Size(min = 8, max = 128)
        String password,
        @NotBlank
        String role,
        String location,
        String bio,
        String skills,
        String interests
) {}
