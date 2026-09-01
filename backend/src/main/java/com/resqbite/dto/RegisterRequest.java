package com.resqbite.dto;

public record RegisterRequest(
        String name,
        String email,
        String password,
        String role,
        String location,
        String bio,
        String skills,
        String interests
) {}
