package com.resqbite.dto;

import com.resqbite.entity.User;

public record UserDto(
        Long id,
        String name,
        String email,
        String role,
        String location,
        String bio,
        String skills,
        String interests
) {
    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getLocation(),
                user.getBio(),
                user.getSkills(),
                user.getInterests()
        );
    }
}
