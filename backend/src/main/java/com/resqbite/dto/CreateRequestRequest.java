package com.resqbite.dto;

public record CreateRequestRequest(
        Long recipientId,
        String type,
        String message,
        String activityTitle
) {}
