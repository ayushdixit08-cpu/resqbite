package com.resqbite.dto;

import com.resqbite.entity.Connection;

import java.time.Instant;

public record ConnectionDto(
        Long id,
        UserDto userOne,
        UserDto userTwo,
        Long requestId,
        Instant createdAt
) {
    public static ConnectionDto from(Connection connection) {
        return new ConnectionDto(
                connection.getId(),
                UserDto.from(connection.getUserOne()),
                UserDto.from(connection.getUserTwo()),
                connection.getRequest() != null ? connection.getRequest().getId() : null,
                connection.getCreatedAt()
        );
    }
}
