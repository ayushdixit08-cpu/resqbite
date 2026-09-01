package com.resqbite.dto;

import com.resqbite.entity.Request;

import java.time.Instant;

public record RequestDto(
        Long id,
        UserDto sender,
        UserDto recipient,
        String type,
        String status,
        String message,
        String activityTitle,
        Instant createdAt,
        Instant updatedAt
) {
    public static RequestDto from(Request request) {
        return new RequestDto(
                request.getId(),
                UserDto.from(request.getSender()),
                UserDto.from(request.getRecipient()),
                request.getType().name(),
                request.getStatus().name(),
                request.getMessage(),
                request.getActivityTitle(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}
