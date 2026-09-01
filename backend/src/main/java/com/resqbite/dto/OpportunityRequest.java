package com.resqbite.dto;

public record OpportunityRequest(
        String title,
        String description,
        String location,
        String requirements
) {}
