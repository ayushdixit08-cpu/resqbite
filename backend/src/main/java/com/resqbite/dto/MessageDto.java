package com.resqbite.dto;

import com.resqbite.entity.Message;

import java.time.Instant;

public record MessageDto(
        Long id,
        UserDto sender,
        UserDto recipient,
        Long connectionId,
        String content,
        Instant createdAt
) {
    public static MessageDto from(Message message) {
        return new MessageDto(
                message.getId(),
                UserDto.from(message.getSender()),
                UserDto.from(message.getRecipient()),
                message.getConnection() != null ? message.getConnection().getId() : null,
                message.getContent(),
                message.getCreatedAt()
        );
    }
}
