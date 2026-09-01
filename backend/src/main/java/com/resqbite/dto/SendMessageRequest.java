package com.resqbite.dto;

public record SendMessageRequest(Long recipientId, Long connectionId, String content) {}
